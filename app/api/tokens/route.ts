import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { listApiTokens, createApiToken } from '@/lib/auth-db'
import type { ApiTokenScope } from '@/lib/auth-db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tokens = await listApiTokens(user.id)
  return NextResponse.json(tokens)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json() as { name?: string; scopes?: string[] }
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const validScopes: ApiTokenScope[] = ['servers:read', 'events:read']
  const scopes = Array.isArray(body.scopes)
    ? (body.scopes.filter((s) => validScopes.includes(s as ApiTokenScope)) as ApiTokenScope[])
    : (['servers:read'] as ApiTokenScope[])
  if (scopes.length === 0) scopes.push('servers:read')
  const result = await createApiToken({ userId: user.id, name, scopes })
  return NextResponse.json(result, { status: 201 })
}
