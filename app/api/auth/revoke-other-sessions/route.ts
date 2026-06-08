import { NextResponse } from 'next/server';
import { revokeOtherSessions } from '@/lib/auth-db';
import { getCurrentAuth } from '@/lib/auth-server';

export async function POST() {
  const auth = getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 });
  }

  revokeOtherSessions(auth.user.id, auth.sessionId);
  return NextResponse.json({ success: true });
}
