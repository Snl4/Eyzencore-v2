import { NextResponse } from 'next/server';
import { createSession, createUser, isValidEmail, normalizeEmail } from '@/lib/auth-db';
import { setSessionCookie } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    const { email, password, name } = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const normalizedEmail = normalizeEmail(email || '');
    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Email та пароль є обовʼязковими' }, { status: 400 });
    }
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Некоректна email-адреса' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Пароль має містити щонайменше 6 символів' }, { status: 400 });
    }

    const user = createUser({ email: normalizedEmail, password: String(password), name });
    const { token } = createSession(user.id, request.headers.get('user-agent'));
    const response = NextResponse.json({ success: true, user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Не вдалося створити акаунт';
    const isUserExists = rawMessage === 'User already exists';
    const message = isUserExists ? 'Користувач із таким email вже існує' : rawMessage;
    const status = isUserExists ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
