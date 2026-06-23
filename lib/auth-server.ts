import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  getAuthSessionFromToken,
  getSessionMaxAgeSeconds,
  type AuthUser,
} from '@/lib/auth-db';

function getAuthCookieDomain() {
  const domain = String(process.env.AUTH_COOKIE_DOMAIN || process.env.VITE_AUTH_COOKIE_DOMAIN || '').trim();
  if (!domain || domain === 'localhost' || domain === '127.0.0.1') return undefined;
  return domain;
}

export async function getCurrentAuth() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  return await getAuthSessionFromToken(token);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return (await getCurrentAuth())?.user ?? null;
}

export async function setSessionCookie(response: NextResponse, token: string) {
  const domain = getAuthCookieDomain();
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    ...(domain ? { domain } : {}),
    path: '/',
    maxAge: await getSessionMaxAgeSeconds(),
  });
}

export function clearSessionCookie(response: NextResponse) {
  const domain = getAuthCookieDomain();
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    ...(domain ? { domain } : {}),
    path: '/',
    maxAge: 0,
  });
}
