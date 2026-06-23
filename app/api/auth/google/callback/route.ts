import { NextRequest, NextResponse } from 'next/server'
import { createSession, createUserFromOAuthProfile } from '@/lib/auth-db'
import { setSessionCookie } from '@/lib/auth-server'
import { getGoogleConfig } from '@/lib/google-config'
import { exchangeGoogleCode, fetchGoogleUserProfile, parseGoogleOAuthState } from '@/lib/google-oauth'

function getSafeRedirectOrigin(request: NextRequest, fallback: string) {
  const origin = request.nextUrl.origin
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(origin)) {
    return origin
  }
  return fallback
}

export async function GET(request: NextRequest) {
  const { isOAuthConfigured, appUrl } = getGoogleConfig()
  const redirectOrigin = getSafeRedirectOrigin(request, appUrl)
  const errorParam = request.nextUrl.searchParams.get('error')
  if (errorParam) {
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(errorParam)}`, redirectOrigin))
  }
  if (!isOAuthConfigured) {
    return NextResponse.redirect(new URL('/auth/login?error=google_not_configured', redirectOrigin))
  }

  const code = request.nextUrl.searchParams.get('code')
  const stateRaw = request.nextUrl.searchParams.get('state')
  const state = parseGoogleOAuthState(stateRaw)
  if (!code || !state) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid_google_state', redirectOrigin))
  }

  try {
    const accessToken = await exchangeGoogleCode(code)
    const profile = await fetchGoogleUserProfile(accessToken)
    if (!profile.emailVerified) {
      return NextResponse.redirect(new URL('/auth/login?error=google_email_not_verified', redirectOrigin))
    }

    const user = await createUserFromOAuthProfile({
      email: profile.email,
      fullName: profile.name,
      avatarUrl: profile.avatarUrl,
    })
    const { token } = await createSession(user.id, request.headers.get('user-agent'))
    const response = NextResponse.redirect(new URL('/dashboard', redirectOrigin))
    await setSessionCookie(response, token)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'google_auth_failed'
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(message)}`, redirectOrigin))
  }
}
