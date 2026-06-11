import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import {
  deleteForumReply,
  updateForumReply,
} from '@/lib/forum-db'

type Context = { params: { id: string } }

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  try {
    const body = await request.json()
    await updateForumReply({
      postId: Number(context.params.id),
      userId: user.id,
      role: user.user_metadata.role,
      content: String(body.content || ''),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося оновити відповідь'
    return NextResponse.json(
      { error: message },
      { status: message.includes('прав') ? 403 : 400 }
    )
  }
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  try {
    await deleteForumReply({
      postId: Number(context.params.id),
      userId: user.id,
      role: user.user_metadata.role,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося видалити відповідь'
    return NextResponse.json(
      { error: message },
      { status: message.includes('прав') ? 403 : 400 }
    )
  }
}
