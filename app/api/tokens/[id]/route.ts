import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { revokeApiToken } from '@/lib/auth-db'

type Params = { params: { id: string } }

export function DELETE(_request: NextRequest, { params }: Params): NextResponse {
  const user = getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = revokeApiToken(params.id, user.id)
  return NextResponse.json(result)
}
