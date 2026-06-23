export type GoogleOAuthMode = 'login' | 'link'

export function getGoogleConfig() {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim()
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim()
  const appUrl = String(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      process.env.API_PUBLIC_URL ||
      'http://localhost:3000',
  )
    .trim()
    .replace(/\/$/, '')
  const redirectUri = String(process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/auth/google/callback`).trim()

  return {
    clientId,
    clientSecret,
    appUrl,
    redirectUri,
    isOAuthConfigured: Boolean(clientId && clientSecret),
  }
}
