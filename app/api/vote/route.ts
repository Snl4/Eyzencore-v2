import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  createOwnerNotification,
  getAuthenticatedServerVoteCooldown,
  getAuthSessionFromToken,
  getServerById,
  registerAuthenticatedServerVote,
  registerServerNicknameVote,
} from '@/lib/auth-db'
import { dispatchServerCallback } from '@/lib/callback-api'

const NICKNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/
const MAX_VOTES_PER_IP_PER_DAY = 5
const VOTE_COOLDOWN_HOURS = 24

function normalizeNickname(value: string): string {
  return String(value || '').trim().toLowerCase()
}

function isValidNickname(value: string): boolean {
  return NICKNAME_PATTERN.test(value)
}

function formatHoursUk(hours: number): string {
  const normalizedHours = Math.max(1, Math.ceil(Number(hours || 1)))
  const mod10 = normalizedHours % 10
  const mod100 = normalizedHours % 100
  if (mod10 === 1 && mod100 !== 11) return `${normalizedHours} годину`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${normalizedHours} години`
  return `${normalizedHours} годин`
}

function getRemainingHours(nextVoteAt: string): number {
  const nextVoteTime = new Date(nextVoteAt).getTime()
  if (!Number.isFinite(nextVoteTime)) return VOTE_COOLDOWN_HOURS
  return Math.max(1, Math.ceil((nextVoteTime - Date.now()) / (60 * 60 * 1000)))
}

function buildCooldownResponse(message: string, nextVoteAt: string) {
  const remainingHours = getRemainingHours(nextVoteAt)
  return NextResponse.json(
    {
      error: `${message} Спробуйте знову через ${formatHoursUk(remainingHours)}.`,
      cooldown: {
        active: true,
        nextVoteAt,
        remainingHours,
      },
    },
    { status: 429 }
  )
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { serverId?: string | number; nickname?: string }
  const serverId = Number(body.serverId)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Некоректний serverId' }, { status: 400 })
  }
  const server = await getServerById(serverId)
  if (!server) {
    return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  }
  const normalizedNickname = normalizeNickname(String(body.nickname || ''))
  if (!isValidNickname(normalizedNickname)) {
    return NextResponse.json({ error: 'Нікнейм має бути 3-16 символів і містити лише літери, цифри та _' }, { status: 400 })
  }
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Увійдіть в акаунт, щоб голосувати за сервер' }, { status: 401 })
  }
  const authCooldown = await getAuthenticatedServerVoteCooldown({
    serverId,
    userId: auth.user.id,
    cooldownHours: VOTE_COOLDOWN_HOURS,
  })
  if (authCooldown.active) {
    return buildCooldownResponse('Ви вже голосували за цей сервер.', authCooldown.nextVoteAt)
  }
  const forwarded = request.headers.get('x-forwarded-for') || ''
  const ipAddress = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const result = await registerServerNicknameVote({
    serverId,
    nickname: normalizedNickname,
    ipAddress,
    ipDailyLimit: MAX_VOTES_PER_IP_PER_DAY,
    cooldownHours: VOTE_COOLDOWN_HOURS,
  })
  if (!result.success && result.reason === 'already-voted') {
    return buildCooldownResponse('Цей нікнейм уже голосував за цей сервер.', result.nextVoteAt)
  }
  if (!result.success && result.reason === 'ip-limit') {
    return NextResponse.json({ error: 'Ліміт голосів з цієї IP-адреси на сьогодні вичерпано' }, { status: 429 })
  }
  await registerAuthenticatedServerVote({
    serverId,
    userId: auth.user.id,
    nickname: normalizedNickname,
    cooldownHours: VOTE_COOLDOWN_HOURS,
    enforceCooldown: false,
  })
  await createOwnerNotification({
    serverId,
    type: 'vote',
    actorName: normalizedNickname,
  })
  await dispatchServerCallback({
    serverId,
    action: 'vote',
    userId: auth.user.id,
    userNickname: normalizedNickname,
    ipAddress,
  })
  return NextResponse.json({ success: true, nickname: normalizedNickname })
}
