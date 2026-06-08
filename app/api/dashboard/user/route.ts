import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, getUserDashboard } from '@/lib/auth-db'

export async function GET(request: NextRequest) {
  const auth = getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  try {
    const data = getUserDashboard(auth.user.id)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load user dashboard'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
