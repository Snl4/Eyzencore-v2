import type { AvatarBackgroundKey, AvatarViewKey } from '@/lib/avatar-bot/types'

export const AVATAR_BOT_POLL_TIMEOUT_SECONDS = 25
export const AVATAR_BOT_RENDER_SIZE = 512
export const AVATAR_BOT_SESSION_TTL_MS = 1000 * 60 * 30
export const AVATAR_BOT_MAX_SKIN_BYTES = 1024 * 1024

export const AVATAR_VIEWS: Record<AvatarViewKey, { label: string; path: string }> = {
  bust: { label: '🧍 Bust', path: 'bust' },
  full: { label: '🏃 Full body', path: 'full' },
  face: { label: '😀 Face', path: 'face' },
  front: { label: '👤 Front', path: 'front' },
  back: { label: '🔙 Back', path: 'back' },
  frontfull: { label: '🧍 Front full', path: 'frontfull' },
}

export const AVATAR_BACKGROUNDS: Record<AvatarBackgroundKey, { label: string }> = {
  studio: { label: '🎬 Studio' },
  sunset: { label: '🌅 Sunset' },
  ocean: { label: '🌊 Ocean' },
  dark: { label: '🌑 Dark' },
  transparent: { label: '⬜ PNG' },
}

export const AVATAR_BOT_MESSAGES = {
  missingToken: 'AVATAR_BOT_TOKEN не налаштовано в .env',
  welcome: (botName: string) =>
    `Привіт! Я ${botName} — бот для Minecraft-аватарок у 3D стилі.\n\n` +
    'Надішли Minecraft нік (наприклад Steve) або файл скіну PNG без стиснення.\n\n' +
    'Обери позу та фон, потім натисни «Згенерувати».',
  invalidNick: 'Некоректний нік. Дозволені літери, цифри та _ (3–16 символів).',
  invalidSkinFile: 'Надішли PNG-скін (64x32 або 64x64) як файл без стиснення.',
  skinAsPhoto:
    'Скін надіслано як фото — Telegram стискає PNG.\n\n' +
    'Натисни 📎 → Файл → обери PNG-скін (не «Галерея»).',
  skinUploadFailed: 'Не вдалося завантажити скін. Спробуй ще раз або надішли Minecraft нік.',
  skinTooLarge: 'Файл занадто великий. Максимум 1 MB.',
  rendering: 'Генерую аватар…',
  renderFailed: 'Не вдалося згенерувати аватар. Перевір нік або спробуй інший скін.',
  nickSaved: (nick: string) => `Ок! Скін для ${nick}. Обери позу:`,
  skinSaved: 'Ок! Скін завантажено. Обери позу:',
  help:
    'Команди:\n' +
    '/start — початок\n' +
    '/menu — меню поз\n' +
    '/help — допомога\n\n' +
    'Надішли Minecraft нік або PNG-скін (файлом, не як фото).',
} as const
