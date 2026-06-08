import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  createOwnerNotification,
  getAuthSessionFromToken,
  getServerById,
  registerAuthenticatedServerVote,
  registerServerNicknameVote,
} from '@/lib/auth-db'

const NICKNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/
const MAX_VOTES_PER_IP_PER_DAY = 5

function normalizeNickname(value: string): string {
  return String(value || '').trim().toLowerCase()
}

function isValidNickname(value: string): boolean {
  return NICKNAME_PATTERN.test(value)
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { serverId?: string | number; nickname?: string }
  const serverId = Number(body.serverId)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Некоректний serverId' }, { status: 400 })
  }
  const server = getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  }
  const normalizedNickname = normalizeNickname(String(body.nickname || ''))
  if (!isValidNickname(normalizedNickname)) {
    return NextResponse.json({ error: 'Нікнейм має бути 3-16 символів і містити лише літери, цифри та _' }, { status: 400 })
  }
  const auth = getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (auth) {
    const authVoteResult = registerAuthenticatedServerVote({
      serverId,
      userId: auth.user.id,
      nickname: normalizedNickname,
      cooldownHours: 24,
    })
    if (!authVoteResult.success && authVoteResult.reason === 'cooldown') {
      const remainingHours = Math.max(1, Math.ceil((new Date(authVoteResult.nextVoteAt).getTime() - Date.now()) / (60 * 60 * 1000)))
      return NextResponse.json(
        {
          error: `You can vote again in ${remainingHours} hour(s)`,
          cooldown: {
            active: true,
            nextVoteAt: authVoteResult.nextVoteAt,
            remainingHours,
          },
        },
        { status: 429 }
      )
    }
  }
  const forwarded = request.headers.get('x-forwarded-for') || ''
  const ipAddress = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const result = registerServerNicknameVote({
    serverId,
    nickname: normalizedNickname,
    ipAddress,
    ipDailyLimit: MAX_VOTES_PER_IP_PER_DAY,
    cooldownHours: 24,
  })
  if (!result.success && result.reason === 'already-voted') {
    return NextResponse.json({ error: 'You already voted today' }, { status: 400 })
  }
  if (!result.success && result.reason === 'ip-limit') {
    return NextResponse.json({ error: 'Ліміт голосів з цієї IP-адреси на сьогодні вичерпано' }, { status: 429 })
  }
  createOwnerNotification({
    serverId,
    type: 'vote',
    actorName: normalizedNickname,
  })
  return NextResponse.json({ success: true, nickname: normalizedNickname })
}
