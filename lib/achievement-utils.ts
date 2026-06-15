export const ACHIEVEMENT_TRIGGER_TYPES = [
  'manual',
  'servers_count',
  'forum_threads_count',
  'forum_posts_count',
  'votes_received',
  'reviews_received',
  'views_received',
  'karma',
  'server_verified',
  'server_players',
  'account_age_days',
] as const

export type AchievementTriggerType = (typeof ACHIEVEMENT_TRIGGER_TYPES)[number]

export type AchievementTriggerMeta = {
  type: AchievementTriggerType
  label: string
  hint: string
  needsValue: boolean
  defaultValue: number
  unit?: string
}

export const ACHIEVEMENT_TRIGGER_META: Record<
  AchievementTriggerType,
  AchievementTriggerMeta
> = {
  manual: {
    type: 'manual',
    label: 'Вручну',
    hint: 'Видається лише адміном у CMS',
    needsValue: false,
    defaultValue: 0,
  },
  servers_count: {
    type: 'servers_count',
    label: 'Серверів',
    hint: 'Кількість серверів у моніторингу',
    needsValue: true,
    defaultValue: 1,
    unit: 'серверів',
  },
  forum_threads_count: {
    type: 'forum_threads_count',
    label: 'Тем на форумі',
    hint: 'Опубліковані теми',
    needsValue: true,
    defaultValue: 5,
    unit: 'тем',
  },
  forum_posts_count: {
    type: 'forum_posts_count',
    label: 'Постів на форумі',
    hint: 'Відповіді та пости',
    needsValue: true,
    defaultValue: 10,
    unit: 'постів',
  },
  votes_received: {
    type: 'votes_received',
    label: 'Голосів',
    hint: 'Голоси на серверах користувача',
    needsValue: true,
    defaultValue: 10,
    unit: 'голосів',
  },
  reviews_received: {
    type: 'reviews_received',
    label: 'Відгуків',
    hint: 'Відгуки на серверах користувача',
    needsValue: true,
    defaultValue: 5,
    unit: 'відгуків',
  },
  views_received: {
    type: 'views_received',
    label: 'Переглядів',
    hint: 'Перегляди серверів користувача',
    needsValue: true,
    defaultValue: 100,
    unit: 'переглядів',
  },
  karma: {
    type: 'karma',
    label: 'Карма',
    hint: 'Сумарна карма з голосів і відгуків',
    needsValue: true,
    defaultValue: 50,
    unit: 'карми',
  },
  server_verified: {
    type: 'server_verified',
    label: 'Верифікація',
    hint: 'Має хоча б один верифікований сервер',
    needsValue: false,
    defaultValue: 0,
  },
  server_players: {
    type: 'server_players',
    label: 'Онлайн сервера',
    hint: 'Пік онлайну на одному з серверів',
    needsValue: true,
    defaultValue: 100,
    unit: 'гравців',
  },
  account_age_days: {
    type: 'account_age_days',
    label: 'Дні на платформі',
    hint: 'Від дати реєстрації акаунта',
    needsValue: true,
    defaultValue: 365,
    unit: 'днів',
  },
}

export type AchievementRecord = {
  id: number
  slug: string
  name: string
  description: string
  emblem: string
  image_url: string | null
  trigger_type: AchievementTriggerType
  trigger_value: number
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string
  earned_count?: number
}

export type UserAchievementMetrics = {
  serversCount: number
  forumThreadsCount: number
  forumPostsCount: number
  votesReceived: number
  reviewsReceived: number
  viewsReceived: number
  karma: number
  hasVerifiedServer: boolean
  maxServerPlayers: number
  accountAgeDays: number
}

function isAchievementTriggerType(value: string): value is AchievementTriggerType {
  return ACHIEVEMENT_TRIGGER_TYPES.includes(value as AchievementTriggerType)
}

function normalizeTriggerType(value: unknown): AchievementTriggerType {
  const raw = String(value ?? 'manual').trim().toLowerCase()
  return isAchievementTriggerType(raw) ? raw : 'manual'
}

export function slugifyAchievementName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'achievement'
}

export function describeAchievementTrigger(
  triggerType: string,
  triggerValue: number
): string {
  const type = normalizeTriggerType(triggerType)
  const meta = ACHIEVEMENT_TRIGGER_META[type]
  if (type === 'manual') return 'Вручну (CMS)'
  if (!meta.needsValue) return meta.label
  const unit = meta.unit ?? ''
  return `${meta.label}: ${triggerValue}${unit ? ` ${unit}` : ''}`
}

function readMetricValue(
  metrics: UserAchievementMetrics,
  triggerType: AchievementTriggerType
): number | boolean {
  switch (triggerType) {
    case 'servers_count':
      return metrics.serversCount
    case 'forum_threads_count':
      return metrics.forumThreadsCount
    case 'forum_posts_count':
      return metrics.forumPostsCount
    case 'votes_received':
      return metrics.votesReceived
    case 'reviews_received':
      return metrics.reviewsReceived
    case 'views_received':
      return metrics.viewsReceived
    case 'karma':
      return metrics.karma
    case 'server_verified':
      return metrics.hasVerifiedServer
    case 'server_players':
      return metrics.maxServerPlayers
    case 'account_age_days':
      return metrics.accountAgeDays
    case 'manual':
    default:
      return false
  }
}

export function isAchievementConditionMet(
  triggerType: string,
  triggerValue: number,
  metrics: UserAchievementMetrics,
  isEarned: boolean
): boolean {
  if (isEarned) return true
  const type = normalizeTriggerType(triggerType)
  if (type === 'manual') return false
  const current = readMetricValue(metrics, type)
  if (type === 'server_verified') return Boolean(current)
  return Number(current) >= Math.max(0, triggerValue)
}
