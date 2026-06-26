import dns from 'node:dns/promises'
import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  getAuthSessionFromToken,
  getOrCreateVerificationToken,
  getServerById,
  markServerVerified,
  regenerateVerificationToken,
} from '@/lib/auth-db'
import { resolveDnsVerificationHostname } from '@/lib/server-dns-verify'

interface RouteContext {
  params: { id: string }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) return NextResponse.json({ error: 'Некоректний ідентифікатор' }, { status: 400 })
  const server = await getServerById(serverId)
  if (!server) return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  if (server.ownerId !== auth.user.id && auth.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Немає доступу' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const shouldRegenerate = searchParams.get('regenerate') === '1'
  const verification = shouldRegenerate
    ? await regenerateVerificationToken(serverId, auth.user.id)
    : await getOrCreateVerificationToken(serverId, auth.user.id)
  return NextResponse.json({
    token: verification.token,
    verified: Boolean(server.verified),
    verifiedAt: verification.verifiedAt,
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) return NextResponse.json({ error: 'Некоректний ідентифікатор' }, { status: 400 })
  const server = await getServerById(serverId)
  if (!server) return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  if (server.ownerId !== auth.user.id && auth.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Немає доступу' }, { status: 403 })
  }
  const body = (await request.json()) as { method?: string; hostname?: string }
  const method = body.method
  if (method !== 'motd' && method !== 'dns') {
    return NextResponse.json({ error: 'Метод верифікації: "motd" або "dns"' }, { status: 400 })
  }
  const verification = await getOrCreateVerificationToken(serverId, auth.user.id)
  const token = verification.token
  if (method === 'motd') {
    return verifyViaMOTD({ serverId, addr: server.addr, token })
  }
  return verifyViaDNS({ serverId, addr: server.addr, token, hostname: body.hostname })
}

async function verifyViaMOTD(input: {
  serverId: number
  addr: string
  token: string
}) {
  const { serverId, addr, token } = input
  const host = addr.includes(':') ? addr.split(':')[0] : addr
  const port = addr.includes(':') ? addr.split(':')[1] : '25565'
  try {
    const response = await fetch(`https://api.mcsrvstat.us/3/${host}:${port}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      return NextResponse.json({ error: 'Не вдалося отримати дані сервера. Переконайтесь, що сервер онлайн.' }, { status: 422 })
    }
    const data = (await response.json()) as {
      online?: boolean
      motd?: { raw?: string[] }
      description?: { raw?: string[] }
    }
    if (!data.online) {
      return NextResponse.json({ error: 'Сервер наразі офлайн. Запустіть сервер та спробуйте знову.' }, { status: 422 })
    }
    const motdLines: string[] = [
      ...(data.motd?.raw ?? []),
      ...(data.description?.raw ?? []),
    ]
    const rawMotd = motdLines.join(' ').replace(/§[0-9a-fk-or]/gi, '')
    if (!rawMotd.includes(token)) {
      return NextResponse.json(
        { error: `MOTD не містить рядок верифікації. Поточний MOTD: "${rawMotd.slice(0, 200)}"` },
        { status: 422 }
      )
    }
    await markServerVerified(serverId)
    return NextResponse.json({ success: true, method: 'motd' })
  } catch {
    return NextResponse.json({ error: 'Не вдалося зʼєднатися з API перевірки сервера. Спробуйте пізніше.' }, { status: 503 })
  }
}

async function verifyViaDNS(input: {
  serverId: number
  addr: string
  token: string
  hostname?: string
}) {
  const { serverId, addr, token, hostname } = input
  const resolved = resolveDnsVerificationHostname({ serverAddr: addr, requestedHostname: hostname })
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 422 })
  }
  try {
    const records = await dns.resolveTxt(resolved.hostname)
    const allValues = records.flat().join(' ')
    if (!allValues.includes(token)) {
      return NextResponse.json(
        {
          error: `TXT запис не знайдено на ${resolved.hostname}. Переконайтесь, що DNS запис застосований, та спробуйте знову.`,
        },
        { status: 422 },
      )
    }
    await markServerVerified(serverId)
    return NextResponse.json({ success: true, method: 'dns', hostname: resolved.hostname })
  } catch {
    return NextResponse.json(
      { error: `Не вдалося отримати DNS TXT записи для ${resolved.hostname}. Перевірте домен або спробуйте пізніше.` },
      { status: 503 },
    )
  }
}
