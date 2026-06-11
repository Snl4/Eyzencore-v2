import { NextResponse } from 'next/server'
import {
  authenticateCmsAdmin,
  createCmsSession,
} from '@/lib/auth-db'
import { setCmsSessionCookie } from '@/lib/cms-auth'
import { CMS_SESSION_MAX_AGE_SECONDS } from '@/lib/constants'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '')
  const password = String(body.password || '')
  const user = await authenticateCmsAdmin(email, password)

  if (!user) {
    return NextResponse.json(
      { error: 'Невірні дані або немає прав адміністратора' },
      { status: 401 }
    )
  }

  const session = await createCmsSession(
    user.id,
    CMS_SESSION_MAX_AGE_SECONDS,
    request.headers.get('user-agent')
  )
  const response = NextResponse.json({ user })
  setCmsSessionCookie(response, session.token)
  return response
}
