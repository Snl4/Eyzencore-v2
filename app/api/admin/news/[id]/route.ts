import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, deleteNewsPost } from '@/lib/auth-db'

type Params = { params: { id: string } }

export function DELETE(_request: NextRequest, { params }: Params): NextResponse {
  const user = getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const newsId = Number(params.id)
  if (isNaN(newsId)) {
    return NextResponse.json({ error: 'Invalid news id' }, { status: 400 })
  }
  const result = deleteNewsPost({ newsId, actorUserId: user.id, isAdmin: true })
  return NextResponse.json(result)
}
