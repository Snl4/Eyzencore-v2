import { AVATAR_BOT_SESSION_TTL_MS } from '@/lib/avatar-bot/constants'
import type { AvatarSession, AvatarViewKey } from '@/lib/avatar-bot/types'

const sessions = new Map<number, AvatarSession>()

export function getAvatarSession(chatId: number): AvatarSession | null {
  const session = sessions.get(chatId)
  if (!session) {
    return null
  }
  if (Date.now() - session.updatedAt > AVATAR_BOT_SESSION_TTL_MS) {
    sessions.delete(chatId)
    return null
  }
  return session
}

export function saveAvatarSession(input: {
  chatId: number
  username?: string | null
  skinUrl?: string | null
  view?: AvatarViewKey
}): AvatarSession {
  const current = getAvatarSession(input.chatId)
  const session: AvatarSession = {
    chatId: input.chatId,
    username: input.username === undefined ? current?.username ?? null : input.username,
    skinUrl: input.skinUrl === undefined ? current?.skinUrl ?? null : input.skinUrl,
    view: input.view ?? current?.view ?? 'bust',
    updatedAt: Date.now(),
  }
  sessions.set(input.chatId, session)
  return session
}

export function clearAvatarSession(chatId: number): void {
  sessions.delete(chatId)
}
