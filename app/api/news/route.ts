import { NextResponse } from 'next/server'
import { createNewsPost, listNewsPosts, resolveUserRole, type NewsContentBlock } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'

type CreateNewsRequestBody = {
  title?: string
  excerpt?: string
  content?: string
  blocks?: NewsContentBlock[]
  category?: string
  coverUrl?: string | null
}

export async function GET() {
  const posts = await listNewsPosts(50)
  return NextResponse.json({ posts })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  if (role !== 'OWNER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Створювати новини можуть лише OWNER або ADMIN' }, { status: 403 })
  }
  try {
    const body = (await request.json()) as CreateNewsRequestBody
    const createdPost = await createNewsPost({
      authorUserId: user.id,
      title: String(body.title || ''),
      excerpt: String(body.excerpt || ''),
      content: String(body.content || ''),
      blocks: Array.isArray(body.blocks) ? body.blocks : [],
      category: String(body.category || 'Новини'),
      coverUrl: body.coverUrl ?? null,
    })
    return NextResponse.json({ post: createdPost }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося створити новину'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
