import { NextRequest, NextResponse } from 'next/server'
import { getGoogleConfig } from '@/lib/google-config'
import { buildGoogleAuthorizeUrl } from '@/lib/google-oauth'

export async function GET(request: NextRequest) {
  const { isOAuthConfigured } = getGoogleConfig()
  if (!isOAuthConfigured) {
    return NextResponse.redirect(new URL('/auth/login?error=google_not_configured', request.url))
  }

  const mode = request.nextUrl.searchParams.get('mode') === 'link' ? 'link' : 'login'

  try {
    return NextResponse.redirect(buildGoogleAuthorizeUrl(mode))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'google_auth_failed'
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(message)}`, request.url))
  }
}
