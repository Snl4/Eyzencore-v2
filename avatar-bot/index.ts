/**
 * Minecraft avatar Telegram bot (similar to mc_raya_bot).
 * Run: npm run avatar:bot
 */
import { AvatarTelegramBot } from '@/lib/avatar-bot/bot'
import { AVATAR_BOT_MESSAGES, AVATAR_BOT_POLL_TIMEOUT_SECONDS } from '@/lib/avatar-bot/constants'
import { loadAvatarBotEnv } from '@/lib/avatar-bot/load-env'
import { getAvatarBotName, getAvatarBotToken, TelegramAvatarApi } from '@/lib/avatar-bot/telegram-api'
import type { TelegramUpdate } from '@/lib/avatar-bot/types'

loadAvatarBotEnv()

async function runAvatarBotPolling(): Promise<void> {
  const token = getAvatarBotToken()
  if (!token) {
    console.error(`[avatar-bot] ${AVATAR_BOT_MESSAGES.missingToken}`)
    process.exit(1)
  }
  const api = new TelegramAvatarApi(token)
  await api.deleteWebhook()
  const me = await api.getMe()
  const bot = new AvatarTelegramBot(api)
  let offset = 0
  const username = me.username ? `@${me.username}` : getAvatarBotName()
  console.log(`[avatar-bot] started as ${username} (${me.first_name || getAvatarBotName()})`)
  for (;;) {
    try {
      const updates = await api.getUpdates(offset, AVATAR_BOT_POLL_TIMEOUT_SECONDS)
      for (const raw of updates) {
        const update = raw as TelegramUpdate
        offset = Math.max(offset, update.update_id + 1)
        await bot.handleUpdate(update).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          console.error(`[avatar-bot] update failed: ${message}`)
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[avatar-bot] polling error: ${message}`)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

runAvatarBotPolling().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[avatar-bot] fatal: ${message}`)
  process.exit(1)
})
