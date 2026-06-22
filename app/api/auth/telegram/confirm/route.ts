import { NextRequest, NextResponse } from 'next/server'
import { linkTelegramUserAccount } from '@/lib/auth-db'

export async function POST(request: NextRequest) {
  const configuredToken = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const incomingToken = String(request.headers.get('x-telegram-bot-token') || '').trim()
  if (!configuredToken || incomingToken !== configuredToken) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as {
    token?: string
    telegramUserId?: string
    userId?: string
    username?: string | null
  } | null

  try {
    const user = await linkTelegramUserAccount({
      token: String(body?.token || ''),
      telegramUserId: String(body?.telegramUserId || body?.userId || ''),
      username: body?.username || null,
    })
    return NextResponse.json({ success: true, user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося привʼязати Telegram'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
