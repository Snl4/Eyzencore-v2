import { NextResponse } from 'next/server';
import { revokeSessionById } from '@/lib/auth-db';
import { getCurrentAuth } from '@/lib/auth-server';

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 });
  }

  const { session_id } = (await request.json()) as { session_id?: string };
  if (!session_id) {
    return NextResponse.json({ error: 'Ідентифікатор сесії є обовʼязковим' }, { status: 400 });
  }
  if (session_id === auth.sessionId) {
    return NextResponse.json({ error: 'Поточну сесію не можна завершити тут' }, { status: 400 });
  }

  await revokeSessionById(auth.user.id, session_id);
  return NextResponse.json({ success: true });
}
