import { NextRequest, NextResponse } from 'next/server'
import { getServerById, getServerEngagementSummary, listServerOnlineSamples, recordServerOnlineSample } from '@/lib/auth-db'

interface Context {
  params: { id: string }
}

export async function GET(_request: NextRequest, context: Context) {
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Некоректний ідентифікатор сервера' }, { status: 400 })
  }
  const server = await getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  }
  try {
    const probeResponse = await fetch(`${new URL(_request.url).origin}/api/servers/check`, {
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
    // return existing samples even when probe fails
  }
  const period = _request.nextUrl.searchParams.get('period') || 'day'
  const periodMap: Record<string, { hours: number; bucketMinutes: number }> = {
    day: { hours: 24, bucketMinutes: 15 },
    week: { hours: 24 * 7, bucketMinutes: 60 },
    month: { hours: 24 * 30, bucketMinutes: 180 },
    min_month: { hours: 24 * 30 * 3, bucketMinutes: 360 },
    year: { hours: 24 * 365, bucketMinutes: 24 * 60 },
    min_year: { hours: 24 * 365 * 2, bucketMinutes: 24 * 60 * 2 },
    all: { hours: 24 * 365 * 3, bucketMinutes: 24 * 60 * 7 },
  }
  const selected = periodMap[period] || periodMap.day
  const samples = await listServerOnlineSamples(server.seed, selected.hours)
  const now = new Date()
  const bucketSizeMs = selected.bucketMinutes * 60 * 1000
  const rangeStart = new Date(now.getTime() - selected.hours * 60 * 60 * 1000)
  const bucketMap = new Map<number, { players: number; votes: number; views: number; count: number }>()
  for (const sample of samples) {
    const sampleTime = new Date(sample.recordedAt).getTime()
    if (Number.isNaN(sampleTime)) continue
    const bucketKey = Math.floor(sampleTime / bucketSizeMs) * bucketSizeMs
    const current = bucketMap.get(bucketKey) || { players: 0, votes: 0, views: 0, count: 0 }
    current.players += sample.players
    current.votes += sample.votes
    current.views += sample.views
    current.count += 1
    bucketMap.set(bucketKey, current)
  }
  const points: Array<{ players: number; votes: number; views: number; recordedAt: string }> = []
  let cursor = Math.floor(rangeStart.getTime() / bucketSizeMs) * bucketSizeMs
  const end = Math.floor(now.getTime() / bucketSizeMs) * bucketSizeMs
  let previous = { players: 0, votes: 0, views: 0 }
  while (cursor <= end) {
    const bucket = bucketMap.get(cursor)
    if (bucket && bucket.count > 0) {
      previous = {
        players: Math.round(bucket.players / bucket.count),
        votes: Math.round(bucket.votes / bucket.count),
        views: Math.round(bucket.views / bucket.count),
      }
    }
    points.push({
      players: previous.players,
      votes: previous.votes,
      views: previous.views,
      recordedAt: new Date(cursor).toISOString(),
    })
    cursor += bucketSizeMs
  }
  return NextResponse.json({ samples: points, period })
}
