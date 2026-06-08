import {
  countServerActivityInDays,
  getServerById,
  getServerEngagementSummary,
  listServerActivityEvents,
  listServers,
} from '@/lib/auth-db'
import { buildServerDashboardSlug } from '@/lib/server-slug'
import type { Server } from '@/lib/types'

type IntegrationState = 'healthy' | 'warning'

export type IntegrationServerResponse = {
  id: string
  name: string
  slug: string
  ip_or_domain: string
  game_edition: 'java' | 'bedrock' | 'java_bedrock' | 'discord'
  status: 'active' | 'inactive'
  regions: string[]
  is_verified: boolean
  online_state: 'live' | 'offline'
  trust_state: 'verified' | 'unverified'
  last_online_players: number
  last_max_players: number
  last_version: string
  score: number
  votes_monthly: number
  events_monthly: number
  integrations: {
    discord: {
      enabled: boolean
      webhook_url: string | null
    }
    telegram: {
      enabled: boolean
      bot_username: string | null
    }
    plugin: {
      enabled: boolean
      endpoint: string
      api_version: string
    }
    webhook: {
      enabled: boolean
      endpoint: string
      signature_type: 'hmac_sha256'
      retries: number
    }
  }
  rate_limit: {
    requests_per_minute: number
    requests_today: number
    reset_at: string
  }
  health_state: IntegrationState
  created_at: string
}

type IntegrationEvent = {
  id: string
  type: string
  created_at: string
  payload: Record<string, string | number>
}

type IntegrationEventsResponse = {
  server_id: string
  total: number
  events: IntegrationEvent[]
}

type IntegrationTestResponse = {
  success: boolean
  channel: 'discord' | 'telegram' | 'plugin' | 'webhook'
  server_id: string
  message: string
  sample_event: {
    type: string
    sent_at: string
  }
}

function resolveServerByIdentifier(identifier: string): Server | null {
  const trimmedIdentifier = String(identifier || '').trim()
  if (!trimmedIdentifier) {
    return null
  }
  const numericIdentifier = Number(trimmedIdentifier)
  if (Number.isFinite(numericIdentifier)) {
    return getServerById(numericIdentifier)
  }
  const allServers = listServers()
  const normalizedIdentifier = trimmedIdentifier.toLowerCase()
  return allServers.find((server) => {
    const slug = buildServerDashboardSlug(server.name)
    return (
      server.addr.toLowerCase() === normalizedIdentifier ||
      slug === normalizedIdentifier ||
      String(server.seed) === trimmedIdentifier
    )
  }) || null
}

function buildServerScore(input: { monthlyVotes: number; monthlyEvents: number; averageRating: number; isVerified: boolean }): number {
  const verifiedBonus = input.isVerified ? 8 : 0
  const ratingBonus = Math.max(0, Number(input.averageRating || 0) * 4)
  return Number((input.monthlyVotes * 1.2 + input.monthlyEvents * 0.35 + verifiedBonus + ratingBonus).toFixed(4))
}

function resolveRegion(server: Server): string[] {
  if (!server.country) {
    return ['global']
  }
  const region = String(server.country || '').trim().toLowerCase()
  if (!region) {
    return ['global']
  }
  return [region]
}

function getMidnightResetIso(): string {
  const date = new Date()
  date.setUTCHours(24, 0, 0, 0)
  return date.toISOString()
}

export function getIntegrationServerResponse(serverIdentifier: string): IntegrationServerResponse | null {
  const server = resolveServerByIdentifier(serverIdentifier)
  if (!server) {
    return null
  }
  const engagement = getServerEngagementSummary(server.seed)
  const monthActivity = countServerActivityInDays({ serverId: server.seed, days: 30 })
  const monthlyEvents = monthActivity.views + monthActivity.votes + monthActivity.reviews
  const score = buildServerScore({
    monthlyVotes: monthActivity.votes,
    monthlyEvents,
    averageRating: engagement.averageRating,
    isVerified: server.verified,
  })
  const hasDiscord = Boolean(server.discord)
  const hasTelegram = Boolean(server.telegram)
  const hasPlugin = Boolean(server.launcherUrl)
  const onlineState = server.on ? 'live' : 'offline'
  const healthState: IntegrationState = monthActivity.votes > 0 || monthActivity.views > 0 ? 'healthy' : 'warning'
  return {
    id: String(server.seed),
    name: server.name,
    slug: buildServerDashboardSlug(server.name),
    ip_or_domain: server.addr,
    game_edition: server.core || 'java',
    status: server.on ? 'active' : 'inactive',
    regions: resolveRegion(server),
    is_verified: Boolean(server.verified),
    online_state: onlineState,
    trust_state: server.verified ? 'verified' : 'unverified',
    last_online_players: Number(server.players || 0),
    last_max_players: Number(server.max || 0),
    last_version: String(server.ver || 'unknown'),
    score,
    votes_monthly: Number(monthActivity.votes || 0),
    events_monthly: Number(monthlyEvents || 0),
    integrations: {
      discord: {
        enabled: hasDiscord,
        webhook_url: hasDiscord ? server.discord || null : null,
      },
      telegram: {
        enabled: hasTelegram,
        bot_username: hasTelegram ? String(server.telegram || '').replace(/^https?:\/\/t\.me\//, '') : null,
      },
      plugin: {
        enabled: hasPlugin,
        endpoint: `/api/v1/integrations/servers/${server.seed}`,
        api_version: 'v1',
      },
      webhook: {
        enabled: true,
        endpoint: `/api/v1/integrations/servers/${server.seed}/events`,
        signature_type: 'hmac_sha256',
        retries: 3,
      },
    },
    rate_limit: {
      requests_per_minute: 120,
      requests_today: Math.max(0, Math.round(monthlyEvents / 30)),
      reset_at: getMidnightResetIso(),
    },
    health_state: healthState,
    created_at: server.createdAt || new Date().toISOString(),
  }
}

export function getIntegrationEventsResponse(input: { serverIdentifier: string; limit?: number }): IntegrationEventsResponse | null {
  const server = resolveServerByIdentifier(input.serverIdentifier)
  if (!server) {
    return null
  }
  const limit = Math.max(1, Math.min(Number(input.limit || 20), 100))
  const events = listServerActivityEvents({
    serverId: server.seed,
    limit,
  }).map((event) => ({
    id: event.id,
    type: event.type,
    created_at: event.createdAt,
    payload: event.payload,
  }))
  return {
    server_id: String(server.seed),
    total: events.length,
    events,
  }
}

export function getIntegrationTestResponse(input: { serverIdentifier: string; channel: string }): IntegrationTestResponse | null {
  const server = resolveServerByIdentifier(input.serverIdentifier)
  if (!server) {
    return null
  }
  const requestedChannel = String(input.channel || 'webhook').toLowerCase()
  const channel: IntegrationTestResponse['channel'] =
    requestedChannel === 'discord' || requestedChannel === 'telegram' || requestedChannel === 'plugin'
      ? requestedChannel
      : 'webhook'
  return {
    success: true,
    channel,
    server_id: String(server.seed),
    message: `Test event queued for ${channel}`,
    sample_event: {
      type: 'integration.test',
      sent_at: new Date().toISOString(),
    },
  }
}
