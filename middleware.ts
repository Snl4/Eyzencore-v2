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

function isPrivateNoindexPath(pathname: string) {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/cms') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/add-server') ||
    pathname.endsWith('/edit')
  )
}

function nextWithOptionalNoindex(pathname: string) {
  const response = NextResponse.next()
  if (isPrivateNoindexPath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, follow')
  }
  return response
}

let cachedMaintenance: { enabled: boolean; timestamp: number } = {
  enabled: false,
  timestamp: 0,
}

const MAINTENANCE_CACHE_TTL_MS = 15_000

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
  if (isAlwaysAllowed(pathname)) return nextWithOptionalNoindex(pathname)

  // Skip maintenance fetch for prefetch requests or if recently cached as disabled
  const now = Date.now()
  const isPrefetch = request.headers.get('purpose') === 'prefetch' || request.headers.get('x-purpose') === 'prefetch'

  if (isPrefetch && !cachedMaintenance.enabled && (now - cachedMaintenance.timestamp < MAINTENANCE_CACHE_TTL_MS * 2)) {
    return nextWithOptionalNoindex(pathname)
  }

  try {
    // If we checked within the TTL and maintenance is not active, skip the network roundtrip
    if (!cachedMaintenance.enabled && (now - cachedMaintenance.timestamp < MAINTENANCE_CACHE_TTL_MS)) {
      return nextWithOptionalNoindex(pathname)
    }

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
    cachedMaintenance = {
      enabled: Boolean(status.enabled),
      timestamp: Date.now(),
    }

    if (!status.enabled) return nextWithOptionalNoindex(pathname)
    if (status.adminAccess) {
      const res = nextWithOptionalNoindex(pathname)
      res.headers.set('x-eyzencore-maintenance-admin', '1')
      return res
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
    return nextWithOptionalNoindex(pathname)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|images/|uploads/).*)'],
}
