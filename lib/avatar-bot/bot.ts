import { renderAvatarPipeline } from '@/lib/avatar-bot/avatar-pipeline'
import { AVATAR_BACKGROUNDS, AVATAR_BOT_MESSAGES, AVATAR_VIEWS } from '@/lib/avatar-bot/constants'
import { buildAvatarKeyboard } from '@/lib/avatar-bot/keyboards'
import { getAvatarSession, saveAvatarSession } from '@/lib/avatar-bot/session-store'
import {
  isLikelySkinDocument,
  isValidMinecraftNick,
  resolveUsernameSkinUrl,
  uploadSkinForRender,
  validateSkinBuffer,
} from '@/lib/avatar-bot/skin-resolver'
import { getAvatarBotName, TelegramAvatarApi } from '@/lib/avatar-bot/telegram-api'
import type {
  AvatarBackgroundKey,
  AvatarViewKey,
  TelegramCallbackQuery,
  TelegramMessage,
  TelegramUpdate,
} from '@/lib/avatar-bot/types'

function parseViewKey(value: string | undefined): AvatarViewKey | null {
  if (!value) {
    return null
  }
  if (value in AVATAR_VIEWS) {
    return value as AvatarViewKey
  }
  return null
}

function parseBackgroundKey(value: string | undefined): AvatarBackgroundKey | null {
  if (!value) {
    return null
  }
  if (value in AVATAR_BACKGROUNDS) {
    return value as AvatarBackgroundKey
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
    if (message.photo && message.photo.length > 0 && !String(message.text || '').trim()) {
      await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.skinAsPhoto })
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
    try {
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
        background: 'studio',
      })
      await this.api.sendMessage({
        chatId,
        text: AVATAR_BOT_MESSAGES.nickSaved(text),
        replyMarkup: buildAvatarKeyboard(session.view, session.background),
      })
    } catch {
      await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.renderFailed })
    }
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
        text: 'Обери позу та фон:',
        replyMarkup: buildAvatarKeyboard(session.view, session.background),
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
    try {
      const buffer = await this.api.downloadFile(document.file_id)
      await this.saveSkinBuffer(chatId, buffer)
    } catch {
      await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.skinUploadFailed })
    }
  }

  private async saveSkinBuffer(chatId: number, buffer: Buffer): Promise<void> {
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
      background: 'studio',
    })
    await this.api.sendMessage({
      chatId,
      text: AVATAR_BOT_MESSAGES.skinSaved,
      replyMarkup: buildAvatarKeyboard(session.view, session.background),
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
    if (data.startsWith('bg:')) {
      const background = parseBackgroundKey(data.slice(3))
      if (!background) {
        await this.api.answerCallbackQuery(query.id)
        return
      }
      const updated = saveAvatarSession({ chatId, background })
      await this.api.answerCallbackQuery(query.id, AVATAR_BACKGROUNDS[background].label)
      await this.api.sendMessage({
        chatId,
        text: `Фон: ${AVATAR_BACKGROUNDS[background].label}`,
        replyMarkup: buildAvatarKeyboard(updated.view, updated.background),
      })
      return
    }
    if (data.startsWith('view:')) {
      const view = parseViewKey(data.slice(5))
      if (!view) {
        await this.api.answerCallbackQuery(query.id)
        return
      }
      const updated = saveAvatarSession({ chatId, view })
      await this.api.answerCallbackQuery(query.id, AVATAR_VIEWS[view].label)
      await this.renderAndSend(chatId, updated.view, updated.background)
      return
    }
    if (data === 'action:render') {
      await this.api.answerCallbackQuery(query.id, 'Генерую…')
      await this.renderAndSend(chatId, session.view, session.background)
    }
  }

  private async renderAndSend(
    chatId: number,
    view: AvatarViewKey,
    background: AvatarBackgroundKey,
  ): Promise<void> {
    const session = getAvatarSession(chatId)
    if (!session?.username && !session?.skinUrl) {
      return
    }
    await this.api.sendMessage({ chatId, text: AVATAR_BOT_MESSAGES.rendering })
    const label = session.username ? `@${session.username}` : 'custom skin'
    const caption = `${AVATAR_VIEWS[view].label} · ${AVATAR_BACKGROUNDS[background].label} · ${label}`
    const keyboard = buildAvatarKeyboard(view, background)
    try {
      const image = await renderAvatarPipeline({
        view,
        background,
        username: session.username,
        skinUrl: session.skinUrl,
      })
      await this.api.sendPhoto({
        chatId,
        photo: image,
        caption,
        replyMarkup: keyboard,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[avatar-bot] render failed: ${message}`)
      await this.api.sendMessage({
        chatId,
        text: AVATAR_BOT_MESSAGES.renderFailed,
        replyMarkup: keyboard,
      })
    }
  }
}
