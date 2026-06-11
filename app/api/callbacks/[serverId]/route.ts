import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { getServerById } from '@/lib/auth-db'
import {
  dispatchServerCallback,
  getCallbackSettings,
  listCallbackDeliveries,
  saveCallbackSettings,
  type CallbackAction,
} from '@/lib/callback-api'

type Context = { params: { serverId: string } }
const ACTIONS: CallbackAction[] = ['vote', 'comment', 'like']

async function authorize(serverId: number) {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const server = await getServerById(serverId)
  const isAdmin = String(user.user_metadata.role || '').toUpperCase() === 'ADMIN'
  if (!server || (!isAdmin && server.ownerId !== user.id)) {
    return { error: NextResponse.json({ error: 'Server not found' }, { status: 404 }) }
  }
  return { user, server }
}

function validateUrl(value: string) {
  if (!value) return ''
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Callback URL must use HTTP or HTTPS')
  return parsed.toString()
}

export async function GET(_request: NextRequest, { params }: Context) {
  const serverId = Number(params.serverId)
  if (!Number.isFinite(serverId)) return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  const auth = await authorize(serverId)
  if (auth.error) return auth.error
  const [settings, deliveries] = await Promise.all([
    getCallbackSettings(serverId),
    listCallbackDeliveries(serverId),
  ])
  return NextResponse.json({ settings, deliveries })
}

export async function PUT(request: NextRequest, { params }: Context) {
  const serverId = Number(params.serverId)
  if (!Number.isFinite(serverId)) return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  const auth = await authorize(serverId)
  if (auth.error) return auth.error
  try {
    const body = await request.json() as Record<string, unknown>
    const events = Array.isArray(body.events)
      ? body.events.filter((item): item is CallbackAction => ACTIONS.includes(item as CallbackAction))
      : ACTIONS
    const settings = await saveCallbackSettings(serverId, {
      callbackUrl: validateUrl(String(body.callbackUrl || '').trim()),
      authHeader: String(body.authHeader || 'Authorization').trim().slice(0, 80),
      authToken: String(body.authToken || '').trim().slice(0, 500),
      events,
      isActive: Boolean(body.isActive),
      nuvotifierEnabled: Boolean(body.nuvotifierEnabled),
      nuvotifierHost: String(body.nuvotifierHost || '').trim().slice(0, 255),
      nuvotifierPort: Math.max(1, Math.min(65535, Number(body.nuvotifierPort || 8192))),
      nuvotifierToken: String(body.nuvotifierToken || '').trim().slice(0, 500),
    })
    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid callback settings' }, { status: 400 })
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const serverId = Number(params.serverId)
  if (!Number.isFinite(serverId)) return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  const auth = await authorize(serverId)
  if (auth.error) return auth.error
  const body = await request.json().catch(() => ({})) as { action?: CallbackAction }
  const action = ACTIONS.includes(body.action as CallbackAction) ? body.action as CallbackAction : 'vote'
  const results = await dispatchServerCallback({
    serverId,
    action,
    userId: auth.user.id,
    userNickname: auth.user.user_metadata.full_name || 'Eyzencore Test',
    ipAddress: '127.0.0.1',
    force: true,
  })
  return NextResponse.json({
    success: results.length > 0 && results.every((result) => Boolean((result as { success?: boolean }).success)),
    results,
    deliveries: await listCallbackDeliveries(serverId),
  })
}
