import { NextResponse } from 'next/server'
import { getDiscordBotInviteUrl, getDiscordConfig } from '@/lib/discord-config'

export async function GET() {
  const { clientId, isBotConfigured } = getDiscordConfig()
  if (!clientId) {
    return NextResponse.json({ error: 'Discord не налаштовано' }, { status: 503 })
  }
  return NextResponse.json({
    inviteUrl: getDiscordBotInviteUrl(clientId),
    isBotConfigured,
  })
}
