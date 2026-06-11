import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { toggleForumPostLike } from '@/lib/forum-db'

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const postId = Number(context.params.id)
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: 'Некоректний ID' }, { status: 400 })
  }
  try {
    return NextResponse.json(await toggleForumPostLike(postId, user.id))
  } catch {
    return NextResponse.json({ error: 'Відповідь не знайдено' }, { status: 404 })
  }
}
