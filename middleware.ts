import { NextRequest, NextResponse } from 'next/server'

const CANONICAL_HOST = 'eyzencore.com'
const CANONICAL_REDIRECT_HOSTS = new Set([
  'www.eyzencore.com',
  'status.eyzencore.com',
  'acp.eyzencore.com',
])

const ALWAYS_ALLOWED = [
  '/maintenance',
  '/cms/login',
  '/api/system/maintenance',
  '/api/cms/auth/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/discord',
  '/api/auth/discord/callback',
  '/api/auth/google',
  '/api/auth/google/callback',
]

function isAlwaysAllowed(pathname: string) {
  return ALWAYS_ALLOWED.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function legacyRedirectPath(pathname: string): string | null {
  if (/^\/forum\/category-[^/]+\/topic-[^/]+\/?$/i.test(pathname)) {
    return '/forum'
  }
  if (/^\/giveaway\/[^/]+\/?$/i.test(pathname)) {
    return '/'
  }
  if (pathname === '/src/main' || pathname === '/src/main/') {
    return '/'
  }
  return null
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const normalizedHost = host.toLowerCase().split(':')[0]
  if (CANONICAL_REDIRECT_HOSTS.has(normalizedHost)) {
    const url = request.nextUrl.clone()
    url.host = CANONICAL_HOST
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }
  const { pathname } = request.nextUrl
  const legacyPath = legacyRedirectPath(pathname)
  if (legacyPath) {
    const url = request.nextUrl.clone()
    url.pathname = legacyPath
    url.search = ''
    return NextResponse.redirect(url, 301)
  }
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
