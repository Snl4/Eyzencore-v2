import { NextRequest, NextResponse } from 'next/server'
import { listServers } from '@/lib/auth-db'
import { buildServerDashboardSlug } from '@/lib/server-slug'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')
  const ver = searchParams.get('ver')
  const query = searchParams.get('q')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(Math.max(1, Number(searchParams.get('limit') ?? 20)), 100)

  let results = await listServers()

  if (mode && mode !== 'all') results = results.filter((s) => s.mode === mode)
  if (ver && ver !== 'all') results = results.filter((s) => s.ver.includes(ver.replace('.x', '')))
  if (query) {
    const q = query.toLowerCase()
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.addr.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q)
    )
  }

  const total = results.length
  const offset = (page - 1) * limit
  const data = results.slice(offset, offset + limit).map((s) => ({
    id: String(s.seed),
    name: s.name,
    slug: buildServerDashboardSlug(s.name),
    addr: s.addr,
    game_edition: s.core ?? 'java',
    regions: [s.country?.toLowerCase() || 'global'],
    is_verified: s.verified,
    last_online_players: s.players,
    last_max_players: s.max,
    last_version: s.ver,
    online_state: s.on ? 'live' : 'offline',
    trust_state: s.verified ? 'verified' : 'unverified',
    mode: s.mode,
    tags: s.tags ?? [],
    created_at: s.createdAt ?? null,
  }))

  return NextResponse.json({ data, total, page, limit, pages: Math.ceil(total / limit) })
}
