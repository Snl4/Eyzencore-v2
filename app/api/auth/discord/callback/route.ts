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
import { setSessionCookie } from '@/lib/auth-server'

function buildDiscordProfileUrl(userId: string): string {
  return `https://discord.com/users/${userId}`
}

export async function GET(request: NextRequest) {
  const { isOAuthConfigured, appUrl } = getDiscordConfig()
  const redirectOrigin = request.nextUrl.origin || appUrl
  const errorParam = request.nextUrl.searchParams.get('error')
  if (errorParam) {
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(errorParam)}`, redirectOrigin))
  }
  if (!isOAuthConfigured) {
    return NextResponse.redirect(new URL('/auth/login?error=discord_not_configured', redirectOrigin))
  }
  const code = request.nextUrl.searchParams.get('code')
  const stateRaw = request.nextUrl.searchParams.get('state')
  const state = parseDiscordOAuthState(stateRaw)
  if (!code || !state) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid_discord_state', redirectOrigin))
  }
  try {
    const accessToken = await exchangeDiscordCode(code)
    const profile = await fetchDiscordUserProfile(accessToken)
    const profileUrl = buildDiscordProfileUrl(profile.id)
    if (state.mode === 'link') {
      const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
      if (!auth) {
        return NextResponse.redirect(new URL('/auth/login?error=login_required', redirectOrigin))
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
    const response = NextResponse.redirect(new URL('/dashboard', redirectOrigin))
    await setSessionCookie(response, token)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'discord_auth_failed'
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(message)}`, redirectOrigin))
  }
}
