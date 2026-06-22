import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { addEventComment, getServerEvent, listServerEvents } from '@/lib/server-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: { eventId: string } }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Увійдіть в акаунт, щоб коментувати' }, { status: 401 })
  }
  const eventId = Number(context.params.eventId)
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: 'Некоректна подія' }, { status: 400 })
  }
  const event = await getServerEvent(eventId)
  if (!event) {
    return NextResponse.json({ error: 'Подію не знайдено' }, { status: 404 })
  }
  const body = await request.json().catch(() => null) as { text?: unknown } | null
  const text = String(body?.text || '').trim().slice(0, 600)
  if (text.length < 2) {
    return NextResponse.json({ error: 'Коментар занадто короткий' }, { status: 400 })
  }
  await addEventComment({ eventId, userId: user.id, text })
  const events = await listServerEvents({ serverId: Number(event.server_id), userId: user.id, limit: 30 })
  return NextResponse.json({ success: true, events })
}
