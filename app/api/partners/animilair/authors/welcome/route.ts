import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'
import { updateAnimilairAuthorWelcome } from '@/lib/animilair-db'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  try {
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    const body = await request.json() as { authorId?: number; welcomeMessage?: string }
    const authorId = Number(body.authorId || 0)
    if (!authorId) {
      return NextResponse.json({ error: 'authorId обовʼязковий' }, { status: 400 })
    }
    const author = await updateAnimilairAuthorWelcome({
      user: auth.user,
      role,
      authorId,
      welcomeMessage: String(body.welcomeMessage || ''),
    })
    return NextResponse.json({ success: true, author })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося зберегти вітання' },
      { status: 400 }
    )
  }
}
