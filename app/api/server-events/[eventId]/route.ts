import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { getServerById, resolveUserRole } from '@/lib/auth-db'
import { deleteServerEvent, getServerEvent, listServerEvents, normalizeEventType, updateServerEvent } from '@/lib/server-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeDate(value: unknown) {
  const date = new Date(String(value || ''))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function requireEventAccess(eventId: number) {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: 'Увійдіть в акаунт' }, { status: 401 }) }

  const event = await getServerEvent(eventId)
  if (!event) return { error: NextResponse.json({ error: 'Подію не знайдено' }, { status: 404 }) }

  const server = await getServerById(Number(event.server_id))
  if (!server) return { error: NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 }) }

  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  if (role !== 'ADMIN' && server.ownerId !== user.id && String(event.owner_id) !== user.id) {
    return { error: NextResponse.json({ error: 'Немає доступу до цієї події' }, { status: 403 }) }
  }

  return { user, event }
}

export async function PATCH(request: Request, context: { params: { eventId: string } }) {
  const eventId = Number(context.params.eventId)
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: 'Некоректна подія' }, { status: 400 })
  }

  const access = await requireEventAccess(eventId)
  if ('error' in access) return access.error

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
  if (!title) return NextResponse.json({ error: 'Вкажіть назву події' }, { status: 400 })
  if (!startsAt) return NextResponse.json({ error: 'Вкажіть дату та час старту' }, { status: 400 })

  await updateServerEvent(eventId, {
    type: normalizeEventType(body?.type),
    title,
    description: String(body?.description || '').trim().slice(0, 1200),
    startsAt,
    endsAt,
    location: String(body?.location || '').trim().slice(0, 120) || null,
    prize: String(body?.prize || '').trim().slice(0, 160) || null,
    imageUrl: String(body?.imageUrl || '').trim().slice(0, 500) || null,
  })

  const events = await listServerEvents({ serverId: Number(access.event.server_id), userId: access.user.id, limit: 30 })
  return NextResponse.json({ success: true, events })
}

export async function DELETE(_request: Request, context: { params: { eventId: string } }) {
  const eventId = Number(context.params.eventId)
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: 'Некоректна подія' }, { status: 400 })
  }

  const access = await requireEventAccess(eventId)
  if ('error' in access) return access.error

  await deleteServerEvent(eventId)
  const events = await listServerEvents({ serverId: Number(access.event.server_id), userId: access.user.id, limit: 30 })
  return NextResponse.json({ success: true, events })
}
