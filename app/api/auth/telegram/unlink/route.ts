import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, unlinkTelegramUserAccount } from '@/lib/auth-db'

export async function POST(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  try {
    const user = await unlinkTelegramUserAccount(auth.user.id)
    return NextResponse.json({ success: true, user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося відвʼязати Telegram'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
