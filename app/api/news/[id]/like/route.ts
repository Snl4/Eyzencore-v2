import { NextResponse } from 'next/server'
import { getNewsPostById } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { getNewsEngagement, toggleNewsLike } from '@/lib/news-engagement'

type NewsParams = {
  params: {
    id: string
  }
}

function parseNewsId(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function POST(_request: Request, { params }: NewsParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібно увійти в акаунт' }, { status: 401 })
  }
  const newsId = parseNewsId(params.id)
  if (!newsId || !(await getNewsPostById(newsId))) {
    return NextResponse.json({ error: 'Новину не знайдено' }, { status: 404 })
  }
  await toggleNewsLike(newsId, user.id)
  const engagement = await getNewsEngagement(newsId, user.id)
  return NextResponse.json({ engagement })
}
