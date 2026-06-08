import { getDiscordConfig } from '@/lib/discord-config'

export type ServerPlatform = 'minecraft' | 'discord'

const DISCORD_API = 'https://discord.com/api/v10'

export type DiscordProbeResult = {
  online: boolean
  players: number
  max: number
  version: string
  name: string
  motd: string
  country: string
  ip: string
  inviteCode: string
  guildId: string | null
  iconUrl: string | null
  inviteUrl: string
}

const DISCORD_USER_AGENT = 'Eyzencore/2.0 (https://eyzencore.com)'

const emptyDiscordProbe = (inviteCode = ''): DiscordProbeResult => ({
  online: false,
  players: 0,
  max: 0,
  version: 'Discord',
  name: '',
  motd: '',
  country: '',
  ip: '',
  inviteCode,
  guildId: null,
  iconUrl: null,
  inviteUrl: inviteCode ? `https://discord.gg/${inviteCode}` : '',
})

/**
 * Extracts a Discord invite code from a raw code or invite URL.
 */
export function parseDiscordInviteCode(input: string): string | null {
  const trimmed = String(input || '').trim()
  if (!trimmed) {
    return null
  }
  if (/^[a-zA-Z0-9-]+$/.test(trimmed) && !trimmed.includes('.')) {
    return trimmed
  }
  const patterns = [
    /discord\.gg\/([a-zA-Z0-9-]+)/i,
    /discord\.com\/invite\/([a-zA-Z0-9-]+)/i,
    /discordapp\.com\/invite\/([a-zA-Z0-9-]+)/i,
  ]
  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }
  return null
}

export function isDiscordInviteAddress(input: string): boolean {
  return parseDiscordInviteCode(input) !== null
}

export function normalizeDiscordAddress(input: string): string {
  const code = parseDiscordInviteCode(input)
  if (!code) {
    throw new Error('Некоректне посилання на Discord-сервер')
  }
  return `discord.gg/${code.toLowerCase()}`
}

export function normalizeServerAddress(addr: string, platform: ServerPlatform): string {
  if (platform === 'discord') {
    return normalizeDiscordAddress(addr)
  }
  return String(addr || '').trim().toLowerCase()
}

export function buildDiscordInviteUrl(addr: string): string {
  const code = parseDiscordInviteCode(addr) || String(addr || '').replace(/^discord\.gg\//i, '')
  return `https://discord.gg/${code}`
}

export function buildGuildIconUrl(guildId: string, iconHash: string | null | undefined): string | null {
  if (!guildId || !iconHash) {
    return null
  }
  const extension = iconHash.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${extension}?size=256`
}

/**
 * Fetches guild stats via bot token (accurate when bot is on the server).
 */
export async function probeDiscordGuildWithBot(guildId: string): Promise<DiscordProbeResult | null> {
  const normalizedGuildId = String(guildId || '').trim()
  const { botToken } = getDiscordConfig()
  if (!normalizedGuildId || !botToken) {
    return null
  }
  try {
    const response = await fetch(`${DISCORD_API}/guilds/${encodeURIComponent(normalizedGuildId)}?with_counts=true`, {
      headers: { Authorization: `Bot ${botToken}`, 'User-Agent': DISCORD_USER_AGENT },
      cache: 'no-store',
    })
    if (!response.ok) {
      return null
    }
    const payload = (await response.json()) as {
      id?: string
      name?: string
      description?: string | null
      icon?: string | null
      approximate_member_count?: number
      approximate_presence_count?: number
    }
    const iconUrl = buildGuildIconUrl(String(payload.id || normalizedGuildId), payload.icon)
    return {
      online: true,
      players: Number(payload.approximate_presence_count || 0),
      max: Number(payload.approximate_member_count || 0),
      version: 'Discord',
      name: String(payload.name || '').trim(),
      motd: String(payload.description || '').trim().slice(0, 180),
      country: '',
      ip: '',
      inviteCode: '',
      guildId: String(payload.id || normalizedGuildId),
      iconUrl,
      inviteUrl: '',
    }
  } catch {
    return null
  }
}

/**
 * Fetches member and online counts for a Discord guild via the public invite API.
 */
export async function probeDiscordInvite(input: string, guildId?: string | null): Promise<DiscordProbeResult> {
  const botProbe = guildId ? await probeDiscordGuildWithBot(guildId) : null
  if (botProbe) {
    return botProbe
  }
  const inviteCode = parseDiscordInviteCode(input)
  if (!inviteCode) {
    return emptyDiscordProbe()
  }
  try {
    const response = await fetch(
      `https://discord.com/api/v10/invites/${encodeURIComponent(inviteCode)}?with_counts=true`,
      {
        headers: { 'User-Agent': DISCORD_USER_AGENT },
        cache: 'no-store',
      }
    )
    if (!response.ok) {
      return emptyDiscordProbe(inviteCode)
    }
    const payload = (await response.json()) as {
      code?: string
      guild?: {
        id?: string
        name?: string
        description?: string | null
        icon?: string | null
      }
      approximate_member_count?: number
      approximate_presence_count?: number
    }
    const guild = payload.guild
    const guildId = guild?.id ? String(guild.id) : null
    const iconUrl = buildGuildIconUrl(guildId || '', guild?.icon)
    const description = String(guild?.description || '').trim().slice(0, 180)
    return {
      online: Boolean(guild?.id),
      players: Number(payload.approximate_presence_count || 0),
      max: Number(payload.approximate_member_count || 0),
      version: 'Discord',
      name: String(guild?.name || '').trim(),
      motd: description,
      country: '',
      ip: '',
      inviteCode: String(payload.code || inviteCode).toLowerCase(),
      guildId,
      iconUrl,
      inviteUrl: `https://discord.gg/${String(payload.code || inviteCode)}`,
    }
  } catch {
    return emptyDiscordProbe(inviteCode)
  }
}
