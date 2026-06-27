type TelegramApiResponse<T> = {
  ok: boolean
  result?: T
  description?: string
}

type TelegramFile = {
  file_id: string
  file_path?: string
}

export class TelegramAvatarApi {
  private readonly baseUrl: string

  constructor(private readonly token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`
  }

  async deleteWebhook(): Promise<void> {
    await this.request('deleteWebhook', { drop_pending_updates: false })
  }

  async getMe(): Promise<{ username?: string; first_name?: string }> {
    const result = await this.request<{ username?: string; first_name?: string }>('getMe', {})
    return result ?? {}
  }

  async getUpdates(offset: number, timeoutSeconds: number): Promise<Array<Record<string, unknown>>> {
    const response = await this.request<Array<Record<string, unknown>>>('getUpdates', {
      offset,
      timeout: timeoutSeconds,
      allowed_updates: ['message', 'callback_query'],
    })
    return response ?? []
  }

  async sendMessage(input: {
    chatId: number
    text: string
    replyMarkup?: Record<string, unknown>
  }): Promise<void> {
    await this.request('sendMessage', {
      chat_id: input.chatId,
      text: input.text,
      reply_markup: input.replyMarkup,
    })
  }

  async sendPhoto(input: {
    chatId: number
    photo: Buffer
    caption?: string
    replyMarkup?: Record<string, unknown>
  }): Promise<void> {
    const form = new FormData()
    form.append('chat_id', String(input.chatId))
    form.append('photo', new Blob([new Uint8Array(input.photo)], { type: 'image/png' }), 'avatar.png')
    if (input.caption) {
      form.append('caption', input.caption)
    }
    if (input.replyMarkup) {
      form.append('reply_markup', JSON.stringify(input.replyMarkup))
    }
    const response = await fetch(`${this.baseUrl}/sendPhoto`, {
      method: 'POST',
      body: form,
    })
    const payload = (await response.json()) as TelegramApiResponse<unknown>
    if (!payload.ok) {
      throw new Error(payload.description || 'sendPhoto failed')
    }
  }

  async sendPhotoByUrl(input: {
    chatId: number
    photoUrl: string
    caption?: string
    replyMarkup?: Record<string, unknown>
  }): Promise<void> {
    await this.request('sendPhoto', {
      chat_id: input.chatId,
      photo: input.photoUrl,
      caption: input.caption,
      reply_markup: input.replyMarkup,
    })
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.request('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
    })
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const file = await this.request<TelegramFile>('getFile', { file_id: fileId })
    if (!file?.file_path) {
      throw new Error('Telegram file path missing')
    }
    const response = await fetch(`https://api.telegram.org/file/bot${this.token}/${file.file_path}`)
    if (!response.ok) {
      throw new Error(`Failed to download Telegram file: ${response.status}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }

  private async request<T>(method: string, body: Record<string, unknown>): Promise<T | undefined> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = (await response.json()) as TelegramApiResponse<T>
    if (!payload.ok) {
      throw new Error(payload.description || `${method} failed`)
    }
    return payload.result
  }
}

export function getAvatarBotToken(): string {
  return String(process.env.AVATAR_BOT_TOKEN || '').trim()
}

export function getAvatarBotName(): string {
  return String(process.env.AVATAR_BOT_NAME || 'Avatar Bot').trim()
}
