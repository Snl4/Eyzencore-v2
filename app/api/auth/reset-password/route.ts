import { NextResponse } from 'next/server'
import { resetPasswordWithToken } from '@/lib/auth-db'

export async function POST(request: Request) {
  try {
    const { token, password } = (await request.json()) as {
      token?: string
      password?: string
    }

    if (!token || !password) {
      return NextResponse.json({ error: 'Токен і новий пароль є обовʼязковими.' }, { status: 400 })
    }

    await resetPasswordWithToken(String(token), String(password))
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося змінити пароль.'
    if (message === 'Reset token is invalid or expired') {
      return NextResponse.json({ error: 'Посилання для скидання недійсне або вже протерміноване.' }, { status: 400 })
    }
    if (message === 'Password must be at least 8 characters long') {
      return NextResponse.json({ error: 'Пароль має містити щонайменше 8 символів.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Не вдалося змінити пароль.' }, { status: 500 })
  }
}
