import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, getOwnerServerStats, resolveUserRole } from '@/lib/auth-db'

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  }
  const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  try {
    const days = Number(request.nextUrl.searchParams.get('days') || 30)
    const data = await getOwnerServerStats({
      serverId,
      userId: auth.user.id,
      isAdmin: role === 'ADMIN',
      days,
    })
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load server stats'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
