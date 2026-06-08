import { NextResponse } from 'next/server';
import { listSessions } from '@/lib/auth-db';
import { getCurrentAuth } from '@/lib/auth-server';

export async function GET() {
  const auth = getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 });
  }
  return NextResponse.json({
    sessions: listSessions(auth.user.id, auth.sessionId),
  });
}
