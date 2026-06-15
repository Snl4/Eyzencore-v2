import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import {
  deleteForumThread,
  getForumThread,
  updateForumThread,
} from '@/lib/forum-db'

type Context = { params: { id: string } }

function parseId(value: string) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(request: Request, context: Context) {
  const threadId = parseId(context.params.id)
  if (!threadId) {
    return NextResponse.json({ error: 'Некоректний ID' }, { status: 400 })
  }
  const user = await getCurrentUser()
  const url = new URL(request.url)
  const thread = await getForumThread(
    threadId,
    user?.id,
    user?.user_metadata.role,
    url.searchParams.get('view') === '1'
  )
  if (!thread) {
    return NextResponse.json({ error: 'Тему не знайдено' }, { status: 404 })
  }
  return NextResponse.json({ thread })
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const threadId = parseId(context.params.id)
  if (!threadId) {
    return NextResponse.json({ error: 'Некоректний ID' }, { status: 400 })
  }
  try {
    const body = await request.json()
    await updateForumThread({
      threadId,
      userId: user.id,
      role: user.user_metadata.role,
      categoryId: Number(body.categoryId) || undefined,
      title: String(body.title || ''),
      content: String(body.content || ''),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося оновити тему'
    return NextResponse.json(
      { error: message },
      { status: message.includes('прав') ? 403 : 400 }
    )
  }
}

export async function DELETE(request: Request, context: Context) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const threadId = parseId(context.params.id)
  if (!threadId) {
    return NextResponse.json({ error: 'Некоректний ID' }, { status: 400 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    await deleteForumThread({
      threadId,
      userId: user.id,
      role: user.user_metadata.role,
      reason: String(body.reason || ''),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося видалити тему'
    return NextResponse.json(
      { error: message },
      { status: message.includes('прав') ? 403 : 400 }
    )
  }
}
