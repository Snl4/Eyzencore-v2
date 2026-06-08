import { NextResponse } from 'next/server'
import { createSession, createUser, isValidEmail, normalizeEmail } from '@/lib/auth-db'
import { verifyEmailCode } from '@/lib/auth-verification'
import { setSessionCookie } from '@/lib/auth-server'

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { name, email, password, code } = (await request.json()) as {
      name?: string
      email?: string
      password?: string
      code?: string
    }
    const normalizedEmail = normalizeEmail(email || '')
    const normalizedCode = String(code || '').trim()
    if (!normalizedEmail || !password || !normalizedCode) {
      return NextResponse.json({ error: 'Заповніть всі обовʼязкові поля' }, { status: 400 })
    }
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Некоректний email' }, { status: 400 })
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Пароль має містити мінімум 8 символів' }, { status: 400 })
    }
    const verificationResult = verifyEmailCode(normalizedEmail, normalizedCode)
    if (!verificationResult.isValid) {
      return NextResponse.json({ error: verificationResult.error || 'Невірний код підтвердження' }, { status: 400 })
    }
    const user = createUser({ email: normalizedEmail, password: String(password), name: String(name || '') })
    const { token } = createSession(user.id, request.headers.get('user-agent'))
    const response = NextResponse.json({ success: true, user })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося підтвердити реєстрацію'
    const status = message === 'User already exists' ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
