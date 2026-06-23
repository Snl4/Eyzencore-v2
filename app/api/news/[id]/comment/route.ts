import { NextResponse } from 'next/server'
import { getNewsPostById } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { getNewsEngagement, saveNewsComment } from '@/lib/news-engagement'

type NewsParams = {
  params: {
    id: string
  }
}

type CommentBody = {
  text?: string
}

function parseNewsId(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function POST(request: Request, { params }: NewsParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібно увійти в акаунт' }, { status: 401 })
  }
  const newsId = parseNewsId(params.id)
  if (!newsId || !(await getNewsPostById(newsId))) {
    return NextResponse.json({ error: 'Новину не знайдено' }, { status: 404 })
  }
  try {
    const body = (await request.json()) as CommentBody
    await saveNewsComment(newsId, user.id, body.text)
    const engagement = await getNewsEngagement(newsId, user.id)
    return NextResponse.json({ engagement })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося зберегти повідомлення'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
