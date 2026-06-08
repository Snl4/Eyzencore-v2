import { NextResponse } from 'next/server';
import { authenticateUser, createSession, normalizeEmail } from '@/lib/auth-db';
import { setSessionCookie } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const normalizedEmail = normalizeEmail(email || '');
    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Email та пароль є обовʼязковими' }, { status: 400 });
    }

    const user = authenticateUser(normalizedEmail, String(password));
    if (!user) {
      return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 });
    }

    const { token } = createSession(user.id, request.headers.get('user-agent'));
    const response = NextResponse.json({ success: true, user });
    setSessionCookie(response, token);
    return response;
  } catch (_error) {
    return NextResponse.json({ error: 'Не вдалося увійти в акаунт' }, { status: 500 });
  }
}
