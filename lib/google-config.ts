export type GoogleOAuthMode = 'login' | 'link'

function resolvePublicAppUrl() {
  const candidates = [
    process.env.FRONTEND_URL,
    process.env.API_PUBLIC_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)

  const preferred = process.env.NODE_ENV === 'production'
    ? candidates.find((value) => !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value)) || 'https://eyzencore.com'
    : candidates[0]

  return String(preferred || 'http://localhost:3000').replace(/\/$/, '')
}

export function getGoogleConfig() {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim()
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim()
  const appUrl = resolvePublicAppUrl()
  const redirectUri = String(process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/auth/google/callback`).trim()

  return {
    clientId,
    clientSecret,
    appUrl,
    redirectUri,
    isOAuthConfigured: Boolean(clientId && clientSecret),
  }
}
