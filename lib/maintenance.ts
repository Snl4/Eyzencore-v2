import { prisma } from '@/lib/prisma'

export type MaintenanceSettings = {
  enabled: boolean
  title: string
  message: string
  updatedAt: string
}

const DEFAULT_SETTINGS: MaintenanceSettings = {
  enabled: false,
  title: 'Технічні роботи',
  message: 'Ми оновлюємо Eyzencore. Сайт незабаром повернеться.',
  updatedAt: '',
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  try {
    const row = await prisma.app_site_settings.findUnique({ where: { id: 1 } })
    if (!row) return DEFAULT_SETTINGS
    return {
      enabled: Boolean(row.maintenance_enabled),
      title: row.maintenance_title,
      message: row.maintenance_message,
      updatedAt: row.updated_at,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function updateMaintenanceSettings(input: {
  enabled: boolean
  title?: string
  message?: string
}): Promise<MaintenanceSettings> {
  const now = new Date().toISOString()
  const row = await prisma.app_site_settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      maintenance_enabled: input.enabled ? 1 : 0,
      maintenance_title: String(input.title || DEFAULT_SETTINGS.title).trim().slice(0, 120),
      maintenance_message: String(input.message || DEFAULT_SETTINGS.message).trim().slice(0, 1000),
      updated_at: now,
    },
    update: {
      maintenance_enabled: input.enabled ? 1 : 0,
      maintenance_title: String(input.title || DEFAULT_SETTINGS.title).trim().slice(0, 120),
      maintenance_message: String(input.message || DEFAULT_SETTINGS.message).trim().slice(0, 1000),
      updated_at: now,
    },
  })
  return {
    enabled: Boolean(row.maintenance_enabled),
    title: row.maintenance_title,
    message: row.maintenance_message,
    updatedAt: row.updated_at,
  }
}
