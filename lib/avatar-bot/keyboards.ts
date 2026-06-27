import { AVATAR_VIEWS } from '@/lib/avatar-bot/constants'
import type { AvatarViewKey } from '@/lib/avatar-bot/types'

type InlineKeyboardButton = {
  text: string
  callback_data: string
}

type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][]
}

export function buildViewKeyboard(activeView: AvatarViewKey): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = []
  const keys = Object.keys(AVATAR_VIEWS) as AvatarViewKey[]
  for (let index = 0; index < keys.length; index += 2) {
    const left = keys[index]
    const right = keys[index + 1]
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
  rows.push([{ text: '🔄 Згенерувати', callback_data: 'action:render' }])
  return { inline_keyboard: rows }
}
