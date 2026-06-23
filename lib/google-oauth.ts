import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getGoogleConfig, type GoogleOAuthMode } from '@/lib/google-config'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_PROFILE_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

export type GoogleOAuthState = {
  mode: GoogleOAuthMode
  nonce: string
  issuedAt: number
}

export type GoogleUserProfile = {
  id: string
  email: string
  emailVerified: boolean
  name: string
  avatarUrl: string | null
}

function getOAuthStateSecret(): string {
  return String(process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_SECRET || process.env.GOOGLE_CLIENT_SECRET || 'eyzencore-google-dev-state').trim()
}

export function createGoogleOAuthState(mode: GoogleOAuthMode): string {
  const payload: GoogleOAuthState = {
    mode,
    nonce: randomBytes(16).toString('hex'),
    issuedAt: Date.now(),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getOAuthStateSecret()).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

export function parseGoogleOAuthState(value: string | null | undefined): GoogleOAuthState | null {
  const raw = String(value || '').trim()
  if (!raw.includes('.')) return null

  const [encoded, signature] = raw.split('.')
  if (!encoded || !signature) return null

  const expected = createHmac('sha256', getOAuthStateSecret()).update(encoded).digest('base64url')
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as GoogleOAuthState
    if (!payload?.nonce || !payload?.issuedAt || (payload.mode !== 'login' && payload.mode !== 'link')) return null
    if (Date.now() - payload.issuedAt > OAUTH_STATE_TTL_MS) return null
    return payload
  } catch {
    return null
  }
}

export function buildGoogleAuthorizeUrl(mode: GoogleOAuthMode): string {
  const { clientId, redirectUri } = getGoogleConfig()
  if (!clientId) throw new Error('Google OAuth не налаштовано')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: createGoogleOAuthState(mode),
    access_type: 'online',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGoogleCode(code: string): Promise<string> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig()
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error('Не вдалося обміняти код Google')

  const payload = (await response.json()) as { access_token?: string }
  if (!payload.access_token) throw new Error('Google не повернув access token')
  return payload.access_token
}

export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch(GOOGLE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!response.ok) throw new Error('Не вдалося отримати профіль Google')

  const payload = (await response.json()) as {
    sub?: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  }
  const id = String(payload.sub || '').trim()
  const email = String(payload.email || '').trim().toLowerCase()
  if (!id || !email) throw new Error('Некоректний профіль Google')

  return {
    id,
    email,
    emailVerified: Boolean(payload.email_verified),
    name: String(payload.name || email.split('@')[0] || 'Google User').trim(),
    avatarUrl: payload.picture ? String(payload.picture).trim() : null,
  }
}
