import { NextRequest, NextResponse } from 'next/server'
import { getServerById, getServerEngagementSummary, countServerActivityInDays } from '@/lib/auth-db'
import { buildServerDashboardSlug } from '@/lib/server-slug'

type Params = { params: { id: string } }

function buildScore(votes: number, events: number, rating: number, verified: boolean): number {
  const bonus = verified ? 8 : 0
  const ratingBonus = Math.max(0, rating * 4)
  return Number((votes * 1.2 + events * 0.35 + bonus + ratingBonus).toFixed(4))
}

export function GET(_request: NextRequest, { params }: Params): NextResponse {
  const serverId = Number(params.id)
  if (isNaN(serverId)) {
    return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  }
  const server = getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }

  const engagement = getServerEngagementSummary(server.seed)
  const activity = countServerActivityInDays({ serverId: server.seed, days: 30 })
  const eventsMonthly = activity.views + activity.votes + activity.reviews
  const score = buildScore(activity.votes, eventsMonthly, engagement.averageRating, server.verified)

  return NextResponse.json({
    id: String(server.seed),
    name: server.name,
    slug: buildServerDashboardSlug(server.name),
    addr: server.addr,
    game_edition: server.core ?? 'java',
    regions: [server.country?.toLowerCase() || 'global'],
    is_verified: server.verified,
    last_online_players: server.players,
    last_max_players: server.max,
    last_version: server.ver,
    online_state: server.on ? 'live' : 'offline',
    trust_state: server.verified ? 'verified' : 'unverified',
    mode: server.mode,
    votes_monthly: activity.votes,
    score,
    tags: server.tags ?? [],
    website: server.website ?? null,
    discord: server.discord ?? null,
    telegram: server.telegram ?? null,
    created_at: server.createdAt ?? null,
  })
}
