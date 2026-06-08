import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, revokeSessionByToken } from '@/lib/auth-db';
import { clearSessionCookie } from '@/lib/auth-server';

export async function POST() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  revokeSessionByToken(token);
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
