export type DiscordOAuthMode = 'login' | 'link'

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

export function getDiscordConfig() {
  const clientId = String(process.env.DISCORD_CLIENT_ID || '').trim()
  const clientSecret = String(process.env.DISCORD_CLIENT_SECRET || '').trim()
  const botToken = String(process.env.DISCORD_BOT_TOKEN || '').trim()
  const botSecret = String(process.env.DISCORD_BOT_SECRET || '').trim()
  const appUrl = resolvePublicAppUrl()
  const redirectUri = String(process.env.DISCORD_REDIRECT_URI || `${appUrl}/api/auth/discord/callback`).trim()
  return {
    clientId,
    clientSecret,
    botToken,
    botSecret,
    appUrl,
    redirectUri,
    isOAuthConfigured: Boolean(clientId && clientSecret),
    isBotConfigured: Boolean(botToken && botSecret),
  }
}

export function getDiscordBotInviteUrl(clientId = getDiscordConfig().clientId): string {
  if (!clientId) {
    return 'https://discord.com/oauth2/authorize'
  }
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: '68608',
    scope: 'bot applications.commands',
  })
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`
}
