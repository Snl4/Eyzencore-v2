export type AnimilairUserRole = 'USER' | 'OWNER' | 'DESIGNER' | 'ADMIN'

type AnimilairManagerUser = {
  id: string
}

export const ANIMILAIR_DEFAULT_WELCOME =
  'Привіт! Напишіть, що потрібно зробити — обговоримо деталі, бюджет і терміни прямо в чаті.'

export const ANIMILAIR_DEFAULT_HERO_DESCRIPTION =
  'Послуги дизайнерів для Minecraft і Discord проєктів: банери, логотипи, рендери, анімації та текстури. Виберіть товар, відкрийте деталі й створіть замовлення прямо на сайті.'

export const ANIMILAIR_ONLINE_WINDOW_MS = 5 * 60 * 1000

export type AnimilairAuthor = {
  id: number
  userId: string | null
  slug: string
  name: string
  role: string
  bio: string
  avatarUrl: string | null
  bannerUrl: string | null
  socials: Record<string, string>
  welcomeMessage: string
  isOnline: boolean
  lastSeenAt: string | null
}

export type AnimilairProduct = {
  id: number
  authorId: number
  author: AnimilairAuthor | null
  slug: string
  title: string
  category: string
  shortDesc: string
  description: string
  priceFrom: number | null
  deliveryDays: number | null
  coverUrl: string | null
  tags: string[]
  featured: boolean
  viewCount: number
  ratingAverage: number | null
  ratingCount: number
  media: Array<{ id: number; type: string; url: string; caption: string }>
}

export type AnimilairProductReview = {
  id: number
  productId: number
  orderId: number
  customerId: string
  customerName: string
  customerAvatarUrl: string | null
  rating: number
  body: string
  createdAt: string
}

export type AnimilairOrder = {
  id: number
  productId: number
  productTitle: string
  productSlug: string
  authorUserId: string | null
  authorName: string
  customerId: string
  customerName: string
  customerAvatarUrl: string | null
  status: string
  title: string
  brief: string
  budget: string
  deadline: string | null
  contact: string
  createdAt: string
  updatedAt: string
}

export type AnimilairMessageAttachment =
  | { type: 'image'; url: string; name: string; mime: string; size: number }
  | { type: 'file'; url: string; name: string; mime: string; size: number }
  | { type: 'link'; url: string; caption: string }

export type AnimilairOrderMessage = {
  id: number
  orderId: number
  userId: string
  authorName: string
  authorAvatarUrl: string | null
  body: string
  attachments: AnimilairMessageAttachment[]
  createdAt: string
  isSystem: boolean
}

export const ANIMILAIR_MESSAGE_MAX_LENGTH = 500
export const ANIMILAIR_MESSAGE_MAX_ATTACHMENTS = 4
export const ANIMILAIR_SUPPORT_USER_ID = '__eyzencore_support__'
export const ANIMILAIR_SUPPORT_NAME = 'EyzenCore Support'
export const ANIMILAIR_SUPPORT_AVATAR = '/project-default-logo.png'

export const ANIMILAIR_ORDER_STATUS_MESSAGES: Record<string, string> = {
  new: 'Статус замовлення: нове',
  in_progress: 'Дизайнер прийняв замовлення в роботу.',
  waiting_customer: 'Дизайнер очікує відповідь замовника.',
  awaiting_confirmation: 'Дизайнер передав роботу. Підтвердіть, що замовлення виконане.',
  completed: 'Замовлення підтверджено та завершене.',
  canceled: 'Замовлення скасовано.',
}

const ANIMILAIR_EXCLUDED_CATEGORIES = new Set(['plugins', 'promo', 'promotion'])

export function isAnimilairCatalogCategory(category: string): boolean {
  return !ANIMILAIR_EXCLUDED_CATEGORIES.has(String(category || '').trim().toLowerCase())
}

export function canManageAnimilairProduct(
  user: AnimilairManagerUser | null,
  role: AnimilairUserRole,
  authorUserId: string | null
): boolean {
  if (!user) return false
  if (role === 'ADMIN') return true
  return Boolean(authorUserId && authorUserId === user.id)
}

export function getAnimilairRequestIp(source: { get(name: string): string | null }): string | null {
  return (
    source.get('cf-connecting-ip') ||
    source.get('x-real-ip') ||
    source.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  )
}
