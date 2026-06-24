import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'
import { addAnimilairMessage, getAnimilairMessages, type AnimilairMessageAttachment } from '@/lib/animilair-db'

type Context = {
  params: { id: string }
}

export async function GET(request: NextRequest, context: Context) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const orderId = Number(context.params.id)
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: 'Некоректне замовлення' }, { status: 400 })
  }
  try {
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    const messages = await getAnimilairMessages(orderId, auth.user, role)
    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Немає доступу' },
      { status: 403 }
    )
  }
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const orderId = Number(context.params.id)
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: 'Некоректне замовлення' }, { status: 400 })
  }
  try {
    const body = await request.json() as {
      body?: string
      attachments?: AnimilairMessageAttachment[]
    }
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    const messages = await addAnimilairMessage({
      orderId,
      user: auth.user,
      role,
      body: String(body.body || ''),
      attachments: body.attachments,
    })
    return NextResponse.json({ success: true, messages })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося надіслати повідомлення' },
      { status: 400 }
    )
  }
}
