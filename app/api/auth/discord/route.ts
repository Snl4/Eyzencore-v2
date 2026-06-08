import { NextRequest, NextResponse } from 'next/server'
import { getDiscordConfig } from '@/lib/discord-config'
import { buildDiscordAuthorizeUrl } from '@/lib/discord-oauth'

export async function GET(request: NextRequest) {
  const { isOAuthConfigured } = getDiscordConfig()
  if (!isOAuthConfigured) {
    return NextResponse.json({ error: 'Discord OAuth не налаштовано' }, { status: 503 })
  }
  const mode = request.nextUrl.searchParams.get('mode') === 'link' ? 'link' : 'login'
  try {
    const authorizeUrl = buildDiscordAuthorizeUrl(mode)
    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Помилка Discord OAuth'
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(message)}`, request.url))
  }
}
