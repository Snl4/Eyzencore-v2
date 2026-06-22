import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  createServerReferralLink,
  disableServerReferralLink,
  getAuthSessionFromToken,
  listServerReferralLinks,
  resolveUserRole,
} from '@/lib/auth-db'

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  try {
    const referrals = await listServerReferralLinks({
      serverId,
      userId: auth.user.id,
      isAdmin: role === 'ADMIN',
    })
    return NextResponse.json({ referrals })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load referral links'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  const body = await request.json().catch(() => ({})) as { label?: string; code?: string; channel?: string }
  try {
    const referral = await createServerReferralLink({
      serverId,
      userId: auth.user.id,
      isAdmin: role === 'ADMIN',
      label: body.label || '',
      code: body.code || '',
      channel: body.channel || 'custom',
    })
    return NextResponse.json({ referral }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create referral link'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const serverId = Number(context.params.id)
  const referralId = Number(request.nextUrl.searchParams.get('referralId') || '')
  if (!Number.isFinite(serverId) || !Number.isFinite(referralId)) {
    return NextResponse.json({ error: 'Invalid identifier' }, { status: 400 })
  }
  const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  try {
    const result = await disableServerReferralLink({
      serverId,
      referralId,
      userId: auth.user.id,
      isAdmin: role === 'ADMIN',
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete referral link'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
