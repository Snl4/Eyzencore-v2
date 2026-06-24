import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'
import { updateAnimilairOrderStatus } from '@/lib/animilair-db'

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
    const body = await request.json() as { status?: string }
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    const order = await updateAnimilairOrderStatus({
      orderId,
      user: auth.user,
      role,
      status: String(body.status || ''),
    })
    return NextResponse.json({ success: true, order })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося оновити замовлення' },
      { status: 400 }
    )
  }
}
