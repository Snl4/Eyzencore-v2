import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'
import { deleteAnimilairProduct, updateAnimilairProduct } from '@/lib/animilair-db'

type RouteContext = { params: { slug: string } }

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  try {
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    const body = await request.json() as {
      title?: string
      category?: string
      shortDesc?: string
      description?: string
      priceFrom?: number | string | null
      deliveryDays?: number | string | null
      coverUrl?: string | null
      tags?: string[] | string
      media?: string[] | string
    }
    const product = await updateAnimilairProduct({
      slugOrId: params.slug,
      user: auth.user,
      role,
      title: String(body.title || ''),
      category: String(body.category || 'design'),
      description: String(body.description || body.shortDesc || ''),
      priceFrom: body.priceFrom ? Number(body.priceFrom) : null,
      deliveryDays: body.deliveryDays ? Number(body.deliveryDays) : null,
      coverUrl: body.coverUrl ? String(body.coverUrl) : null,
      tags: Array.isArray(body.tags)
        ? body.tags
        : String(body.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      media: Array.isArray(body.media)
        ? body.media
        : String(body.media || '').split('\n').map((url) => url.trim()).filter(Boolean),
    })
    return NextResponse.json({ success: true, product })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося оновити товар' },
      { status: 400 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await getAuthSessionFromToken(_request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  try {
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    await deleteAnimilairProduct({ slugOrId: params.slug, user: auth.user, role })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося видалити товар' },
      { status: 400 }
    )
  }
}
