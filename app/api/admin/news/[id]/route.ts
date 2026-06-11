import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, deleteNewsPost } from '@/lib/auth-db'

type Params = { params: { id: string } }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const newsId = Number(params.id)
  if (isNaN(newsId)) {
    return NextResponse.json({ error: 'Invalid news id' }, { status: 400 })
  }
  const result = await deleteNewsPost({ newsId, actorUserId: user.id, isAdmin: true })
  return NextResponse.json(result)
}
