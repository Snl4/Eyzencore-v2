import { NextResponse } from 'next/server';
import { revokeOtherSessions } from '@/lib/auth-db';
import { getCurrentAuth } from '@/lib/auth-server';

export async function POST() {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 });
  }

  await revokeOtherSessions(auth.user.id, auth.sessionId);
  return NextResponse.json({ success: true });
}
