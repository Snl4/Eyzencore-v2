import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { getServerEvent, listServerEvents, toggleEventAttendance } from '@/lib/server-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: { eventId: string } }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Увійдіть в акаунт, щоб записатися на подію' }, { status: 401 })
  }
  const eventId = Number(context.params.eventId)
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: 'Некоректна подія' }, { status: 400 })
  }
  const event = await getServerEvent(eventId)
  if (!event) {
    return NextResponse.json({ error: 'Подію не знайдено' }, { status: 404 })
  }
  const body = await request.json().catch(() => null) as { reminderEnabled?: boolean } | null
  const result = await toggleEventAttendance({
    eventId,
    user,
    reminderEnabled: body?.reminderEnabled !== false,
  })
  const events = await listServerEvents({ serverId: Number(event.server_id), userId: user.id, limit: 30 })
  return NextResponse.json({ success: true, ...result, events })
}
