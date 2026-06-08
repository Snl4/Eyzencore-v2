import { NextResponse } from 'next/server'
import { deleteNewsPost, getNewsPostById, resolveUserRole, updateNewsPost, type NewsContentBlock } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'

type NewsParams = {
  params: {
    id: string
  }
}

type UpdateNewsRequestBody = {
  title?: string
  excerpt?: string
  content?: string
  blocks?: NewsContentBlock[]
  category?: string
  coverUrl?: string | null
}

function parseNewsId(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

export async function GET(_request: Request, { params }: NewsParams) {
  const newsId = parseNewsId(params.id)
  if (!newsId) {
    return NextResponse.json({ error: 'Некоректний ID новини' }, { status: 400 })
  }
  const post = getNewsPostById(newsId)
  if (!post) {
    return NextResponse.json({ error: 'Новину не знайдено' }, { status: 404 })
  }
  return NextResponse.json({ post })
}

export async function PATCH(request: Request, { params }: NewsParams) {
  const user = getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const newsId = parseNewsId(params.id)
  if (!newsId) {
    return NextResponse.json({ error: 'Некоректний ID новини' }, { status: 400 })
  }
  const role = resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  const isAdmin = role === 'ADMIN'
  try {
    const body = (await request.json()) as UpdateNewsRequestBody
    const post = updateNewsPost({
      newsId,
      actorUserId: user.id,
      isAdmin,
      title: String(body.title || ''),
      excerpt: String(body.excerpt || ''),
      content: String(body.content || ''),
      blocks: Array.isArray(body.blocks) ? body.blocks : [],
      category: String(body.category || 'Новини'),
      coverUrl: body.coverUrl ?? null,
    })
    return NextResponse.json({ post })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося оновити новину'
    const status = message.includes('доступ заборонено') ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, { params }: NewsParams) {
  const user = getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const newsId = parseNewsId(params.id)
  if (!newsId) {
    return NextResponse.json({ error: 'Некоректний ID новини' }, { status: 400 })
  }
  const role = resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  const isAdmin = role === 'ADMIN'
  try {
    deleteNewsPost({
      newsId,
      actorUserId: user.id,
      isAdmin,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося видалити новину'
    const status = message.includes('доступ заборонено') ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
