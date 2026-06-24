import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'
import { createAnimilairProductReview, getAnimilairOrderReview } from '@/lib/animilair-db'

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
    const review = await getAnimilairOrderReview(orderId, auth.user, role)
    return NextResponse.json({ review })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося завантажити відгук' },
      { status: 400 }
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
    const body = await request.json() as { rating?: number; body?: string }
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    const review = await createAnimilairProductReview({
      orderId,
      user: auth.user,
      role,
      rating: Number(body.rating),
      body: String(body.body || ''),
    })
    return NextResponse.json({ success: true, review })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося зберегти відгук' },
      { status: 400 }
    )
  }
}
