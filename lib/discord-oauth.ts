import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getDiscordConfig, type DiscordOAuthMode } from '@/lib/discord-config'

const DISCORD_API = 'https://discord.com/api/v10'
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

export type DiscordOAuthState = {
  mode: DiscordOAuthMode
  nonce: string
  issuedAt: number
}

export type DiscordUserProfile = {
  id: string
  username: string
  globalName: string
  avatarUrl: string | null
  email: string | null
}

function getOAuthStateSecret(): string {
  return String(process.env.DISCORD_OAUTH_STATE_SECRET || process.env.DISCORD_CLIENT_SECRET || 'eyzencore-dev-state').trim()
}

export function createDiscordOAuthState(mode: DiscordOAuthMode): string {
  const payload: DiscordOAuthState = {
    mode,
    nonce: randomBytes(16).toString('hex'),
    issuedAt: Date.now(),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getOAuthStateSecret()).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

export function parseDiscordOAuthState(value: string | null | undefined): DiscordOAuthState | null {
  const raw = String(value || '').trim()
  if (!raw.includes('.')) {
    return null
  }
  const [encoded, signature] = raw.split('.')
  if (!encoded || !signature) {
    return null
  }
  const expected = createHmac('sha256', getOAuthStateSecret()).update(encoded).digest('base64url')
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as DiscordOAuthState
    if (!payload?.nonce || !payload?.issuedAt || (payload.mode !== 'login' && payload.mode !== 'link')) {
      return null
    }
    if (Date.now() - payload.issuedAt > OAUTH_STATE_TTL_MS) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function buildDiscordAuthorizeUrl(mode: DiscordOAuthMode): string {
  const { clientId, redirectUri } = getDiscordConfig()
  if (!clientId) {
    throw new Error('Discord OAuth не налаштовано')
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email guilds',
    state: createDiscordOAuthState(mode),
    prompt: 'consent',
  })
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`
}

export async function exchangeDiscordCode(code: string): Promise<string> {
  const { clientId, clientSecret, redirectUri } = getDiscordConfig()
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error('Не вдалося обміняти код Discord')
  }
  const payload = (await response.json()) as { access_token?: string }
  if (!payload.access_token) {
    throw new Error('Discord не повернув access token')
  }
  return payload.access_token
}

export async function fetchDiscordUserProfile(accessToken: string): Promise<DiscordUserProfile> {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error('Не вдалося отримати профіль Discord')
  }
  const payload = (await response.json()) as {
    id?: string
    username?: string
    global_name?: string | null
    avatar?: string | null
    email?: string | null
  }
  const userId = String(payload.id || '').trim()
  if (!userId) {
    throw new Error('Некоректний профіль Discord')
  }
  const avatarUrl = payload.avatar
    ? `https://cdn.discordapp.com/avatars/${userId}/${payload.avatar}.png?size=128`
    : null
  return {
    id: userId,
    username: String(payload.username || '').trim(),
    globalName: String(payload.global_name || payload.username || '').trim(),
    avatarUrl,
    email: payload.email ? String(payload.email).trim().toLowerCase() : null,
  }
}
