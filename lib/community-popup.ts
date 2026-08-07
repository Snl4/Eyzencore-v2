import { prisma } from '@/lib/prisma'

export type CommunityPopupVariant = 'telegram' | 'discord' | 'forum' | 'update' | 'custom'
export type CommunityPopupFrequency = 'daily' | 'version'

export type CommunityPopupSettings = {
  enabled: boolean
  variant: CommunityPopupVariant
  frequency: CommunityPopupFrequency
  version: string
  title: string
  message: string
  primaryLabel: string
  primaryUrl: string
  secondaryLabel: string
  secondaryUrl: string
  updatedAt: string
}

type CommunityPopupRow = {
  community_popup_enabled?: number | null
  community_popup_variant?: string | null
  community_popup_frequency?: string | null
  community_popup_version?: string | null
  community_popup_title?: string | null
  community_popup_message?: string | null
  community_popup_primary_label?: string | null
  community_popup_primary_url?: string | null
  community_popup_secondary_label?: string | null
  community_popup_secondary_url?: string | null
  updated_at?: string | null
}

export const DEFAULT_COMMUNITY_POPUP: CommunityPopupSettings = {
  enabled: false,
  variant: 'telegram',
  frequency: 'daily',
  version: 'telegram-v1',
  title: 'Підписуйтесь на наш Telegram канал',
  message: 'Там швидкі новини Eyzencore, оновлення серверів, голосування та ідеї від спільноти.',
  primaryLabel: 'Відкрити Telegram',
  primaryUrl: 'https://t.me/Eyzencore',
  secondaryLabel: 'Запропонувати ідею',
  secondaryUrl: '/forum',
  updatedAt: '',
}

let ensured = false

function cleanText(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max)
}

function cleanUrl(value: unknown, fallback: string) {
  const raw = cleanText(value, 500)
  if (!raw) return fallback
  if (raw.startsWith('/')) return raw
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : fallback
  } catch {
    return fallback
  }
}

function normalizeVariant(value: unknown): CommunityPopupVariant {
  const raw = cleanText(value, 32).toLowerCase()
  if (raw === 'discord' || raw === 'forum' || raw === 'update' || raw === 'custom') return raw
  return 'telegram'
}

function normalizeFrequency(value: unknown): CommunityPopupFrequency {
  return cleanText(value, 32).toLowerCase() === 'version' ? 'version' : 'daily'
}

async function ensureCommunityPopupColumns() {
  if (ensured) return
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_site_settings (
      id INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
      maintenance_enabled INTEGER NOT NULL DEFAULT 0,
      maintenance_title TEXT NOT NULL DEFAULT 'Технічні роботи',
      maintenance_message TEXT NOT NULL DEFAULT 'Ми оновлюємо Eyzencore. Сайт незабаром повернеться.',
      updated_at TEXT NOT NULL
    )
  `)
  await prisma.$executeRawUnsafe(`INSERT OR IGNORE INTO app_site_settings (id, updated_at) VALUES (1, ?)`, new Date().toISOString())
  const columns = [
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_enabled INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_variant TEXT NOT NULL DEFAULT 'telegram'`,
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_frequency TEXT NOT NULL DEFAULT 'daily'`,
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_version TEXT NOT NULL DEFAULT 'telegram-v1'`,
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_title TEXT NOT NULL DEFAULT 'Підписуйтесь на наш Telegram канал'`,
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_message TEXT NOT NULL DEFAULT 'Там швидкі новини Eyzencore, оновлення серверів, голосування та ідеї від спільноти.'`,
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_primary_label TEXT NOT NULL DEFAULT 'Відкрити Telegram'`,
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_primary_url TEXT NOT NULL DEFAULT 'https://t.me/Eyzencore'`,
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_secondary_label TEXT NOT NULL DEFAULT 'Запропонувати ідею'`,
    `ALTER TABLE app_site_settings ADD COLUMN community_popup_secondary_url TEXT NOT NULL DEFAULT '/forum'`,
  ]
  for (const statement of columns) {
    await prisma.$executeRawUnsafe(statement).catch(() => undefined)
  }
  ensured = true
}

function mapRow(row?: CommunityPopupRow | null): CommunityPopupSettings {
  return {
    enabled: Boolean(row?.community_popup_enabled),
    variant: normalizeVariant(row?.community_popup_variant),
    frequency: normalizeFrequency(row?.community_popup_frequency),
    version: cleanText(row?.community_popup_version, 80) || DEFAULT_COMMUNITY_POPUP.version,
    title: cleanText(row?.community_popup_title, 120) || DEFAULT_COMMUNITY_POPUP.title,
    message: cleanText(row?.community_popup_message, 500) || DEFAULT_COMMUNITY_POPUP.message,
    primaryLabel: cleanText(row?.community_popup_primary_label, 60) || DEFAULT_COMMUNITY_POPUP.primaryLabel,
    primaryUrl: cleanUrl(row?.community_popup_primary_url, DEFAULT_COMMUNITY_POPUP.primaryUrl),
    secondaryLabel: cleanText(row?.community_popup_secondary_label, 60) || DEFAULT_COMMUNITY_POPUP.secondaryLabel,
    secondaryUrl: cleanUrl(row?.community_popup_secondary_url, DEFAULT_COMMUNITY_POPUP.secondaryUrl),
    updatedAt: cleanText(row?.updated_at, 80),
  }
}

export async function getCommunityPopupSettings(): Promise<CommunityPopupSettings> {
  try {
    await ensureCommunityPopupColumns()
    const rows = await prisma.$queryRawUnsafe<CommunityPopupRow[]>('SELECT * FROM app_site_settings WHERE id = 1 LIMIT 1')
    return mapRow(rows[0])
  } catch {
    return DEFAULT_COMMUNITY_POPUP
  }
}

export async function updateCommunityPopupSettings(input: Partial<CommunityPopupSettings>): Promise<CommunityPopupSettings> {
  await ensureCommunityPopupColumns()
  const current = await getCommunityPopupSettings()
  const next: CommunityPopupSettings = {
    enabled: Boolean(input.enabled),
    variant: normalizeVariant(input.variant || current.variant),
    frequency: normalizeFrequency(input.frequency || current.frequency),
    version: cleanText(input.version || current.version, 80) || DEFAULT_COMMUNITY_POPUP.version,
    title: cleanText(input.title || current.title, 120) || DEFAULT_COMMUNITY_POPUP.title,
    message: cleanText(input.message || current.message, 500) || DEFAULT_COMMUNITY_POPUP.message,
    primaryLabel: cleanText(input.primaryLabel || current.primaryLabel, 60) || DEFAULT_COMMUNITY_POPUP.primaryLabel,
    primaryUrl: cleanUrl(input.primaryUrl || current.primaryUrl, DEFAULT_COMMUNITY_POPUP.primaryUrl),
    secondaryLabel: cleanText(input.secondaryLabel || current.secondaryLabel, 60) || DEFAULT_COMMUNITY_POPUP.secondaryLabel,
    secondaryUrl: cleanUrl(input.secondaryUrl || current.secondaryUrl, DEFAULT_COMMUNITY_POPUP.secondaryUrl),
    updatedAt: new Date().toISOString(),
  }
  await prisma.$executeRawUnsafe(
    `UPDATE app_site_settings SET
      community_popup_enabled = ?,
      community_popup_variant = ?,
      community_popup_frequency = ?,
      community_popup_version = ?,
      community_popup_title = ?,
      community_popup_message = ?,
      community_popup_primary_label = ?,
      community_popup_primary_url = ?,
      community_popup_secondary_label = ?,
      community_popup_secondary_url = ?,
      updated_at = ?
    WHERE id = 1`,
    next.enabled ? 1 : 0,
    next.variant,
    next.frequency,
    next.version,
    next.title,
    next.message,
    next.primaryLabel,
    next.primaryUrl,
    next.secondaryLabel,
    next.secondaryUrl,
    next.updatedAt,
  )
  return next
}
