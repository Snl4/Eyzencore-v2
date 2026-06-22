import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  createTelegramLinkToken,
  getAuthSessionFromToken,
  getTelegramBotUsername,
} from '@/lib/auth-db'

export async function GET(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const botUsername = getTelegramBotUsername()
  if (!botUsername) {
    return NextResponse.json({ error: 'Telegram bot username не налаштовано в env' }, { status: 503 })
  }
  const token = createTelegramLinkToken(auth.user.id)
  const url = `https://t.me/${botUsername}?start=link_${encodeURIComponent(token)}`
  return NextResponse.json({ url, token, botUsername, expiresInSeconds: 900 })
}
