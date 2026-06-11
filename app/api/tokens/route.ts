import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { listApiTokens, createApiToken, getServerById } from '@/lib/auth-db'
import type { ApiTokenScope } from '@/lib/auth-db'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rawServerId = request.nextUrl.searchParams.get('serverId')
  const serverId = rawServerId ? Number(rawServerId) : undefined
  const tokens = await listApiTokens(user.id, Number.isFinite(serverId) ? serverId : undefined)
  return NextResponse.json(tokens)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json() as { name?: string; scopes?: string[]; serverId?: number }
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const serverId = Number(body.serverId)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Server is required' }, { status: 400 })
  }
  const server = await getServerById(serverId)
  const isAdmin = String(user.user_metadata.role || '').toUpperCase() === 'ADMIN'
  if (!server || (!isAdmin && server.ownerId !== user.id)) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }
  const validScopes: ApiTokenScope[] = ['servers:read', 'events:read']
  const scopes = Array.isArray(body.scopes)
    ? (body.scopes.filter((s) => validScopes.includes(s as ApiTokenScope)) as ApiTokenScope[])
    : (['servers:read'] as ApiTokenScope[])
  if (scopes.length === 0) scopes.push('servers:read')
  const result = await createApiToken({ userId: user.id, serverId, name, scopes })
  return NextResponse.json(result, { status: 201 })
}
