import { NextResponse } from 'next/server';
import { updatePassword } from '@/lib/auth-db';
import { getCurrentUser } from '@/lib/auth-server';

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 });
  }

  try {
    const { current_password, new_password } = (await request.json()) as {
      current_password?: string;
      new_password?: string;
    };

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Потрібно вказати обидва паролі' }, { status: 400 });
    }
    if (String(new_password).length < 6) {
      return NextResponse.json({ error: 'Пароль має містити щонайменше 6 символів' }, { status: 400 });
    }

    updatePassword(user.id, String(current_password), String(new_password));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося змінити пароль';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
