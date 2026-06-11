import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  getAuthSessionFromToken,
  getSessionMaxAgeSeconds,
  type AuthUser,
} from '@/lib/auth-db';

export async function getCurrentAuth() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  return await getAuthSessionFromToken(token);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return (await getCurrentAuth())?.user ?? null;
}

export async function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: await getSessionMaxAgeSeconds(),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
