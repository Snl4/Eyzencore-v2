import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ notifications: [] })
  }

  const notifications = await prisma.app_notifications.findMany({
    where: {
      user_id: user.id,
      is_read: 0,
    },
    orderBy: { created_at: 'asc' },
    take: 5,
    select: {
      id: true,
      server_id: true,
      type: true,
      title: true,
      body: true,
      created_at: true,
    },
  })

  return NextResponse.json({
    notifications: notifications.map((item) => ({
      id: item.id,
      serverId: item.server_id,
      type: item.type,
      title: item.title,
      body: item.body,
      createdAt: item.created_at,
    })),
  })
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as { ids?: unknown } | null
  const ids = Array.isArray(body?.ids)
    ? body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0).slice(0, 50)
    : []

  if (ids.length === 0) {
    return NextResponse.json({ success: true, updated: 0 })
  }

  const result = await prisma.app_notifications.updateMany({
    where: {
      id: { in: ids },
      user_id: user.id,
    },
    data: { is_read: 1 },
  })

  return NextResponse.json({ success: true, updated: result.count })
}
