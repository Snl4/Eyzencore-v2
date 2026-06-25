import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  backfillViewCountries,
  getAuthSessionFromToken,
  getServerById,
  getServerEngagementSummary,
  getServerDashboardSnapshot,
  recordServerOnlineSample,
  resolveUserRole,
  type DashRange,
} from '@/lib/auth-db'

const VALID_RANGES: DashRange[] = ['24h', '7d', '30d', '90d', 'all']

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Некоректний ідентифікатор сервера' }, { status: 400 })
  }
  const server = await getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  }
  const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  const isAdmin = role === 'ADMIN'
  if (!isAdmin && server.ownerId !== auth.user.id) {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }
  const url = new URL(request.url)
  const requested = String(url.searchParams.get('range') || '7d') as DashRange
  const range: DashRange = VALID_RANGES.includes(requested) ? requested : '7d'
  try {
    try {
      const probeResponse = await fetch(`${new URL(request.url).origin}/api/servers/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addr: server.addr,
          core: server.core || 'java',
          platform: server.platform || 'minecraft',
          allowExisting: true,
        }),
        cache: 'no-store',
      })
      if (probeResponse.ok) {
        const payload = await probeResponse.json() as { probe?: { online?: boolean; players?: number; max?: number } }
        const probe = payload.probe || {}
        const summary = await getServerEngagementSummary(server.seed)
        await recordServerOnlineSample({
          serverId: server.seed,
          online: Boolean(probe.online),
          players: Number(probe.players || 0),
          max: Number(probe.max || 0),
          votes: summary.votes,
          views: summary.views,
        })
      }
    } catch {
      // Keep serving snapshot even if live probe fails
    }
    // Backfill country codes for views that were recorded before geo lookup was wired up.
    // Bounded to 30 rows per request to keep latency low and respect ip-api.com limits.
    try {
      await backfillViewCountries({ serverId: server.seed, limit: 30 })
    } catch {
      // Backfill is best-effort - never block the dashboard response
    }
    const data = await getServerDashboardSnapshot({ serverId, userId: auth.user.id, isAdmin, range })
    return NextResponse.json({
      ...data,
      server: {
        seed: server.seed,
        name: server.name,
        addr: server.addr,
        ic: server.ic,
        avatarUrl: server.avatarUrl,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
