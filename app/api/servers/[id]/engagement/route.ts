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
  }
  const action = body.action
  if (action === 'view') {
    // CDN headers (Vercel/Cloudflare) take priority. Otherwise look up via ip-api.com.
    let countryCode = actor.countryCode
    if (!countryCode && actor.ip) {
      const geo = await lookupCountry(actor.ip)
      if (geo?.code) countryCode = geo.code
    }
    const result = await registerServerView({
      serverId,
      userId: actor.user?.id,
      fingerprint: actor.fingerprint,
      ipAddress: actor.ip,
      countryCode,
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
    return NextResponse.json({
      success: true,
      summary: await getServerEngagementSummary(serverId),
      userReview: await getServerReviewByActor({ serverId, userId: actor.user?.id, fingerprint: actor.fingerprint }),
      reviews: await listServerReviews(serverId, 40),
    })
  }
  return NextResponse.json({ error: 'Невідома дія' }, { status: 400 })
}
