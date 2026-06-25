import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'
import { archiveAnimilairOrder, updateAnimilairOrderStatus } from '@/lib/animilair-db'

type Context = {
  params: { id: string }
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }

  const orderId = Number(context.params.id)
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: 'Некоректне замовлення' }, { status: 400 })
  }

  try {
    const body = await request.json() as { status?: string; archived?: boolean }
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    if (body.archived === true) {
      await archiveAnimilairOrder({
        orderId,
        user: auth.user,
        role,
      })
      return NextResponse.json({ success: true })
    }
    const order = await updateAnimilairOrderStatus({
      orderId,
      user: auth.user,
      role,
      status: String(body.status || ''),
    })
    return NextResponse.json({ success: true, order })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося оновити замовлення'
    const friendlyMessage = message.includes('SQLITE_CONSTRAINT_FOREIGNKEY')
      ? 'Не вдалося зберегти службове повідомлення замовлення. Спробуйте ще раз.'
      : message
    return NextResponse.json(
      { error: friendlyMessage },
      { status: 400 }
    )
  }
}
