import { NextResponse } from 'next/server'
import { getNewsPostById } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import {
  buildNewsViewFingerprint,
  getNewsEngagement,
  getNewsRequestIp,
  recordNewsView,
} from '@/lib/news-engagement'

type NewsParams = {
  params: {
    id: string
  }
}

function parseNewsId(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

async function assertNewsExists(newsId: number) {
  const post = await getNewsPostById(newsId)
  return Boolean(post)
}

export async function GET(_request: Request, { params }: NewsParams) {
  const newsId = parseNewsId(params.id)
  if (!newsId || !(await assertNewsExists(newsId))) {
    return NextResponse.json({ error: 'Новину не знайдено' }, { status: 404 })
  }
  const user = await getCurrentUser()
  const engagement = await getNewsEngagement(newsId, user?.id)
  return NextResponse.json({ engagement })
}

export async function POST(request: Request, { params }: NewsParams) {
  const newsId = parseNewsId(params.id)
  if (!newsId || !(await assertNewsExists(newsId))) {
    return NextResponse.json({ error: 'Новину не знайдено' }, { status: 404 })
  }
  const user = await getCurrentUser()
  const ipAddress = getNewsRequestIp(request)
  const userAgent = request.headers.get('user-agent')
  await recordNewsView({
    newsId,
    userId: user?.id,
    fingerprint: buildNewsViewFingerprint({
      userId: user?.id,
      ipAddress,
      userAgent,
    }),
    ipAddress,
    userAgent,
  })
  const engagement = await getNewsEngagement(newsId, user?.id)
  return NextResponse.json({ engagement })
}
