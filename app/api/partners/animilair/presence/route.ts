import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken } from '@/lib/auth-db'
import { getAnimilairAuthorPresence } from '@/lib/animilair-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authorUserId = request.nextUrl.searchParams.get('authorUserId')
  if (!authorUserId) {
    return NextResponse.json({ error: 'authorUserId обовʼязковий' }, { status: 400 })
  }
  const presence = await getAnimilairAuthorPresence(authorUserId)
  return NextResponse.json(presence)
}

export async function POST(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const { touchAnimilairAuthorPresence } = await import('@/lib/animilair-db')
  await touchAnimilairAuthorPresence(auth.user.id)
  return NextResponse.json({ success: true })
}
