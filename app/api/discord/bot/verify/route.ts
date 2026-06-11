import { NextResponse } from 'next/server'
import { verifyDiscordServerByBot } from '@/lib/auth-db'
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
    const body = (await request.json()) as { code?: string; guildId?: string; guildName?: string }
    const result = await verifyDiscordServerByBot({
      code: String(body.code || ''),
      guildId: String(body.guildId || ''),
      guildName: String(body.guildName || ''),
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
