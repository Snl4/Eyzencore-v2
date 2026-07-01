import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  createSession,
  createUserFromDiscordProfile,
  getAuthSessionFromToken,
  getUserByEmail,
  getUserByDiscordId,
  linkDiscordUserAccount,
} from '@/lib/auth-db'
import { getDiscordConfig } from '@/lib/discord-config'
import {
  exchangeDiscordCode,
  fetchDiscordUserProfile,
  parseDiscordOAuthState,
} from '@/lib/discord-oauth'
import { buildOAuthSuccessResponse } from '@/lib/oauth-session'
import { resolvePublicAppUrl } from '@/lib/app-url'

function buildDiscordProfileUrl(userId: string): string {
  return `https://discord.com/users/${userId}`
}

function getSafeRedirectOrigin(request: NextRequest) {
  return resolvePublicAppUrl()
}

function buildOAuthLoginUrl(redirectOrigin: string, errorCode: string): URL {
  return new URL(`/login?error=${encodeURIComponent(errorCode)}`, redirectOrigin)
}

export async function GET(request: NextRequest) {
  const { isOAuthConfigured } = getDiscordConfig()
  const redirectOrigin = getSafeRedirectOrigin(request)
  const errorParam = request.nextUrl.searchParams.get('error')
  if (errorParam) {
    return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, errorParam))
  }
  if (!isOAuthConfigured) {
    return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, 'discord_not_configured'))
  }
  const code = request.nextUrl.searchParams.get('code')
  const stateRaw = request.nextUrl.searchParams.get('state')
  const state = parseDiscordOAuthState(stateRaw)
  if (!code || !state) {
    return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, 'invalid_discord_state'))
  }
  try {
    const accessToken = await exchangeDiscordCode(code)
    const profile = await fetchDiscordUserProfile(accessToken)
    const profileUrl = buildDiscordProfileUrl(profile.id)
    if (state.mode === 'link') {
      const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
      if (!auth) {
        return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, 'login_required'))
      }
      await linkDiscordUserAccount({
        userId: auth.user.id,
        discordUserId: profile.id,
        discordProfileUrl: profileUrl,
        avatarUrl: profile.avatarUrl,
      })
      return NextResponse.redirect(new URL('/settings?section=integrations&discord=linked', redirectOrigin))
    }
    let user = await getUserByDiscordId(profile.id)
    if (!user) {
      const email = profile.email || `discord_${profile.id}@users.eyzencore.local`
      const existingByEmail = profile.email ? await getUserByEmail(profile.email) : null
      user = existingByEmail
        ? await linkDiscordUserAccount({
            userId: existingByEmail.id,
            discordUserId: profile.id,
            discordProfileUrl: profileUrl,
            avatarUrl: profile.avatarUrl,
          })
        : await createUserFromDiscordProfile({
            discordUserId: profile.id,
            email,
            fullName: profile.globalName || profile.username,
            avatarUrl: profile.avatarUrl,
            discordProfileUrl: profileUrl,
          })
    }
    if (!user) {
      throw new Error('discord_user_creation_failed')
    }
    const { token } = await createSession(user.id, request.headers.get('user-agent'))
    return buildOAuthSuccessResponse({
      redirectOrigin,
      token,
      path: '/settings',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'discord_auth_failed'
    return NextResponse.redirect(buildOAuthLoginUrl(redirectOrigin, message))
  }
}
