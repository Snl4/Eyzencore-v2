import { NextRequest, NextResponse } from 'next/server'
import { getServerById, listServerMetricEvents, listServerOnlineSamples } from '@/lib/auth-db'

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
  const [samples, metricEvents] = await Promise.all([
    listServerOnlineSamples(server.seed, selected.hours),
    listServerMetricEvents(server.seed, selected.hours),
  ])
  const now = new Date()
  const bucketSizeMs = selected.bucketMinutes * 60 * 1000
  const rangeStart = new Date(now.getTime() - selected.hours * 60 * 60 * 1000)
  const bucketMap = new Map<number, { players: number; count: number }>()
  for (const sample of samples) {
    const sampleTime = new Date(sample.recordedAt).getTime()
    if (Number.isNaN(sampleTime)) continue
    const bucketKey = Math.floor(sampleTime / bucketSizeMs) * bucketSizeMs
    const current = bucketMap.get(bucketKey) || { players: 0, count: 0 }
    current.players += sample.players
    current.count += 1
    bucketMap.set(bucketKey, current)
  }
  const voteBucketMap = new Map<number, number>()
  for (const createdAt of metricEvents.votes) {
    const time = new Date(createdAt).getTime()
    if (Number.isNaN(time)) continue
    const bucketKey = Math.floor(time / bucketSizeMs) * bucketSizeMs
    voteBucketMap.set(bucketKey, (voteBucketMap.get(bucketKey) || 0) + 1)
  }
  const viewBucketMap = new Map<number, number>()
  for (const createdAt of metricEvents.views) {
    const time = new Date(createdAt).getTime()
    if (Number.isNaN(time)) continue
    const bucketKey = Math.floor(time / bucketSizeMs) * bucketSizeMs
    viewBucketMap.set(bucketKey, (viewBucketMap.get(bucketKey) || 0) + 1)
  }
  const points: Array<{ players: number; votes: number; views: number; recordedAt: string }> = []
  let cursor = Math.floor(rangeStart.getTime() / bucketSizeMs) * bucketSizeMs
  const end = Math.floor(now.getTime() / bucketSizeMs) * bucketSizeMs
  let previousPlayers = 0
  while (cursor <= end) {
    const bucket = bucketMap.get(cursor)
    if (bucket && bucket.count > 0) {
      previousPlayers = Math.round(bucket.players / bucket.count)
    }
    points.push({
      players: previousPlayers,
      votes: voteBucketMap.get(cursor) || 0,
      views: viewBucketMap.get(cursor) || 0,
      recordedAt: new Date(cursor).toISOString(),
    })
    cursor += bucketSizeMs
  }
  return NextResponse.json({ samples: points, period })
}
