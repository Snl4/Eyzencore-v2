import { AVATAR_BOT_MESSAGES, AVATAR_VIEWS } from '@/lib/avatar-bot/constants'
import { buildViewKeyboard } from '@/lib/avatar-bot/keyboards'
import { renderAvatarImage } from '@/lib/avatar-bot/renderer'
import { getAvatarSession, saveAvatarSession } from '@/lib/avatar-bot/session-store'
import {
  isLikelySkinDocument,
  isValidMinecraftNick,
  resolveUsernameSkinUrl,
  uploadSkinForRender,
  validateSkinBuffer,
} from '@/lib/avatar-bot/skin-resolver'
import { getAvatarBotName, TelegramAvatarApi } from '@/lib/avatar-bot/telegram-api'
import type { AvatarViewKey, TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from '@/lib/avatar-bot/types'

function parseViewKey(value: string | undefined): AvatarViewKey | null {
  if (!value) {
    return null
  }
  if (value in AVATAR_VIEWS) {
    return value as AvatarViewKey
  }
  return null
}

export class AvatarTelegramBot {
  constructor(private readonly api: TelegramAvatarApi) {}

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query)
      return
    }
    if (update.message) {
      await this.handleMessage(update.message)
    }
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id
    if (message.document) {
      await this.handleSkinDocument(chatId, message)
      return
    }
    const text = String(message.text || '').trim()
    if (!text || text.startsWith('/')) {
      await this.handleCommand(chatId, text)
      return
    }
    if (!isValidMinecraftNick(text)) {
      await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.invalidNick })
      return
    }
    const skinUrl = await resolveUsernameSkinUrl(text)
    if (!skinUrl) {
      await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.renderFailed })
      return
    }
    const session = saveAvatarSession({
      chatId,
      username: text,
      skinUrl,
      view: 'bust',
    })
    await this.api.sendMessage({
      chatId,
      text: AVATAR_BOT_MESSAGES.nickSaved(text),
      replyMarkup: buildViewKeyboard(session.view),
    })
  }

  private async handleCommand(chatId: number, text: string): Promise<void> {
    const rawCommand = text.split(/\s+/)[0]?.toLowerCase() || '/start'
    const command = rawCommand.split('@')[0] || '/start'
    if (command === '/help') {
      await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.help })
      return
    }
    if (command === '/menu') {
      const session = getAvatarSession(chatId)
      if (!session?.username && !session?.skinUrl) {
        await this.api.sendMessage({
          chatId,
          text: 'Спочатку надішли Minecraft нік або файл скіну.',
        })
        return
      }
      await this.api.sendMessage({
        chatId,
        text: 'Обери позу:',
        replyMarkup: buildViewKeyboard(session.view),
      })
      return
    }
    await this.api.sendMessage({
      chatId,
      text: AVATAR_BOT_MESSAGES.welcome(getAvatarBotName()),
    })
  }

  private async handleSkinDocument(chatId: number, message: TelegramMessage): Promise<void> {
    const document = message.document
    if (!document) {
      return
    }
    if (!isLikelySkinDocument(document.mime_type, document.file_name)) {
      await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.invalidSkinFile })
      return
    }
    if (document.file_size && document.file_size > 1024 * 1024) {
      await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.skinTooLarge })
      return
    }
    const buffer = await this.api.downloadFile(document.file_id)
    if (!validateSkinBuffer(buffer)) {
      await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.invalidSkinFile })
      return
    }
    const skinUrl = await uploadSkinForRender(buffer)
    const session = saveAvatarSession({
      chatId,
      username: null,
      skinUrl,
      view: 'bust',
    })
    await this.api.sendMessage({
      chatId,
      text: AVATAR_BOT_MESSAGES.skinSaved,
      replyMarkup: buildViewKeyboard(session.view),
    })
  }

  private async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    const chatId = query.message?.chat.id
    const data = String(query.data || '')
    if (!chatId) {
      await this.api.answerCallbackQuery(query.id)
      return
    }
    const session = getAvatarSession(chatId)
    if (!session?.username && !session?.skinUrl) {
      await this.api.answerCallbackQuery(query.id, 'Спочатку надішли нік або скін')
      return
    }
    if (data.startsWith('view:')) {
      const view = parseViewKey(data.slice(5))
      if (!view) {
        await this.api.answerCallbackQuery(query.id)
        return
      }
      saveAvatarSession({ chatId, view })
      await this.api.answerCallbackQuery(query.id, AVATAR_VIEWS[view].label)
      await this.renderAndSend(chatId, view)
      return
    }
    if (data === 'action:render') {
      await this.api.answerCallbackQuery(query.id, 'Генерую…')
      await this.renderAndSend(chatId, session.view)
    }
  }

  private async renderAndSend(chatId: number, view: AvatarViewKey): Promise<void> {
    const session = getAvatarSession(chatId)
    if (!session?.username && !session?.skinUrl) {
      return
    }
    await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.rendering })
    try {
      const image = await renderAvatarImage({
        view,
        username: session.username,
        skinUrl: session.skinUrl,
      })
      const label = session.username ? `@${session.username}` : 'custom skin'
      await this.api.sendPhoto({
        chatId,
        photo: image,
        caption: `${AVATAR_VIEWS[view].label} · ${label}`,
        replyMarkup: buildViewKeyboard(view),
      })
    } catch {
      await this.api.sendMessage({
        chatId,
        text: AVATAR_BOT_MESSAGES.renderFailed,
        replyMarkup: buildViewKeyboard(view),
      })
    }
  }
}
