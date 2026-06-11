import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import {
  createForumThread,
  getForumHome,
} from '@/lib/forum-db'

export async function GET(request: Request) {
  const url = new URL(request.url)
  try {
    return NextResponse.json(
      await getForumHome({
        category: url.searchParams.get('category') || '',
        query: url.searchParams.get('query') || '',
        sort: url.searchParams.get('sort') || 'recent',
      })
    )
  } catch (error) {
    console.error('Forum list failed:', error)
    return NextResponse.json(
      { error: 'Не вдалося завантажити форум' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const thread = await createForumThread({
      userId: user.id,
      categoryId: Number(body.categoryId),
      title: String(body.title || ''),
      content: String(body.content || ''),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    })
    return NextResponse.json({ thread }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося створити тему' },
      { status: 400 }
    )
  }
}
