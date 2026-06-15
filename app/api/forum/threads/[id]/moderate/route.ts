import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { moderateForumThread } from '@/lib/forum-db'

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const threadId = Number(context.params.id)
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  if (
    !Number.isInteger(threadId) ||
    threadId <= 0 ||
    !['pin', 'lock', 'solve', 'delete'].includes(action)
  ) {
    return NextResponse.json({ error: 'Некоректний запит' }, { status: 400 })
  }
  try {
    return NextResponse.json(
      await moderateForumThread({
        threadId,
        userId: user.id,
        role: user.user_metadata.role,
        action: action as 'pin' | 'lock' | 'solve' | 'delete',
        reason: String(body.reason || ''),
      })
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося виконати дію'
    return NextResponse.json(
      { error: message },
      { status: message.includes('прав') ? 403 : 400 }
    )
  }
}
