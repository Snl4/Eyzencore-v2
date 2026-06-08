import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, updateUserRoleById, deleteUserById } from '@/lib/auth-db'
import type { UserRole } from '@/lib/auth-db'

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const user = getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json() as { role?: string }
  const validRoles: UserRole[] = ['USER', 'OWNER', 'ADMIN']
  if (!body.role || !validRoles.includes(body.role as UserRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  const result = updateUserRoleById(params.id, body.role as UserRole)
  return NextResponse.json(result)
}

export function DELETE(_request: NextRequest, { params }: Params): NextResponse {
  const user = getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (params.id === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }
  const result = deleteUserById(params.id)
  return NextResponse.json(result)
}
