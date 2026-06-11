import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  getCmsSessionFromToken,
  revokeCmsSessionByToken,
  type AuthUser,
} from '@/lib/auth-db'
import {
  CMS_COOKIE_NAME,
  CMS_SESSION_MAX_AGE_SECONDS,
} from '@/lib/constants'

export async function getCurrentCmsAuth() {
  const token = cookies().get(CMS_COOKIE_NAME)?.value
  return await getCmsSessionFromToken(token)
}

export async function getCurrentCmsUser(): Promise<AuthUser | null> {
  return (await getCurrentCmsAuth())?.user ?? null
}

export function setCmsSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(CMS_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CMS_SESSION_MAX_AGE_SECONDS,
  })
}

export async function clearCmsSession(response: NextResponse) {
  const token = cookies().get(CMS_COOKIE_NAME)?.value
  await revokeCmsSessionByToken(token)
  response.cookies.set(CMS_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}
