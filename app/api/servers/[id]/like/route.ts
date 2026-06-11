import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, buildActorFingerprint, getAuthSessionFromToken, getServerById } from '@/lib/auth-db'
import { dispatchServerCallback } from '@/lib/callback-api'
import { prisma } from '@/lib/prisma'

type Context = { params: { id: string } }

async function actorContext(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  const forwarded = request.headers.get('x-forwarded-for') || ''
  const ipAddress = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
  const fingerprint = await buildActorFingerprint({ ip: ipAddress, userAgent: request.headers.get('user-agent') || '' })
  return { auth, ipAddress, fingerprint: auth ? `user:${auth.user.id}` : fingerprint }
}

export async function GET(request: NextRequest, { params }: Context) {
  const serverId = Number(params.id)
  if (!Number.isFinite(serverId)) return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  const actor = await actorContext(request)
  const existing = await prisma.app_server_likes.findFirst({
    where: actor.auth
      ? { server_id: serverId, OR: [{ user_id: actor.auth.user.id }, { fingerprint: actor.fingerprint }] }
      : { server_id: serverId, fingerprint: actor.fingerprint },
    select: { id: true },
  })
  return NextResponse.json({
    liked: Boolean(existing),
    likes: await prisma.app_server_likes.count({ where: { server_id: serverId } }),
  })
}

export async function POST(request: NextRequest, { params }: Context) {
  const serverId = Number(params.id)
  if (!Number.isFinite(serverId)) return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  const server = await getServerById(serverId)
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })

  const actor = await actorContext(request)
  const auth = actor.auth
  const ipAddress = actor.ipAddress
  const actorFingerprint = actor.fingerprint
  const existing = await prisma.app_server_likes.findFirst({
    where: auth
      ? { server_id: serverId, OR: [{ user_id: auth.user.id }, { fingerprint: actorFingerprint }] }
      : { server_id: serverId, fingerprint: actorFingerprint },
  })
  if (existing) {
    await prisma.app_server_likes.delete({ where: { id: existing.id } })
  } else {
    const nickname = auth?.user.user_metadata.full_name || 'Guest'
    await prisma.app_server_likes.create({
      data: {
        server_id: serverId,
        user_id: auth?.user.id || null,
        fingerprint: actorFingerprint,
        author_name: nickname,
        created_at: new Date().toISOString(),
      },
    })
    await dispatchServerCallback({
      serverId,
      action: 'like',
      userId: auth?.user.id,
      userNickname: nickname,
      ipAddress,
    })
  }
  return NextResponse.json({
    liked: !existing,
    likes: await prisma.app_server_likes.count({ where: { server_id: serverId } }),
  })
}
