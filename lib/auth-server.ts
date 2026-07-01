import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  getAuthSessionFromToken,
  getSessionMaxAgeSeconds,
  type AuthUser,
} from '@/lib/auth-db';

function buildSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getSessionMaxAgeSeconds(),
  };
}

export async function getCurrentAuth() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  return await getAuthSessionFromToken(token);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return (await getCurrentAuth())?.user ?? null;
}

export function persistSessionToken(token: string, response?: NextResponse) {
  const options = buildSessionCookieOptions();
  cookies().set(AUTH_COOKIE_NAME, token, options);
  if (response) {
    response.cookies.set(AUTH_COOKIE_NAME, token, options);
  }
}

export async function setSessionCookie(response: NextResponse, token: string) {
  persistSessionToken(token, response);
}

export function clearSessionCookie(response: NextResponse) {
  const options = {
    ...buildSessionCookieOptions(),
    maxAge: 0,
  };
  cookies().set(AUTH_COOKIE_NAME, '', options);
  response.cookies.set(AUTH_COOKIE_NAME, '', options);
}