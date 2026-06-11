import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { toggleForumThreadLike } from '@/lib/forum-db'

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const threadId = Number(context.params.id)
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return NextResponse.json({ error: 'Некоректний ID' }, { status: 400 })
  }
  try {
    return NextResponse.json(await toggleForumThreadLike(threadId, user.id))
  } catch {
    return NextResponse.json({ error: 'Тему не знайдено' }, { status: 404 })
  }
}
