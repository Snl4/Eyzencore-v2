import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { getServerById, resolveUserRole } from '@/lib/auth-db'
import { createServerEvent, listServerEvents, normalizeEventType } from '@/lib/server-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeDate(value: unknown) {
  const date = new Date(String(value || ''))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  const serverId = Number(context.params.id)
  if (!Number.isInteger(serverId) || serverId <= 0) {
    return NextResponse.json({ error: 'Некоректний сервер' }, { status: 400 })
  }
  const server = await getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  }
  const user = await getCurrentUser()
  const events = await listServerEvents({ serverId, userId: user?.id, limit: 30 })
  return NextResponse.json({ events })
}

export async function POST(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Увійдіть в акаунт' }, { status: 401 })
  }
  const serverId = Number(context.params.id)
  if (!Number.isInteger(serverId) || serverId <= 0) {
    return NextResponse.json({ error: 'Некоректний сервер' }, { status: 400 })
  }
  const server = await getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  }
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  if (role !== 'ADMIN' && server.ownerId !== user.id) {
    return NextResponse.json({ error: 'Тільки власник сервера може створювати події' }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as {
    type?: unknown
    title?: unknown
    description?: unknown
    startsAt?: unknown
    endsAt?: unknown
    location?: unknown
    prize?: unknown
    imageUrl?: unknown
  } | null
  const title = String(body?.title || '').trim().slice(0, 90)
  const startsAt = normalizeDate(body?.startsAt)
  const endsAt = body?.endsAt ? normalizeDate(body.endsAt) : null
  if (!title) {
    return NextResponse.json({ error: 'Вкажіть назву події' }, { status: 400 })
  }
  if (!startsAt) {
    return NextResponse.json({ error: 'Вкажіть дату та час старту' }, { status: 400 })
  }
  const eventId = await createServerEvent({
    serverId,
    ownerId: user.id,
    type: normalizeEventType(body?.type),
    title,
    description: String(body?.description || '').trim().slice(0, 1200),
    startsAt,
    endsAt,
    location: String(body?.location || '').trim().slice(0, 120) || null,
    prize: String(body?.prize || '').trim().slice(0, 160) || null,
    imageUrl: String(body?.imageUrl || '').trim().slice(0, 500) || null,
  })
  const events = await listServerEvents({ serverId, userId: user.id, limit: 30 })
  return NextResponse.json({ success: true, eventId, events })
}
