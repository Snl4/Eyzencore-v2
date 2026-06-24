import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'
import { getAnimilairHeroDescription, updateAnimilairHeroDescription } from '@/lib/animilair-db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const description = await getAnimilairHeroDescription()
  return NextResponse.json({ description })
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  try {
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    const body = await request.json() as { description?: string }
    const description = await updateAnimilairHeroDescription({
      user: auth.user,
      role,
      description: String(body.description || ''),
    })
    return NextResponse.json({ success: true, description })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося зберегти опис' },
      { status: 400 }
    )
  }
}
