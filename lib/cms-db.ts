import { prisma } from '@/lib/prisma'
import {
  approveServerApplication,
  rejectServerApplication,
} from '@/lib/auth-db'
import {
  ACHIEVEMENT_TRIGGER_TYPES,
  slugifyAchievementName,
  type AchievementTriggerType,
} from '@/lib/achievement-utils'

export const CMS_ENTITIES = [
  'users',
  'servers',
  'news',
  'projects',
  'reviews',
  'applications',
  'achievements',
] as const

export type CmsEntity = (typeof CMS_ENTITIES)[number]

export function isCmsEntity(value: string): value is CmsEntity {
  return CMS_ENTITIES.includes(value as CmsEntity)
}

function text(value: unknown, max = 5000) {
  return String(value ?? '').trim().slice(0, max)
}

function nullableText(value: unknown, max = 5000) {
  const result = text(value, max)
  return result || null
}

function integer(value: unknown, fallback = 0) {
  const result = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(result) ? result : fallback
}

function optionalInteger(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const result = Number.parseInt(String(value), 10)
  return Number.isFinite(result) ? result : null
}

export async function getCmsStats() {
  const [users, servers, news, projects, reviews, applications, achievements] =
    await Promise.all([
      prisma.app_users.count(),
      prisma.app_servers.count(),
      prisma.app_news_posts.count(),
      prisma.app_projects.count(),
      prisma.app_server_reviews.count(),
      prisma.app_server_applications.count({
        where: { status: 'pending' },
      }),
      prisma.app_achievements.count(),
    ])

  return {
    users,
    servers,
    news,
    projects,
    reviews,
    applications,
    achievements,
  }
}

export async function listCmsEntity(entity: CmsEntity) {
  switch (entity) {
    case 'users':
      return prisma.app_users.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          full_name: true,
          profile_slug: true,
          role: true,
          bio: true,
          location: true,
          website: true,
          telegram: true,
          discord: true,
          created_at: true,
        },
      })
    case 'servers':
      return prisma.app_servers.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          addr: true,
          platform: true,
          mode: true,
          ver: true,
          core: true,
          country: true,
          short_desc: true,
          full_desc: true,
          website: true,
          discord: true,
          telegram: true,
          tags: true,
          online: true,
          players: true,
          max: true,
          verified: true,
          boosted: true,
          project_id: true,
          created_at: true,
          app_users: { select: { full_name: true, email: true } },
        },
      })
    case 'news':
      return prisma.app_news_posts.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          excerpt: true,
          content: true,
          category: true,
          cover_url: true,
          created_at: true,
          updated_at: true,
          app_users: { select: { full_name: true, email: true } },
        },
      })
    case 'projects':
      return prisma.app_projects.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          logo_url: true,
          website: true,
          discord: true,
          created_at: true,
          app_users: { select: { full_name: true, email: true } },
          _count: { select: { app_servers: true } },
        },
      })
    case 'reviews':
      return prisma.app_server_reviews.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          server_id: true,
          author_name: true,
          text: true,
          rating: true,
          created_at: true,
          app_servers: { select: { name: true } },
          app_users: { select: { full_name: true, email: true } },
        },
      })
    case 'applications':
      return prisma.app_server_applications.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          status: true,
          rejection_reason: true,
          name: true,
          addr: true,
          platform: true,
          mode: true,
          ver: true,
          core: true,
          country: true,
          short_desc: true,
          full_desc: true,
          website: true,
          discord: true,
          telegram: true,
          project_id: true,
          created_at: true,
          reviewed_at: true,
          app_users: { select: { full_name: true, email: true } },
        },
      })
    case 'achievements':
      const rows = await prisma.app_achievements.findMany({
        orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
      })
      const counts = await prisma.app_user_achievements.groupBy({
        by: ['achievement_id'],
        _count: { achievement_id: true },
      })
      const countMap = new Map(
        counts.map((row) => [row.achievement_id, row._count.achievement_id])
      )
      return rows.map((row) => ({
        ...row,
        earned_count: countMap.get(row.id) ?? 0,
      }))
  }
}

function normalizeAchievementTrigger(value: unknown): AchievementTriggerType {
  const raw = text(value, 40).toLowerCase()
  return ACHIEVEMENT_TRIGGER_TYPES.includes(raw as AchievementTriggerType)
    ? (raw as AchievementTriggerType)
    : 'manual'
}

async function ensureUniqueAchievementSlug(
  baseSlug: string,
  excludeId?: number
): Promise<string> {
  const slug = slugifyAchievementName(baseSlug)
  let suffix = 0
  while (true) {
    const candidate = suffix ? `${slug}-${suffix}` : slug
    const existing = await prisma.app_achievements.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing || existing.id === excludeId) return candidate
    suffix += 1
  }
}

export async function createCmsEntity(
  entity: CmsEntity,
  input: Record<string, unknown>
) {
  const now = new Date().toISOString()
  if (entity !== 'achievements') {
    throw new Error('Створення доступне лише для досягнень')
  }
  const name = text(input.name, 120)
  if (!name) throw new Error('Вкажіть назву досягнення')
  const triggerType = normalizeAchievementTrigger(input.trigger_type)
  const triggerValue = Math.max(0, integer(input.trigger_value))
  const slug = await ensureUniqueAchievementSlug(
    text(input.slug, 80) || slugifyAchievementName(name)
  )
  return prisma.app_achievements.create({
    data: {
      slug,
      name,
      description: text(input.description, 500),
      emblem: text(input.emblem, 8) || '★',
      trigger_type: triggerType,
      trigger_value: triggerType === 'manual' || triggerType === 'server_verified'
        ? 0
        : triggerValue,
      is_active: integer(input.is_active, 1) ? 1 : 0,
      sort_order: integer(input.sort_order),
      created_at: now,
      updated_at: now,
    },
  })
}

export async function updateCmsEntity(
  entity: CmsEntity,
  id: string,
  input: Record<string, unknown>
) {
  const now = new Date().toISOString()

  switch (entity) {
    case 'users':
      return prisma.app_users.update({
        where: { id },
        data: {
          email: text(input.email, 320).toLowerCase(),
          full_name: text(input.full_name, 120),
          profile_slug: nullableText(input.profile_slug, 120),
          role: ['USER', 'OWNER', 'ADMIN'].includes(text(input.role).toUpperCase())
            ? text(input.role).toUpperCase()
            : 'USER',
          bio: text(input.bio, 2000),
          location: text(input.location, 160),
          website: nullableText(input.website, 500),
          telegram: nullableText(input.telegram, 160),
          discord: nullableText(input.discord, 160),
          updated_at: now,
        },
        select: { id: true },
      })
    case 'servers':
      return prisma.app_servers.update({
        where: { id: integer(id) },
        data: {
          name: text(input.name, 160),
          addr: text(input.addr, 255),
          platform: text(input.platform, 40) || 'minecraft',
          mode: text(input.mode, 120),
          ver: text(input.ver, 120),
          core: text(input.core, 80) || 'java',
          country: nullableText(input.country, 120),
          short_desc: text(input.short_desc, 500),
          full_desc: text(input.full_desc, 12000),
          website: nullableText(input.website, 500),
          discord: nullableText(input.discord, 500),
          telegram: nullableText(input.telegram, 500),
          tags: text(input.tags, 3000) || '[]',
          online: integer(input.online) ? 1 : 0,
          players: Math.max(0, integer(input.players)),
          max: Math.max(0, integer(input.max)),
          verified: integer(input.verified) ? 1 : 0,
          boosted: integer(input.boosted) ? 1 : 0,
          project_id: optionalInteger(input.project_id),
          updated_at: now,
        },
        select: { id: true },
      })
    case 'news': {
      const content = text(input.content, 50000)
      return prisma.app_news_posts.update({
        where: { id: integer(id) },
        data: {
          title: text(input.title, 240),
          excerpt: text(input.excerpt, 1000),
          content,
          content_json: JSON.stringify(
            content
              ? [{ id: 'block-1', type: 'paragraph', text: content }]
              : []
          ),
          category: text(input.category, 120) || 'Новини',
          cover_url: nullableText(input.cover_url, 1000),
          updated_at: now,
        },
        select: { id: true },
      })
    }
    case 'projects':
      return prisma.app_projects.update({
        where: { id: integer(id) },
        data: {
          name: text(input.name, 160),
          description: text(input.description, 5000),
          logo_url: nullableText(input.logo_url, 1000),
          website: nullableText(input.website, 500),
          discord: nullableText(input.discord, 500),
          updated_at: now,
        },
        select: { id: true },
      })
    case 'reviews':
      return prisma.app_server_reviews.update({
        where: { id: integer(id) },
        data: {
          author_name: nullableText(input.author_name, 120),
          text: text(input.text, 4000),
          rating: Math.min(5, Math.max(1, integer(input.rating, 1))),
          updated_at: now,
        },
        select: { id: true },
      })
    case 'applications':
      return prisma.app_server_applications.update({
        where: { id: integer(id) },
        data: {
          name: text(input.name, 160),
          addr: text(input.addr, 255),
          platform: text(input.platform, 40) || 'minecraft',
          mode: text(input.mode, 120),
          ver: text(input.ver, 120),
          core: text(input.core, 80) || 'java',
          country: nullableText(input.country, 120),
          short_desc: text(input.short_desc, 500),
          full_desc: text(input.full_desc, 12000),
          website: nullableText(input.website, 500),
          discord: nullableText(input.discord, 500),
          telegram: nullableText(input.telegram, 500),
          project_id: optionalInteger(input.project_id),
        },
        select: { id: true },
      })
    case 'achievements': {
      const achievementId = integer(id)
      const triggerType = normalizeAchievementTrigger(input.trigger_type)
      const slugInput = text(input.slug, 80)
      const slug = slugInput
        ? await ensureUniqueAchievementSlug(slugInput, achievementId)
        : undefined
      return prisma.app_achievements.update({
        where: { id: achievementId },
        data: {
          name: text(input.name, 120),
          description: text(input.description, 500),
          emblem: text(input.emblem, 8) || '★',
          trigger_type: triggerType,
          trigger_value:
            triggerType === 'manual' || triggerType === 'server_verified'
              ? 0
              : Math.max(0, integer(input.trigger_value)),
          is_active: integer(input.is_active, 1) ? 1 : 0,
          sort_order: integer(input.sort_order),
          slug,
          updated_at: now,
        },
        select: { id: true },
      })
    }
  }
}

export async function deleteCmsEntity(
  entity: CmsEntity,
  id: string,
  currentUserId: string
) {
  switch (entity) {
    case 'users':
      if (id === currentUserId) {
        throw new Error('Неможливо видалити власний обліковий запис CMS')
      }
      return prisma.app_users.delete({ where: { id }, select: { id: true } })
    case 'servers':
      return prisma.app_servers.delete({
        where: { id: integer(id) },
        select: { id: true },
      })
    case 'news':
      return prisma.app_news_posts.delete({
        where: { id: integer(id) },
        select: { id: true },
      })
    case 'projects':
      return prisma.app_projects.delete({
        where: { id: integer(id) },
        select: { id: true },
      })
    case 'reviews':
      return prisma.app_server_reviews.delete({
        where: { id: integer(id) },
        select: { id: true },
      })
    case 'applications':
      return prisma.app_server_applications.delete({
        where: { id: integer(id) },
        select: { id: true },
      })
    case 'achievements':
      return prisma.app_achievements.delete({
        where: { id: integer(id) },
        select: { id: true },
      })
  }
}

export async function moderateCmsApplication(
  id: string,
  action: 'approve' | 'reject',
  reason?: string
) {
  if (action === 'approve') {
    return approveServerApplication(integer(id))
  }
  return rejectServerApplication(integer(id), reason)
}
