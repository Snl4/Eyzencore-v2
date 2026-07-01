import { NextRequest, NextResponse } from 'next/server'
import { createSession, createUserFromOAuthProfile } from '@/lib/auth-db'
import { getGoogleConfig } from '@/lib/google-config'
import { exchangeGoogleCode, fetchGoogleUserProfile, parseGoogleOAuthState } from '@/lib/google-oauth'
import { buildOAuthSuccessResponse } from '@/lib/oauth-session'
import { resolvePublicAppUrl } from '@/lib/app-url'

function buildOAuthLoginUrl(redirectOrigin: string, errorCode: string): URL {
  return new URL(`/login?error=${encodeURIComponent(errorCode)}`, redirectOrigin)
}

export async function GET(request: NextRequest) {
  const { isOAuthConfigured } = getGoogleConfig()
  const redirectOrigin = resolvePublicAppUrl()
  const errorParam = request.nextUrl.searchParams.get('error')
  if (errorParam) {
    return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, errorParam))
  }
  if (!isOAuthConfigured) {
    return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, 'google_not_configured'))
  }

  const code = request.nextUrl.searchParams.get('code')
  const stateRaw = request.nextUrl.searchParams.get('state')
  const state = parseGoogleOAuthState(stateRaw)
  if (!code || !state) {
    return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, 'invalid_google_state'))
  }

  try {
    const accessToken = await exchangeGoogleCode(code)
    const profile = await fetchGoogleUserProfile(accessToken)
    if (!profile.emailVerified) {
      return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, 'google_email_not_verified'))
    }

    const user = await createUserFromOAuthProfile({
      email: profile.email,
      fullName: profile.name,
      avatarUrl: profile.avatarUrl,
    })
    const { token } = await createSession(user.id, request.headers.get('user-agent'))
    return buildOAuthSuccessResponse({
      redirectOrigin,
      token,
      path: '/settings',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'google_auth_failed'
    return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, message))
  }
}
