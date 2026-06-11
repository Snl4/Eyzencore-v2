import { createHmac } from 'node:crypto'
import net from 'node:net'
import { prisma } from '@/lib/prisma'
import { buildServerDashboardSlug } from '@/lib/server-slug'

export type CallbackAction = 'vote' | 'comment' | 'like'

export type CallbackPayload = {
  id: number
  user_id: string | null
  created_at: string
  action: CallbackAction
  category: string
  ip_address: string
  user_nickname: string
}

export type CallbackSettingsInput = {
  callbackUrl: string
  authHeader: string
  authToken: string
  events: CallbackAction[]
  isActive: boolean
  nuvotifierEnabled: boolean
  nuvotifierHost: string
  nuvotifierPort: number
  nuvotifierToken: string
}

const DEFAULT_EVENTS: CallbackAction[] = ['vote', 'comment', 'like']

function parseEvents(value: string): CallbackAction[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is CallbackAction => DEFAULT_EVENTS.includes(item))
      : DEFAULT_EVENTS
  } catch {
    return DEFAULT_EVENTS
  }
}

function publicSettings(row: {
  callback_url: string
  auth_header: string
  auth_token: string
  events_json: string
  is_active: number
  nuvotifier_enabled: number
  nuvotifier_host: string
  nuvotifier_port: number
  nuvotifier_token: string
}) {
  return {
    callbackUrl: row.callback_url,
    authHeader: row.auth_header,
    authToken: row.auth_token,
    events: parseEvents(row.events_json),
    isActive: Boolean(row.is_active),
    nuvotifierEnabled: Boolean(row.nuvotifier_enabled),
    nuvotifierHost: row.nuvotifier_host,
    nuvotifierPort: row.nuvotifier_port,
    nuvotifierToken: row.nuvotifier_token,
  }
}

export async function getCallbackSettings(serverId: number) {
  const row = await prisma.app_server_callbacks.findUnique({ where: { server_id: serverId } })
  return row
    ? publicSettings(row)
    : {
      callbackUrl: '',
      authHeader: 'Authorization',
      authToken: '',
      events: DEFAULT_EVENTS,
      isActive: false,
      nuvotifierEnabled: false,
      nuvotifierHost: '',
      nuvotifierPort: 8192,
      nuvotifierToken: '',
    }
}

export async function saveCallbackSettings(serverId: number, input: CallbackSettingsInput) {
  const timestamp = new Date().toISOString()
  const data = {
    callback_url: input.callbackUrl,
    auth_header: input.authHeader,
    auth_token: input.authToken,
    events_json: JSON.stringify(input.events),
    is_active: input.isActive ? 1 : 0,
    nuvotifier_enabled: input.nuvotifierEnabled ? 1 : 0,
    nuvotifier_host: input.nuvotifierHost,
    nuvotifier_port: input.nuvotifierPort,
    nuvotifier_token: input.nuvotifierToken,
    updated_at: timestamp,
  }
  const row = await prisma.app_server_callbacks.upsert({
    where: { server_id: serverId },
    create: { server_id: serverId, created_at: timestamp, ...data },
    update: data,
  })
  return publicSettings(row)
}

export async function listCallbackDeliveries(serverId: number, limit = 20) {
  const rows = await prisma.app_callback_deliveries.findMany({
    where: { server_id: serverId },
    orderBy: { created_at: 'desc' },
    take: Math.max(1, Math.min(limit, 100)),
  })
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    destination: row.destination,
    status: row.status,
    statusCode: row.status_code,
    error: row.error_message,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
  }))
}

function normalizeHeaderName(value: string) {
  const header = value.trim()
  return /^[A-Za-z0-9-]{1,80}$/.test(header) ? header : 'Authorization'
}

async function sendHttpCallback(input: {
  eventId: number
  callbackId: number
  serverId: number
  url: string
  authHeader: string
  authToken: string
  payload: CallbackPayload
}) {
  const delivery = await prisma.app_callback_deliveries.create({
    data: {
      event_id: input.eventId,
      callback_id: input.callbackId,
      server_id: input.serverId,
      action: input.payload.action,
      destination: input.url,
      payload_json: JSON.stringify(input.payload),
      created_at: new Date().toISOString(),
    },
  })
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'Eyzencore-Callback/1.0' }
    if (input.authToken) headers[normalizeHeaderName(input.authHeader)] = input.authToken
    const response = await fetch(input.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input.payload),
      signal: controller.signal,
      redirect: 'error',
      cache: 'no-store',
    }).finally(() => clearTimeout(timeout))
    const responseExcerpt = (await response.text()).slice(0, 500)
    await prisma.app_callback_deliveries.update({
      where: { id: delivery.id },
      data: {
        status: response.ok ? 'delivered' : 'failed',
        status_code: response.status,
        response_excerpt: responseExcerpt,
        error_message: response.ok ? null : `HTTP ${response.status}`,
        delivered_at: new Date().toISOString(),
      },
    })
    return { success: response.ok, statusCode: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Callback request failed'
    await prisma.app_callback_deliveries.update({
      where: { id: delivery.id },
      data: { status: 'failed', error_message: message.slice(0, 500), delivered_at: new Date().toISOString() },
    })
    return { success: false, error: message }
  }
}

export function sendNuVotifierVote(input: {
  host: string
  port: number
  token: string
  username: string
  address: string
  serviceName?: string
}) {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      socket.destroy()
      if (error) reject(error)
      else resolve()
    }
    const socket = net.createConnection({ host: input.host, port: input.port })
    socket.setTimeout(5000, () => finish(new Error('NuVotifier connection timed out')))
    socket.once('error', (error) => finish(error))
    socket.once('data', (headerBuffer) => {
      const header = headerBuffer.toString()
      const parts = header.trim().split(/\s+/)
      if (parts.length < 3 || parts[0] !== 'VOTIFIER' || parts[1] !== '2') {
        finish(new Error('Remote server does not support NuVotifier v2'))
        return
      }
      const vote = {
        username: input.username,
        address: input.address || '0.0.0.0',
        timestamp: Date.now(),
        serviceName: input.serviceName || 'Eyzencore',
        challenge: parts[2],
      }
      const payload = JSON.stringify(vote)
      const message = JSON.stringify({
        payload,
        signature: createHmac('sha256', input.token).update(payload).digest('base64'),
      })
      const packet = Buffer.alloc(Buffer.byteLength(message) + 4)
      packet.writeUInt16BE(0x733a, 0)
      packet.writeUInt16BE(Buffer.byteLength(message), 2)
      packet.write(message, 4)
      socket.write(packet)
      socket.once('data', (responseBuffer) => {
        try {
          const response = JSON.parse(responseBuffer.toString()) as { status?: string; cause?: string; errorMessage?: string }
          if (response.status === 'error') {
            finish(new Error(`${response.cause || 'NuVotifier error'}: ${response.errorMessage || 'unknown error'}`))
          } else {
            finish()
          }
        } catch {
          finish(new Error('Invalid NuVotifier response'))
        }
      })
    })
  })
}

async function sendNuVotifierDelivery(input: {
  eventId: number
  callbackId: number
  serverId: number
  host: string
  port: number
  token: string
  payload: CallbackPayload
}) {
  const destination = `${input.host}:${input.port}`
  const delivery = await prisma.app_callback_deliveries.create({
    data: {
      event_id: input.eventId,
      callback_id: input.callbackId,
      server_id: input.serverId,
      action: input.payload.action,
      destination,
      payload_json: JSON.stringify(input.payload),
      created_at: new Date().toISOString(),
    },
  })
  try {
    await sendNuVotifierVote({
      host: input.host,
      port: input.port,
      token: input.token,
      username: input.payload.user_nickname,
      address: input.payload.ip_address,
    })
    await prisma.app_callback_deliveries.update({
      where: { id: delivery.id },
      data: { status: 'delivered', delivered_at: new Date().toISOString() },
    })
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NuVotifier delivery failed'
    await prisma.app_callback_deliveries.update({
      where: { id: delivery.id },
      data: { status: 'failed', error_message: message.slice(0, 500), delivered_at: new Date().toISOString() },
    })
    return { success: false, error: message }
  }
}

export async function dispatchServerCallback(input: {
  serverId: number
  action: CallbackAction
  userId?: string | null
  userNickname: string
  ipAddress?: string
  force?: boolean
}) {
  const [settings, server, callbackUser] = await Promise.all([
    prisma.app_server_callbacks.findUnique({ where: { server_id: input.serverId } }),
    prisma.app_servers.findUnique({ where: { id: input.serverId } }),
    input.userId
      ? prisma.app_users.findUnique({ where: { id: input.userId }, select: { discord_user_id: true } })
      : Promise.resolve(null),
  ])
  if (!settings || !server) return []
  const events = parseEvents(settings.events_json)
  if (!input.force && (!settings.is_active || !events.includes(input.action))) return []

  const base = {
    user_id: callbackUser?.discord_user_id || input.userId || null,
    created_at: new Date().toISOString(),
    action: input.action,
    category: buildServerDashboardSlug(server.name),
    ip_address: input.ipAddress || '0.0.0.0',
    user_nickname: input.userNickname || 'Guest',
  }
  const event = await prisma.app_callback_events.create({
    data: { server_id: server.id, action: input.action, payload_json: '{}', created_at: base.created_at },
  })
  const payload: CallbackPayload = { id: event.id, ...base }
  await prisma.app_callback_events.update({
    where: { id: event.id },
    data: { payload_json: JSON.stringify(payload) },
  })
  const jobs: Array<Promise<unknown>> = []
  if (settings.callback_url) {
    jobs.push(sendHttpCallback({
      eventId: event.id,
      callbackId: settings.id,
      serverId: server.id,
      url: settings.callback_url,
      authHeader: settings.auth_header,
      authToken: settings.auth_token,
      payload,
    }))
  }
  if (input.action === 'vote' && settings.nuvotifier_enabled && settings.nuvotifier_host && settings.nuvotifier_token) {
    jobs.push(sendNuVotifierDelivery({
      eventId: event.id,
      callbackId: settings.id,
      serverId: server.id,
      host: settings.nuvotifier_host,
      port: settings.nuvotifier_port,
      token: settings.nuvotifier_token,
      payload,
    }))
  }
  return Promise.all(jobs)
}
