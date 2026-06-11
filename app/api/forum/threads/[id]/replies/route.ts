import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createForumReply } from '@/lib/forum-db'

export async function POST(
  request: Request,
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
    const body = await request.json()
    const reply = await createForumReply({
      threadId,
      userId: user.id,
      content: String(body.content || ''),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    })
    return NextResponse.json({ reply }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося відповісти' },
      { status: 400 }
    )
  }
}
