import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken } from '@/lib/auth-db'
import { createCluster, listClustersByOwner } from '@/lib/cluster-db'

export async function GET(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  return NextResponse.json({ clusters: await listClustersByOwner(auth.user.id) })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  try {
    const body = await request.json() as Record<string, unknown>
    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Вкажіть назву кластера' }, { status: 400 })
    const cluster = await createCluster({
      ownerId: auth.user.id,
      name,
      description: String(body.description || ''),
      logoUrl: body.logoUrl ? String(body.logoUrl) : null,
      bannerUrl: body.bannerUrl ? String(body.bannerUrl) : null,
      website: body.website ? String(body.website) : null,
      discord: body.discord ? String(body.discord) : null,
      serverIds: Array.isArray(body.serverIds) ? body.serverIds.map(Number) : [],
    })
    return NextResponse.json({ cluster }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Не вдалося створити кластер' }, { status: 400 })
  }
}
