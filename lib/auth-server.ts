import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  getAuthSessionFromToken,
  getSessionMaxAgeSeconds,
  type AuthUser,
} from '@/lib/auth-db';

export function getCurrentAuth() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  return getAuthSessionFromToken(token);
}

export function getCurrentUser(): AuthUser | null {
  return getCurrentAuth()?.user ?? null;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getSessionMaxAgeSeconds(),
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
