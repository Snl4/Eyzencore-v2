import { NextRequest, NextResponse } from 'next/server'

const ALWAYS_ALLOWED = [
  '/maintenance',
  '/cms/login',
  '/api/system/maintenance',
  '/api/cms/auth/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/discord',
  '/api/auth/google',
]

function isAlwaysAllowed(pathname: string) {
  return ALWAYS_ALLOWED.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isAlwaysAllowed(pathname)) return NextResponse.next()

  try {
    const internalOrigin =
      process.env.MAINTENANCE_INTERNAL_ORIGIN ||
      `http://127.0.0.1:${process.env.PORT || '3000'}`
    const statusUrl = new URL('/api/system/maintenance', internalOrigin)
    const response = await fetch(statusUrl, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    })
    const status = await response.json() as { enabled?: boolean; adminAccess?: boolean }
    if (!status.enabled) return NextResponse.next()
    if (status.adminAccess) {
      const response = NextResponse.next()
      response.headers.set('x-eyzencore-maintenance-admin', '1')
      return response
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Сайт тимчасово недоступний через технічні роботи.' },
        { status: 503, headers: { 'Retry-After': '300' } }
      )
    }
    return NextResponse.rewrite(new URL('/maintenance', request.url))
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Сервіс тимчасово недоступний.' },
        { status: 503, headers: { 'Retry-After': '60' } }
      )
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|images/|uploads/).*)'],
}
