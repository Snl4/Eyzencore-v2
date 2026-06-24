import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'
import { createAnimilairOrder, ensureAnimilairCustomerOrder, getAnimilairOrders } from '@/lib/animilair-db'

export async function GET(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  const orders = await getAnimilairOrders(auth.user, role)
  return NextResponse.json({ orders })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Увійдіть в акаунт, щоб створити замовлення' }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      productId?: number
      title?: string
      brief?: string
      budget?: string
      deadline?: string | null
      contact?: string
      ensure?: boolean
    }
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    const order = body.ensure
      ? await ensureAnimilairCustomerOrder({
          productId: Number(body.productId || 0),
          user: auth.user,
          role,
        })
      : await createAnimilairOrder({
          productId: Number(body.productId || 0),
          user: auth.user,
          title: String(body.title || ''),
          brief: String(body.brief || ''),
          budget: String(body.budget || ''),
          deadline: body.deadline ? String(body.deadline) : null,
          contact: String(body.contact || ''),
        })
    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося створити замовлення' },
      { status: 400 }
    )
  }
}
