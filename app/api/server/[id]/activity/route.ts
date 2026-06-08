import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  deleteServerReviewById,
  getAuthSessionFromToken,
  getOwnerServerActivity,
  resolveUserRole,
} from '@/lib/auth-db'

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const auth = getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  }
  const role = resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 20)
    const data = getOwnerServerActivity({
      serverId,
      userId: auth.user.id,
      isAdmin: role === 'ADMIN',
      limit,
    })
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load server activity'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const auth = getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const serverId = Number(context.params.id)
  const reviewId = Number(request.nextUrl.searchParams.get('reviewId') || '')
  if (!Number.isFinite(serverId) || !Number.isFinite(reviewId)) {
    return NextResponse.json({ error: 'Invalid identifier' }, { status: 400 })
  }
  const role = resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  try {
    const result = deleteServerReviewById({
      serverId,
      reviewId,
      userId: auth.user.id,
      isAdmin: role === 'ADMIN',
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete review'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
