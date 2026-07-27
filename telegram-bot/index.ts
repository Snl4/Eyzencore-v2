/**
 * Eyzencore Telegram bot for account verification.
 * Run: npm run telegram:bot
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { linkTelegramUserAccount } from '@/lib/auth-db'

type TelegramApiResponse<T> = {
  ok: boolean
  result?: T
  description?: string
}

type TelegramMessage = {
  chat: { id: number }
  from?: { id: number; username?: string }
  text?: string
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
}

const POLL_TIMEOUT_SECONDS = 25

function loadEnv(): void {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

class TelegramVerificationApi {
  private readonly baseUrl: string

  constructor(private readonly token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`
  }

  async deleteWebhook(): Promise<void> {
    await this.request('deleteWebhook', { drop_pending_updates: false })
  }

  async getMe(): Promise<{ username?: string; first_name?: string }> {
    return (await this.request('getMe', {})) ?? {}
  }

  async getUpdates(offset: number, timeoutSeconds: number): Promise<TelegramUpdate[]> {
    return (await this.request('getUpdates', {
      offset,
      timeout: timeoutSeconds,
      allowed_updates: ['message'],
    })) ?? []
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    await this.request('sendMessage', { chat_id: chatId, text })
  }

  private async request<T>(method: string, body: Record<string, unknown>): Promise<T | undefined> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = (await response.json()) as TelegramApiResponse<T>
    if (!payload.ok) throw new Error(payload.description || `${method} failed`)
    return payload.result
  }
}

async function resolvePollingOffset(api: TelegramVerificationApi): Promise<number> {
  const pending = await api.getUpdates(0, 0)
  if (!pending.length) return 0
  const lastUpdateId = pending[pending.length - 1]?.update_id
  if (typeof lastUpdateId !== 'number') return 0
  console.log(`[telegram-bot] skipped ${pending.length} pending updates`)
  return lastUpdateId + 1
}

async function handleMessage(api: TelegramVerificationApi, message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id
  const text = String(message.text || '').trim()
  const [rawCommand, payload = ''] = text.split(/\s+/)
  const command = String(rawCommand || '').toLowerCase().split('@')[0]

  if (command !== '/start' || !payload.startsWith('link_')) {
    await api.sendMessage(chatId, 'Привіт! Відкрий привʼязку Telegram з налаштувань Eyzencore і натисни Start.')
    return
  }

  try {
    await linkTelegramUserAccount({
      token: payload.slice(5),
      telegramUserId: String(message.from?.id || chatId),
      username: message.from?.username || null,
    })
    await api.sendMessage(chatId, 'Telegram привʼязано до акаунта Eyzencore. Можна повернутися на сайт і оновити сторінку.')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Не вдалося привʼязати Telegram'
    await api.sendMessage(chatId, errorMessage)
  }
}

async function runTelegramBot(): Promise<void> {
  loadEnv()
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  if (!token) {
    console.error('[telegram-bot] TELEGRAM_BOT_TOKEN не налаштовано в .env')
    process.exit(1)
  }
  const api = new TelegramVerificationApi(token)
  await api.deleteWebhook()
  const me = await api.getMe()
  console.log(`[telegram-bot] started as ${me.username ? `@${me.username}` : me.first_name || 'Telegram bot'}`)
  let offset = await resolvePollingOffset(api)
  for (;;) {
    try {
      const updates = await api.getUpdates(offset, POLL_TIMEOUT_SECONDS)
      for (const update of updates) {
        offset = Math.max(offset, update.update_id + 1)
        if (update.message) {
          await handleMessage(api, update.message)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[telegram-bot] polling error: ${message}`)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

runTelegramBot().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[telegram-bot] fatal: ${message}`)
  process.exit(1)
})
