import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveApiToken } from '@/lib/auth-db'
import { buildServerDashboardSlug } from '@/lib/server-slug'

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

type RateEntry = { count: number; resetAt: number }
type RateStore = typeof globalThis & { __externalApiRateLimits?: Map<string, RateEntry> }

const rateStore = globalThis as RateStore
const rateLimits = rateStore.__externalApiRateLimits || new Map<string, RateEntry>()
if (process.env.NODE_ENV !== 'production') rateStore.__externalApiRateLimits = rateLimits

function requested(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key)
  return value === '1' || value === 'true'
}

function applyRateLimit(tokenId: string) {
  const now = Date.now()
  const current = rateLimits.get(tokenId)
  const entry = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + RATE_WINDOW_MS }
    : { count: current.count + 1, resetAt: current.resetAt }
  rateLimits.set(tokenId, entry)
  return {
    allowed: entry.count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - entry.count),
    resetAt: entry.resetAt,
  }
}

function rateHeaders(rate: { remaining: number; resetAt: number }) {
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(rate.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rate.resetAt / 1000)),
  }
}

function actor(row: { user_id: string | null; author_name: string | null; created_at?: string; updated_at?: string; app_users: { full_name: string } | null }) {
  return {
    user_id: row.user_id,
    user_nickname: row.app_users?.full_name || row.author_name || 'Guest',
    created_at: row.updated_at || row.created_at || new Date(0).toISOString(),
  }
}

export async function GET(request: NextRequest) {
  const rawKey = request.headers.get('x-eyzencore-api-key') || request.headers.get('x-monicore-api-key') || ''
  if (!rawKey) {
    return NextResponse.json({ error: 'API key is missing or invalid' }, { status: 403 })
  }
  const token = await resolveApiToken(rawKey)
  if (!token || !token.serverId || !token.scopes.includes('servers:read')) {
    return NextResponse.json({ error: 'API key is missing or invalid' }, { status: 403 })
  }
  const rate = applyRateLimit(token.id)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after: Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000)) },
      { status: 429, headers: rateHeaders(rate) },
    )
  }

  const server = await prisma.app_servers.findUnique({ where: { id: token.serverId } })
  if (!server) {
    return NextResponse.json({ error: 'Server not found or unavailable' }, { status: 404, headers: rateHeaders(rate) })
  }

  const includeVotes = ['votes_today', 'votes_month', 'votes_prev_month', 'votes_all']
    .some((key) => requested(request.nextUrl.searchParams, key))
  const includeLikes = requested(request.nextUrl.searchParams, 'likes')
  const includeComments = requested(request.nextUrl.searchParams, 'comments')
  const [votes, likes, reviews, rating] = await Promise.all([
    includeVotes
      ? prisma.app_server_votes.findMany({
        where: { server_id: server.id },
        include: { app_users: { select: { full_name: true } } },
        orderBy: { updated_at: 'desc' },
      })
      : Promise.resolve([]),
    includeLikes
      ? prisma.app_server_likes.findMany({
        where: { server_id: server.id },
        include: { app_users: { select: { full_name: true } } },
        orderBy: { created_at: 'desc' },
      })
      : Promise.resolve([]),
    includeComments
      ? prisma.app_server_reviews.findMany({
        where: { server_id: server.id },
        include: { app_users: { select: { full_name: true } } },
        orderBy: { created_at: 'desc' },
      })
      : Promise.resolve([]),
    prisma.app_server_reviews.aggregate({
      where: { server_id: server.id },
      _avg: { rating: true },
    }),
  ])

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const byRange = (start: Date, end?: Date) => votes
    .filter((vote) => {
      const date = new Date(vote.updated_at)
      return date >= start && (!end || date < end)
    })
    .map(actor)

  const response: Record<string, unknown> = {
    id: server.id,
    slug: buildServerDashboardSlug(server.name),
    name: server.name,
    rating: Number((rating._avg.rating || 0).toFixed(2)),
    created_at: server.created_at,
  }
  if (requested(request.nextUrl.searchParams, 'votes_today')) response.votes_today = byRange(todayStart)
  if (requested(request.nextUrl.searchParams, 'votes_month')) response.votes_month = byRange(monthStart)
  if (requested(request.nextUrl.searchParams, 'votes_prev_month')) response.votes_prev_month = byRange(previousMonthStart, monthStart)
  if (requested(request.nextUrl.searchParams, 'votes_all')) response.votes_all = votes.map(actor)
  if (includeLikes) response.likes = likes.map(actor)
  if (includeComments) {
    response.comments = reviews.map((review) => ({
      ...actor(review),
      rating: review.rating,
      text: review.text,
    }))
  }
  return NextResponse.json(response, { headers: rateHeaders(rate) })
}
