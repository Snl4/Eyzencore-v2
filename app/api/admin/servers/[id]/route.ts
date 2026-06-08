import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, verifyServerById, deleteServerById } from '@/lib/auth-db'

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const user = getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const serverId = Number(params.id)
  if (isNaN(serverId)) {
    return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  }
  const body = await request.json() as { verified?: boolean }
  if (typeof body.verified === 'boolean') {
    const result = verifyServerById(serverId, body.verified)
    return NextResponse.json(result)
  }
  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
}

export function DELETE(_request: NextRequest, { params }: Params): NextResponse {
  const user = getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const serverId = Number(params.id)
  if (isNaN(serverId)) {
    return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  }
  const result = deleteServerById({ serverId, userId: user.id, isAdmin: true })
  return NextResponse.json(result)
}
