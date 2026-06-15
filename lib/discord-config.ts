export type DiscordOAuthMode = 'login' | 'link'

export function getDiscordConfig() {
  const clientId = String(process.env.DISCORD_CLIENT_ID || '').trim()
  const clientSecret = String(process.env.DISCORD_CLIENT_SECRET || '').trim()
  const botToken = String(process.env.DISCORD_BOT_TOKEN || '').trim()
  const botSecret = String(process.env.DISCORD_BOT_SECRET || '').trim()
  const appUrl = String(
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.API_PUBLIC_URL ||
    'http://localhost:3000'
  ).trim().replace(/\/$/, '')
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
