import { normalizePublicSiteUrl, resolvePublicAppUrl } from '@/lib/app-url'

export type GoogleOAuthMode = 'login' | 'link'

export function getGoogleConfig() {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim()
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim()
  const appUrl = resolvePublicAppUrl()
  const redirectUri = normalizePublicSiteUrl(
    String(process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/auth/google/callback`).trim(),
  )

  return {
    clientId,
    clientSecret,
    appUrl,
    redirectUri,
    isOAuthConfigured: Boolean(clientId && clientSecret),
  }
}
