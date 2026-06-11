import { NextRequest, NextResponse } from 'next/server'
import { getServerById, listServerOnlineSamples } from '@/lib/auth-db'

type Params = { params: { id: string } }

export async function GET(request: NextRequest, { params }: Params) {
  const serverId = Number(params.id)
  if (isNaN(serverId)) {
    return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  }
  const server = await getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }
  const hours = Math.min(Math.max(1, Number(new URL(request.url).searchParams.get('hours') ?? 24)), 168)
  const samples = await listServerOnlineSamples(server.seed, hours)
  return NextResponse.json({
    server_id: String(server.seed),
    hours,
    samples: samples.map((s) => ({
      players: s.players,
      max: s.max,
      online: s.online,
      recorded_at: s.recordedAt,
    })),
  })
}
