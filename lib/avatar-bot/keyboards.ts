import { AVATAR_BACKGROUNDS, AVATAR_VIEWS } from '@/lib/avatar-bot/constants'
import type { AvatarBackgroundKey, AvatarViewKey } from '@/lib/avatar-bot/types'

type InlineKeyboardButton = {
  text: string
  callback_data: string
}

type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][]
}

export function buildAvatarKeyboard(
  activeView: AvatarViewKey,
  activeBackground: AvatarBackgroundKey,
): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = []
  const viewKeys = Object.keys(AVATAR_VIEWS) as AvatarViewKey[]
  for (let index = 0; index < viewKeys.length; index += 2) {
    const left = viewKeys[index]
    const right = viewKeys[index + 1]
    const row: InlineKeyboardButton[] = [
      {
        text: left === activeView ? `✓ ${AVATAR_VIEWS[left].label}` : AVATAR_VIEWS[left].label,
        callback_data: `view:${left}`,
      },
    ]
    if (right) {
      row.push({
        text: right === activeView ? `✓ ${AVATAR_VIEWS[right].label}` : AVATAR_VIEWS[right].label,
        callback_data: `view:${right}`,
      })
    }
    rows.push(row)
  }
  const backgroundKeys = Object.keys(AVATAR_BACKGROUNDS) as AvatarBackgroundKey[]
  rows.push(
    backgroundKeys.map((background) => ({
      text:
        background === activeBackground
          ? `✓ ${AVATAR_BACKGROUNDS[background].label}`
          : AVATAR_BACKGROUNDS[background].label,
      callback_data: `bg:${background}`,
    })),
  )
  rows.push([{ text: '🔄 Згенерувати', callback_data: 'action:render' }])
  return { inline_keyboard: rows }
}
