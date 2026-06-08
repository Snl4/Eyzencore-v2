import { NextResponse } from 'next/server'
import { syncDiscordGuildStats } from '@/lib/auth-db'
import { getDiscordConfig } from '@/lib/discord-config'

function isAuthorized(request: Request): boolean {
  const { botSecret } = getDiscordConfig()
  if (!botSecret) {
    return false
  }
  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${botSecret}`
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await request.json()) as {
      guilds?: Array<{ guildId?: string; players?: number; max?: number; guildName?: string }>
    }
    const guilds = Array.isArray(body.guilds) ? body.guilds : []
    let updated = 0
    guilds.forEach((guild) => {
      updated += syncDiscordGuildStats({
        guildId: String(guild.guildId || ''),
        players: Number(guild.players || 0),
        max: Number(guild.max || 0),
        guildName: String(guild.guildName || ''),
      })
    })
    return NextResponse.json({ success: true, updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
