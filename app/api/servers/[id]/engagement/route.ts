import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  buildActorFingerprint,
  createOwnerNotification,
  getAuthSessionFromToken,
  getServerById,
  getServerEngagementSummary,
  getServerReviewByActor,
  listServerReviews,
  listTopServerVoters,
  listServerVotes,
  registerServerView,
  upsertServerReview,
} from '@/lib/auth-db'
import { lookupCountry } from '@/lib/geoip'
import { dispatchServerCallback } from '@/lib/callback-api'

async function getActorContext(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  const forwarded = request.headers.get('x-forwarded-for') || ''
  const ip = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
  const countryCode =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    ''
  const userAgent = request.headers.get('user-agent') || ''
  return {
    user: auth?.user || null,
    ip,
    countryCode,
    fingerprint: await buildActorFingerprint({ ip, userAgent }),
  }
}

const TIMEZONE_COUNTRIES: Record<string, string> = {
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'Europe/Warsaw': 'PL',
  'Europe/Berlin': 'DE',
  'Europe/Prague': 'CZ',
  'Europe/Bratislava': 'SK',
  'Europe/Chisinau': 'MD',
  'Europe/Bucharest': 'RO',
  'Europe/Budapest': 'HU',
  'Europe/Vilnius': 'LT',
  'Europe/Riga': 'LV',
  'Europe/Tallinn': 'EE',
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Istanbul': 'TR',
}

function isLocalAddress(ip: string) {
  const value = String(ip || '').trim().toLowerCase().replace(/^::ffff:/, '')
  return !value || value === '::1' || value === '127.0.0.1' || value.startsWith('10.') ||
    value.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(value)
}

function classifyTrafficSource(referrer: string, currentOrigin: string): string {
  if (!referrer) return 'direct'
  try {
    const url = new URL(referrer)
    if (url.origin === currentOrigin) return 'internal'
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (host.includes('discord.com') || host.includes('discord.gg')) return 'discord'
    if (host.includes('google.') || host.includes('bing.com') || host.includes('duckduckgo.com') || host.includes('yahoo.')) return 'search'
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube'
    if (host.includes('tiktok.com')) return 'tiktok'
    if (host.includes('facebook.com') || host.includes('instagram.com') || host.includes('x.com') || host.includes('twitter.com') || host.includes('telegram.')) return 'social'
    return host.slice(0, 120) || 'referral'
  } catch {
    return 'referral'
  }
}

function normalizeMinecraftNickname(value: string): string {
  return String(value || '').trim()
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Некоректний ідентифікатор сервера' }, { status: 400 })
  }
  const server = await getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  }
  const actor = await getActorContext(request)
  const summary = await getServerEngagementSummary(serverId)
  const reviews = await listServerReviews(serverId, 40)
  const latestVotes = await listServerVotes(serverId, 30)
  const topVoters = await listTopServerVoters(serverId, 10)
  const userReview = await getServerReviewByActor({ serverId, userId: actor.user?.id, fingerprint: actor.fingerprint })
  return NextResponse.json({
    summary,
    user: {
      review: userReview || null,
    },
    topVoters,
    latestVotes,
    reviews,
  })
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Некоректний ідентифікатор сервера' }, { status: 400 })
  }
  const server = await getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  }
  const actor = await getActorContext(request)
  const body = (await request.json()) as {
    action?: 'view' | 'review'
    cooldownMinutes?: number
    text?: string
    rating?: number
    nickname?: string
    referrer?: string
    referralCode?: string
    timezone?: string
  }
  const action = body.action
  if (action === 'view') {
    // CDN headers (Vercel/Cloudflare) take priority. Otherwise look up via ip-api.com.
    let countryCode = actor.countryCode
    if (!countryCode && actor.ip) {
      const geo = await lookupCountry(actor.ip)
      if (geo?.code) countryCode = geo.code
    }
    if (!countryCode && isLocalAddress(actor.ip)) {
      countryCode = TIMEZONE_COUNTRIES[String(body.timezone || '')] || ''
    }
    const referrer = String(body.referrer || '').trim()
    const result = await registerServerView({
      serverId,
      userId: actor.user?.id,
      fingerprint: actor.fingerprint,
      ipAddress: actor.ip,
      countryCode,
      referrer,
      trafficSource: body.referralCode ? `ref:${String(body.referralCode).trim().slice(0, 48)}` : classifyTrafficSource(referrer, new URL(request.url).origin),
      referralCode: body.referralCode,
      cooldownMinutes: body.cooldownMinutes,
    })
    return NextResponse.json({ success: true, counted: result.counted, summary: await getServerEngagementSummary(serverId) })
  }
  if (action === 'review') {
    const nickname = normalizeMinecraftNickname(body.nickname || '')
    const normalizedText = String(body.text || '')
    const normalizedRating = Number(body.rating || 0)
    await upsertServerReview({
      serverId,
      userId: actor.user?.id,
      fingerprint: actor.fingerprint,
      text: normalizedText,
      rating: normalizedRating,
      authorName: actor.user?.user_metadata.full_name || nickname || 'Гість',
    })
    await createOwnerNotification({
      serverId,
      type: 'review',
      actorName: actor.user?.user_metadata.full_name || nickname || 'Guest',
      text: normalizedText,
      rating: normalizedRating,
    })
    await dispatchServerCallback({
      serverId,
      action: 'comment',
      userId: actor.user?.id,
      userNickname: actor.user?.user_metadata.full_name || nickname || 'Guest',
      ipAddress: actor.ip,
    })
    return NextResponse.json({
      success: true,
      summary: await getServerEngagementSummary(serverId),
      userReview: await getServerReviewByActor({ serverId, userId: actor.user?.id, fingerprint: actor.fingerprint }),
      reviews: await listServerReviews(serverId, 40),
    })
  }
  return NextResponse.json({ error: 'Невідома дія' }, { status: 400 })
}
