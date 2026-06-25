export type AnimilairUserRole = 'USER' | 'OWNER' | 'DESIGNER' | 'ADMIN'

type AnimilairManagerUser = {
  id: string
}

export const ANIMILAIR_DEFAULT_WELCOME =
  'Привіт! Напишіть, що потрібно зробити - обговоримо деталі, бюджет і терміни прямо в чаті.'

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
  productCoverUrl: string | null
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

export function isAnimilairOrderClosed(status: string): boolean {
  return status === 'completed' || status === 'canceled'
}

/** Active chat on a product page: newest open order for designers, own open order for customers. */
export function pickAnimilairProductPageOrder(
  orders: AnimilairOrder[],
  userId: string,
  canManage: boolean
): AnimilairOrder | null {
  const openOrders = orders.filter((order) => !isAnimilairOrderClosed(order.status))
  if (!openOrders.length) return null
  if (canManage) return openOrders[0] ?? null
  return openOrders.find((order) => order.customerId === userId) ?? null
}

/** Keep a just-closed order visible on the product page until review or archive. */
export function resolveAnimilairProductPageSelection(input: {
  orders: AnimilairOrder[]
  userId: string
  canManage: boolean
  currentOrderId: number | null
}): { orders: AnimilairOrder[]; activeOrderId: number | null } {
  const current = input.currentOrderId
    ? input.orders.find((order) => order.id === input.currentOrderId) || null
    : null
  if (current && isAnimilairOrderClosed(current.status)) {
    const isVisible = input.canManage
      ? current.authorUserId === input.userId
      : current.customerId === input.userId
    if (isVisible) {
      return { orders: [current], activeOrderId: current.id }
    }
  }
  const primary = pickAnimilairProductPageOrder(input.orders, input.userId, input.canManage)
  if (primary) {
    return { orders: [primary], activeOrderId: primary.id }
  }
  if (current && !isAnimilairOrderClosed(current.status)) {
    return { orders: [current], activeOrderId: current.id }
  }
  return { orders: [], activeOrderId: null }
}

export type AnimilairOrderProductGroup = {
  productId: number
  productTitle: string
  productSlug: string
  productCoverUrl: string | null
  orders: AnimilairOrder[]
  primaryOrder: AnimilairOrder
  activeCount: number
}

/** Group designer orders by product; newest active order is primary. */
export function groupAnimilairActiveOrdersByProduct(orders: AnimilairOrder[]): AnimilairOrderProductGroup[] {
  const activeOrders = orders.filter((order) => !isAnimilairOrderClosed(order.status))
  const groups = new Map<number, AnimilairOrder[]>()
  for (const order of activeOrders) {
    const bucket = groups.get(order.productId) || []
    bucket.push(order)
    groups.set(order.productId, bucket)
  }
  return Array.from(groups.values())
    .map((productOrders) => {
      const sorted = [...productOrders].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )
      const primary = sorted[0]
      return {
        productId: primary.productId,
        productTitle: primary.productTitle,
        productSlug: primary.productSlug,
        productCoverUrl: primary.productCoverUrl,
        orders: sorted,
        primaryOrder: primary,
        activeCount: sorted.length,
      }
    })
    .sort(
      (left, right) => new Date(right.primaryOrder.updatedAt).getTime() - new Date(left.primaryOrder.updatedAt).getTime()
    )
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
