import { createHash } from 'node:crypto'
import { buildServerDashboardSlug } from '@/lib/server-slug'
import { prisma } from '@/lib/prisma'
import type { AuthUser, UserRole } from '@/lib/auth-db'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'
import {
  ANIMILAIR_DEFAULT_WELCOME,
  ANIMILAIR_DEFAULT_HERO_DESCRIPTION,
  ANIMILAIR_MESSAGE_MAX_ATTACHMENTS,
  ANIMILAIR_MESSAGE_MAX_LENGTH,
  ANIMILAIR_ONLINE_WINDOW_MS,
  ANIMILAIR_ORDER_STATUS_MESSAGES,
  ANIMILAIR_SUPPORT_AVATAR,
  ANIMILAIR_SUPPORT_NAME,
  ANIMILAIR_SUPPORT_USER_ID,
  canManageAnimilairProduct,
  getAnimilairRequestIp,
  isAnimilairCatalogCategory,
  isAnimilairOrderClosed,
  type AnimilairAuthor,
  type AnimilairMessageAttachment,
  type AnimilairOrder,
  type AnimilairOrderMessage,
  type AnimilairProduct,
  type AnimilairProductReview,
} from '@/lib/animilair-shared'

export {
  ANIMILAIR_DEFAULT_WELCOME,
  ANIMILAIR_DEFAULT_HERO_DESCRIPTION,
  ANIMILAIR_MESSAGE_MAX_ATTACHMENTS,
  ANIMILAIR_MESSAGE_MAX_LENGTH,
  ANIMILAIR_ONLINE_WINDOW_MS,
  ANIMILAIR_ORDER_STATUS_MESSAGES,
  ANIMILAIR_SUPPORT_AVATAR,
  ANIMILAIR_SUPPORT_NAME,
  ANIMILAIR_SUPPORT_USER_ID,
  canManageAnimilairProduct,
  getAnimilairRequestIp,
  isAnimilairCatalogCategory,
  isAnimilairOrderClosed,
  type AnimilairAuthor,
  type AnimilairMessageAttachment,
  type AnimilairOrder,
  type AnimilairOrderMessage,
  type AnimilairProduct,
}

type CountRow = { c: number | bigint | null }

type ReviewRow = {
  id: number | bigint
  product_id: number | bigint
  order_id: number | bigint
  customer_id: string
  customer_name?: string | null
  customer_avatar_url?: string | null
  rating: number | bigint
  body: string
  created_at: string
  updated_at: string
}

type ProductRating = {
  average: number | null
  count: number
}

const ANIMILAIR_ORDER_STATUS_BODIES = new Set(Object.values(ANIMILAIR_ORDER_STATUS_MESSAGES))
const ANIMILAIR_SUPPORT_EMAIL = 'animilair-support@eyzencore.internal'

type AuthorRow = {
  id: number | bigint
  user_id: string | null
  slug: string
  name: string
  role: string
  bio: string
  avatar_url: string | null
  banner_url: string | null
  welcome_message?: string | null
  last_seen_at?: string | null
  socials_json: string
}

type ProductRow = {
  id: number | bigint
  author_id: number | bigint
  author_user_id?: string | null
  author_slug?: string | null
  author_name?: string | null
  author_role?: string | null
  author_bio?: string | null
  author_avatar_url?: string | null
  author_banner_url?: string | null
  author_socials_json?: string | null
  author_welcome_message?: string | null
  author_last_seen_at?: string | null
  slug: string
  title: string
  category: string
  short_desc: string
  description: string
  price_from: number | bigint | null
  delivery_days: number | bigint | null
  cover_url: string | null
  tags_json: string
  featured: number | bigint
}

type MediaRow = {
  id: number | bigint
  product_id: number | bigint
  type: string
  url: string
  caption: string
}

type OrderRow = {
  id: number | bigint
  product_id: number | bigint
  product_title: string
  product_slug: string
  product_cover_url?: string | null
  author_user_id: string | null
  author_name: string
  customer_id: string
  customer_name: string
  customer_avatar_url: string | null
  status: string
  title: string
  brief: string
  budget: string
  deadline: string | null
  contact: string
  customer_archived_at?: string | null
  author_archived_at?: string | null
  created_at: string
  updated_at: string
}

type MessageRow = {
  id: number | bigint
  order_id: number | bigint
  user_id: string
  author_name: string
  author_avatar_url: string | null
  body: string
  attachments_json?: string | null
  created_at: string
}

function nowIso() {
  return new Date().toISOString()
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function toNumber(value: number | bigint | null | undefined): number | null {
  if (value === null || value === undefined) return null
  return Number(value)
}

function splitAnimilairProductDescription(value: string): { shortDesc: string; description: string } {
  const description = String(value || '').trim().slice(0, 5000)
  return {
    shortDesc: description.slice(0, 260),
    description,
  }
}

function slugify(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return `product-${Date.now()}`
  const slug = buildServerDashboardSlug(trimmed)
  if (slug === 'server' && !/[a-z0-9\u0400-\u04ff]/i.test(trimmed)) {
    return `product-${Date.now()}`
  }
  return slug.slice(0, 80) || `product-${Date.now()}`
}

function roleCanSell(role: UserRole) {
  return role === 'DESIGNER' || role === 'ADMIN'
}

function isValidCoverUrl(value: string | null | undefined): boolean {
  const url = String(value || '').trim()
  if (!url) return false
  if (url === IMAGE_PLACEHOLDER || url.includes('/images/placeholder-minecraft.jpg')) return false
  return true
}

function isAnimilairAuthorOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false
  const seen = Date.parse(lastSeenAt)
  if (!Number.isFinite(seen)) return false
  return Date.now() - seen <= ANIMILAIR_ONLINE_WINDOW_MS
}

function mapAuthor(row: AuthorRow): AnimilairAuthor {
  const welcomeMessage = String(row.welcome_message || '').trim() || ANIMILAIR_DEFAULT_WELCOME
  const lastSeenAt = row.last_seen_at || null
  return {
    id: Number(row.id),
    userId: row.user_id,
    slug: row.slug,
    name: row.name,
    role: row.role,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    socials: parseJson<Record<string, string>>(row.socials_json, {}),
    welcomeMessage,
    lastSeenAt,
    isOnline: isAnimilairAuthorOnline(lastSeenAt),
  }
}

export function buildAnimilairViewFingerprint(input: {
  userId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}): string {
  if (input.userId) return `user:${input.userId}`
  const source = `${input.ipAddress || 'unknown'}|${input.userAgent || 'unknown'}`
  return `guest:${createHash('sha256').update(source).digest('hex').slice(0, 48)}`
}

function countToNumber(value: number | bigint | null | undefined): number {
  if (typeof value === 'bigint') return Number(value)
  return Number(value || 0)
}

async function getAnimilairProductViewCounts(productIds: number[]): Promise<Map<number, number>> {
  if (productIds.length === 0) return new Map()
  const placeholders = productIds.map(() => '?').join(',')
  const rows = await prisma.$queryRawUnsafe<Array<{ product_id: number | bigint; c: number | bigint | null }>>(
    `SELECT product_id, COUNT(*) AS c
     FROM app_animilair_product_views
     WHERE product_id IN (${placeholders})
     GROUP BY product_id`,
    ...productIds
  )
  const counts = new Map<number, number>()
  for (const row of rows) {
    counts.set(Number(row.product_id), countToNumber(row.c))
  }
  return counts
}

async function getAnimilairProductRatingStats(productIds: number[]): Promise<Map<number, ProductRating>> {
  if (productIds.length === 0) return new Map()
  const placeholders = productIds.map(() => '?').join(',')
  const rows = await prisma.$queryRawUnsafe<Array<{
    product_id: number | bigint
    average_rating: number | null
    review_count: number | bigint | null
  }>>(
    `SELECT product_id,
            AVG(rating) AS average_rating,
            COUNT(*) AS review_count
     FROM app_animilair_product_reviews
     WHERE product_id IN (${placeholders})
     GROUP BY product_id`,
    ...productIds
  )
  const stats = new Map<number, ProductRating>()
  for (const row of rows) {
    const count = countToNumber(row.review_count)
    stats.set(Number(row.product_id), {
      average: count > 0 ? Number(row.average_rating || 0) : null,
      count,
    })
  }
  return stats
}

function mapReview(row: ReviewRow): AnimilairProductReview {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    orderId: Number(row.order_id),
    customerId: row.customer_id,
    customerName: String(row.customer_name || 'Користувач'),
    customerAvatarUrl: row.customer_avatar_url || null,
    rating: Math.max(1, Math.min(5, Number(row.rating) || 1)),
    body: String(row.body || '').trim(),
    createdAt: row.created_at,
  }
}

export async function recordAnimilairProductView(input: {
  productId: number
  userId?: string | null
  fingerprint: string
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<boolean> {
  const result = await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO app_animilair_product_views
      (product_id, user_id, fingerprint, ip_address, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.productId,
    input.userId || null,
    input.fingerprint,
    input.ipAddress || null,
    input.userAgent || null,
    nowIso()
  )
  return Number(result) > 0
}

function mapProduct(
  row: ProductRow,
  media: MediaRow[] = [],
  viewCount = 0,
  rating: ProductRating = { average: null, count: 0 }
): AnimilairProduct {
  const author = row.author_name
    ? {
        id: Number(row.author_id),
        userId: row.author_user_id || null,
        slug: String(row.author_slug || ''),
        name: row.author_name,
        role: String(row.author_role || ''),
        bio: String(row.author_bio || ''),
        avatarUrl: row.author_avatar_url || null,
        bannerUrl: row.author_banner_url || null,
        socials: parseJson<Record<string, string>>(row.author_socials_json, {}),
        welcomeMessage: String(row.author_welcome_message || '').trim() || ANIMILAIR_DEFAULT_WELCOME,
        lastSeenAt: row.author_last_seen_at || null,
        isOnline: isAnimilairAuthorOnline(row.author_last_seen_at),
      }
    : null

  return {
    id: Number(row.id),
    authorId: Number(row.author_id),
    author,
    slug: row.slug,
    title: row.title,
    category: row.category,
    shortDesc: row.short_desc,
    description: row.description,
    priceFrom: toNumber(row.price_from),
    deliveryDays: toNumber(row.delivery_days),
    coverUrl: row.cover_url,
    tags: parseJson<string[]>(row.tags_json, []),
    featured: Boolean(Number(row.featured || 0)),
    viewCount,
    ratingAverage: rating.count > 0 ? Number(rating.average || 0) : null,
    ratingCount: rating.count,
    media: media
      .filter((item) => Number(item.product_id) === Number(row.id))
      .map((item) => ({
        id: Number(item.id),
        type: item.type,
        url: item.url,
        caption: item.caption,
      })),
  }
}

function mapOrder(row: OrderRow): AnimilairOrder {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    productTitle: row.product_title,
    productSlug: row.product_slug,
    productCoverUrl: row.product_cover_url || null,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerAvatarUrl: row.customer_avatar_url,
    status: row.status,
    title: row.title,
    brief: row.brief,
    budget: row.budget,
    deadline: row.deadline,
    contact: row.contact,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeMessageAttachments(value: unknown): AnimilairMessageAttachment[] {
  if (!Array.isArray(value)) return []
  const result: AnimilairMessageAttachment[] = []
  for (const item of value.slice(0, ANIMILAIR_MESSAGE_MAX_ATTACHMENTS)) {
    if (!item || typeof item !== 'object') continue
    const input = item as Record<string, unknown>
    const type = String(input.type || '').trim()
    if (type === 'link') {
      const url = String(input.url || '').trim().slice(0, 1000)
      if (!/^https?:\/\//i.test(url)) continue
      result.push({
        type: 'link',
        url,
        caption: String(input.caption || '').trim().slice(0, 120),
      })
      continue
    }
    const url = String(input.url || '').trim().slice(0, 1000)
    const isStoredUpload = url.startsWith('/uploads/') || url.startsWith('/api/uploads/')
    if (!isStoredUpload) continue
    const name = String(input.name || '').trim().slice(0, 255) || 'file'
    const mime = String(input.mime || '').trim().slice(0, 120)
    const size = Math.max(0, Number(input.size) || 0)
    if (type === 'image' && (mime.startsWith('image/') || isStoredUpload)) {
      result.push({ type: 'image', url, name, mime: mime || 'image/jpeg', size })
      continue
    }
    if (type === 'file') {
      result.push({ type: 'file', url, name, mime, size })
    }
  }
  return result
}

function isAnimilairSupportMessage(row: MessageRow): boolean {
  if (row.user_id === ANIMILAIR_SUPPORT_USER_ID) return true
  return ANIMILAIR_ORDER_STATUS_BODIES.has(String(row.body || '').trim())
}

function mapMessage(row: MessageRow): AnimilairOrderMessage {
  const isSystem = isAnimilairSupportMessage(row)
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    userId: row.user_id,
    authorName: isSystem ? ANIMILAIR_SUPPORT_NAME : String(row.author_name || 'Користувач'),
    authorAvatarUrl: isSystem ? ANIMILAIR_SUPPORT_AVATAR : row.author_avatar_url,
    body: row.body,
    attachments: normalizeMessageAttachments(parseJson(row.attachments_json, [])),
    createdAt: row.created_at,
    isSystem,
  }
}

async function uniqueProductSlug(title: string, excludeId?: number) {
  const base = slugify(title)
  for (let index = 0; index < 20; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number | bigint }>>(
      excludeId
        ? `SELECT id FROM app_animilair_products WHERE slug = ? AND id != ? LIMIT 1`
        : `SELECT id FROM app_animilair_products WHERE slug = ? LIMIT 1`,
      ...(excludeId ? [slug, excludeId] : [slug])
    )
    if (!rows[0]) return slug
  }
  return `${base}-${Date.now()}`
}

async function uniqueAuthorSlug(name: string) {
  const base = slugify(name)
  for (let index = 0; index < 20; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number | bigint }>>(
      `SELECT id FROM app_animilair_authors WHERE slug = ? LIMIT 1`,
      slug
    )
    if (!rows[0]) return slug
  }
  return `${base}-${Date.now()}`
}

async function ensureAnimilairOrderArchiveColumns(): Promise<void> {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(app_animilair_orders)`
  )
  const names = new Set(columns.map((column) => column.name))
  if (!names.has('customer_archived_at')) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE app_animilair_orders ADD COLUMN customer_archived_at TEXT`
    )
  }
  if (!names.has('author_archived_at')) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE app_animilair_orders ADD COLUMN author_archived_at TEXT`
    )
  }
}

async function ensureAnimilairSupportUser(): Promise<void> {
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM app_users WHERE id = ? LIMIT 1`,
    ANIMILAIR_SUPPORT_USER_ID
  )
  if (existing[0]) return
  const now = nowIso()
  const passwordHash = createHash('sha256').update(`${ANIMILAIR_SUPPORT_USER_ID}:no-login`).digest('hex')
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO app_users (
      id, email, password_hash, full_name, profile_slug, bio, location, role, created_at, updated_at, is_legacy, theme
    ) VALUES (?, ?, ?, ?, NULL, '', '', 'ADMIN', ?, ?, 0, 'dark')`,
    ANIMILAIR_SUPPORT_USER_ID,
    ANIMILAIR_SUPPORT_EMAIL,
    passwordHash,
    ANIMILAIR_SUPPORT_NAME,
    now,
    now
  )
  const verified = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM app_users WHERE id = ? LIMIT 1`,
    ANIMILAIR_SUPPORT_USER_ID
  )
  if (!verified[0]) {
    throw new Error('Не вдалося створити системний профіль EyzenCore Support')
  }
}

export async function ensureAnimilairSeedData() {
  await ensureAnimilairSupportUser()
  await ensureAnimilairOrderArchiveColumns()
  const now = nowIso()
  const authors = [
    {
      slug: 'animilair-studio',
      name: 'AnimiLair Studio',
      role: 'Creative partner',
      bio: 'Команда, яка робить айдентику, рендери, анімації та промо-матеріали для Minecraft і Discord проєктів.',
      position: 1,
    },
    {
      slug: 'lair-render',
      name: 'Lair Render',
      role: '3D artist',
      bio: 'Рендери персонажів, сцен, банерів і постерів для сезонів, вайпів та рекламних кампаній.',
      position: 2,
    },
    {
      slug: 'lair-motion',
      name: 'Lair Motion',
      role: 'Motion designer',
      bio: 'Короткі анімації, трейлери, інтро та промо-ролики для соцмереж і Discord-анонсів.',
      position: 3,
    },
  ]

  for (const author of authors) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO app_animilair_authors
        (slug, name, role, bio, avatar_url, banner_url, socials_json, position, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      author.slug,
      author.name,
      author.role,
      author.bio,
      null,
      null,
      JSON.stringify({ website: 'https://eyzencore.com/partners/animilair' }),
      author.position,
      now,
      now
    )
  }

  const authorRows = await prisma.$queryRawUnsafe<Array<{ id: number | bigint; slug: string }>>(
    `SELECT id, slug FROM app_animilair_authors WHERE slug IN (?, ?, ?)`,
    'animilair-studio',
    'lair-render',
    'lair-motion'
  )
  const authorBySlug = new Map(authorRows.map((author) => [author.slug, Number(author.id)]))

  const products = [
    {
      author: 'animilair-studio',
      slug: 'server-branding-pack',
      title: 'Брендинг сервера під ключ',
      category: 'branding',
      shortDesc: 'Лого, банер, Discord-візуал і базовий стиль для запуску або ребрендингу сервера.',
      description: 'Підійде для Minecraft або Discord проєкту, якому потрібен впізнаваний вигляд. У пакет можна включити логотип, банер, аватар, прев’ю для новин, кольори та простий бренд-гайд.',
      priceFrom: 1200,
      deliveryDays: 5,
      tags: ['logo', 'banner', 'discord', 'minecraft'],
      featured: 1,
    },
    {
      author: 'lair-render',
      slug: 'minecraft-render-poster',
      title: 'Minecraft рендер або постер',
      category: 'render',
      shortDesc: 'Сцена з персонажами, локацією, мобами або предметами для банера, сайту чи анонсу.',
      description: 'Створюємо атмосферний 3D-рендер під ваш сервер: вайп, турнір, сезон, RPG-івент, виживання або промо нового режиму. Можна додати скіни гравців, логотип і текст.',
      priceFrom: 800,
      deliveryDays: 3,
      tags: ['3d', 'poster', 'render', 'season'],
      featured: 1,
    },
    {
      author: 'lair-motion',
      slug: 'short-animation-trailer',
      title: 'Коротка анімація або трейлер',
      category: 'motion',
      shortDesc: 'Ролик для TikTok, YouTube Shorts, Discord-анонсу або презентації оновлення.',
      description: 'Робимо короткий motion-ролик з вашим стилем, текстом, кадрами сервера й музичним темпом. Добре працює для відкриття сезону, івентів, розіграшів і великих оновлень.',
      priceFrom: 1800,
      deliveryDays: 7,
      tags: ['animation', 'trailer', 'shorts', 'promo'],
      featured: 0,
    },
  ]

  for (const product of products) {
    const authorId = authorBySlug.get(product.author)
    if (!authorId) continue
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO app_animilair_products
        (author_id, slug, title, category, short_desc, description, price_from, delivery_days, cover_url, tags_json, status, featured, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
      authorId,
      product.slug,
      product.title,
      product.category,
      product.shortDesc,
      product.description,
      product.priceFrom,
      product.deliveryDays,
      null,
      JSON.stringify(product.tags),
      product.featured,
      now,
      now
    )
  }
}

export async function getAnimilairCatalog() {
  await ensureAnimilairSeedData()
  const [authors, productRows, media, designerRows] = await Promise.all([
    prisma.$queryRawUnsafe<AuthorRow[]>(
      `SELECT * FROM app_animilair_authors WHERE is_active = 1 ORDER BY position ASC, id ASC`
    ),
    prisma.$queryRawUnsafe<ProductRow[]>(
      `SELECT p.*, a.user_id AS author_user_id, a.slug AS author_slug, a.name AS author_name,
              a.role AS author_role, a.bio AS author_bio, a.avatar_url AS author_avatar_url,
              a.banner_url AS author_banner_url, a.socials_json AS author_socials_json,
            a.welcome_message AS author_welcome_message, a.last_seen_at AS author_last_seen_at,
              a.welcome_message AS author_welcome_message, a.last_seen_at AS author_last_seen_at
       FROM app_animilair_products p
       JOIN app_animilair_authors a ON a.id = p.author_id
       WHERE p.status = 'published'
       ORDER BY p.featured DESC, p.id ASC`
    ),
    prisma.$queryRawUnsafe<MediaRow[]>(
      `SELECT * FROM app_animilair_product_media ORDER BY product_id ASC, position ASC, id ASC`
    ),
    prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM app_users WHERE UPPER(role) IN ('DESIGNER', 'ADMIN')`
    ),
  ])
  const visibleProductRows = productRows.filter(
    (product) => isValidCoverUrl(product.cover_url) && isAnimilairCatalogCategory(product.category)
  )
  const viewCounts = await getAnimilairProductViewCounts(visibleProductRows.map((product) => Number(product.id)))
  const ratingStats = await getAnimilairProductRatingStats(visibleProductRows.map((product) => Number(product.id)))
  const products = visibleProductRows.map((product) => {
    const productId = Number(product.id)
    return mapProduct(
      product,
      media,
      viewCounts.get(productId) || 0,
      ratingStats.get(productId) || { average: null, count: 0 }
    )
  })
  const authorIdsWithProducts = new Set(products.map((product) => product.authorId))
  const designerUserIds = new Set(designerRows.map((row) => row.id))
  const visibleAuthors = authors.filter((author) => {
    if (authorIdsWithProducts.has(Number(author.id))) return true
    if (author.user_id && designerUserIds.has(author.user_id)) return true
    return false
  })
  return {
    authors: visibleAuthors.map(mapAuthor),
    products,
  }
}

export async function getAnimilairProduct(slugOrId: string | number) {
  await ensureAnimilairSeedData()
  const field = Number.isFinite(Number(slugOrId)) ? 'p.id = ?' : 'p.slug = ?'
  const rows = await prisma.$queryRawUnsafe<ProductRow[]>(
    `SELECT p.*, a.user_id AS author_user_id, a.slug AS author_slug, a.name AS author_name,
            a.role AS author_role, a.bio AS author_bio, a.avatar_url AS author_avatar_url,
            a.banner_url AS author_banner_url, a.socials_json AS author_socials_json,
            a.welcome_message AS author_welcome_message, a.last_seen_at AS author_last_seen_at
     FROM app_animilair_products p
     JOIN app_animilair_authors a ON a.id = p.author_id
     WHERE ${field} AND p.status = 'published'
     LIMIT 1`,
    slugOrId
  )
  const product = rows[0]
  if (!product) return null
  const [media, viewRows, ratingRows] = await Promise.all([
    prisma.$queryRawUnsafe<MediaRow[]>(
      `SELECT * FROM app_animilair_product_media WHERE product_id = ? ORDER BY position ASC, id ASC`,
      Number(product.id)
    ),
    prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS c FROM app_animilair_product_views WHERE product_id = ?`,
      Number(product.id)
    ),
    prisma.$queryRawUnsafe<Array<{ average_rating: number | null; review_count: number | bigint | null }>>(
      `SELECT AVG(rating) AS average_rating, COUNT(*) AS review_count
       FROM app_animilair_product_reviews
       WHERE product_id = ?`,
      Number(product.id)
    ),
  ])
  const reviewCount = countToNumber(ratingRows[0]?.review_count)
  return mapProduct(product, media, countToNumber(viewRows[0]?.c), {
    average: reviewCount > 0 ? Number(ratingRows[0]?.average_rating || 0) : null,
    count: reviewCount,
  })
}

export async function getOrCreateDesignerAuthor(user: AuthUser, role: UserRole) {
  if (!roleCanSell(role)) {
    throw new Error('Створювати послуги можуть лише дизайнери AnimiLair або адміністратор')
  }

  const existing = await prisma.$queryRawUnsafe<AuthorRow[]>(
    `SELECT * FROM app_animilair_authors WHERE user_id = ? LIMIT 1`,
    user.id
  )
  if (existing[0]) return mapAuthor(existing[0])

  const now = nowIso()
  const name = user.user_metadata.full_name || user.email.split('@')[0] || 'Designer'
  const slug = await uniqueAuthorSlug(name)
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_animilair_authors
      (user_id, slug, name, role, bio, avatar_url, banner_url, socials_json, position, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'Designer', '', ?, ?, '{}', 100, 1, ?, ?)`,
    user.id,
    slug,
    name,
    user.user_metadata.avatar_url || null,
    user.user_metadata.banner_url || null,
    now,
    now
  )

  const created = await prisma.$queryRawUnsafe<AuthorRow[]>(
    `SELECT * FROM app_animilair_authors WHERE user_id = ? LIMIT 1`,
    user.id
  )
  return mapAuthor(created[0])
}

export async function createAnimilairProduct(input: {
  user: AuthUser
  role: UserRole
  title: string
  category: string
  description: string
  priceFrom?: number | null
  deliveryDays?: number | null
  coverUrl?: string | null
  tags?: string[]
  media?: string[]
}) {
  const author = await getOrCreateDesignerAuthor(input.user, input.role)
  const title = input.title.trim().slice(0, 120)
  const { shortDesc, description } = splitAnimilairProductDescription(input.description)
  if (!title || !description) {
    throw new Error('Заповніть назву та опис послуги')
  }

  const now = nowIso()
  const slug = await uniqueProductSlug(title)
  const tags = (input.tags || []).map((tag) => tag.trim()).filter(Boolean).slice(0, 8)
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_animilair_products
      (author_id, slug, title, category, short_desc, description, price_from, delivery_days, cover_url, tags_json, status, featured, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 0, ?, ?)`,
    author.id,
    slug,
    title,
    input.category.trim().slice(0, 40) || 'design',
    shortDesc,
    description,
    input.priceFrom || null,
    input.deliveryDays || null,
    input.coverUrl?.trim() || null,
    JSON.stringify(tags),
    now,
    now
  )
  const idRows = await prisma.$queryRawUnsafe<Array<{ id: number | bigint }>>('SELECT last_insert_rowid() AS id')
  const productId = Number(idRows[0]?.id || 0)

  const media = (input.media || []).filter(Boolean).slice(0, 8)
  for (let index = 0; index < media.length; index += 1) {
    const url = media[index]
    await prisma.$executeRawUnsafe(
      `INSERT INTO app_animilair_product_media (product_id, type, url, caption, position, created_at)
       VALUES (?, 'image', ?, '', ?, ?)`,
      productId,
      url,
      index + 1,
      now
    )
  }

  return getAnimilairProduct(productId)
}

export async function getAnimilairProductsForManager(user: AuthUser, role: UserRole) {
  await ensureAnimilairSeedData()
  const isAdmin = role === 'ADMIN'
  const rows = await prisma.$queryRawUnsafe<ProductRow[]>(
    isAdmin
      ? `SELECT p.*, a.user_id AS author_user_id, a.slug AS author_slug, a.name AS author_name,
                a.role AS author_role, a.bio AS author_bio, a.avatar_url AS author_avatar_url,
                a.banner_url AS author_banner_url, a.socials_json AS author_socials_json,
            a.welcome_message AS author_welcome_message, a.last_seen_at AS author_last_seen_at,
              a.welcome_message AS author_welcome_message, a.last_seen_at AS author_last_seen_at
         FROM app_animilair_products p
         JOIN app_animilair_authors a ON a.id = p.author_id
         WHERE p.status != 'deleted'
         ORDER BY datetime(p.updated_at) DESC, p.id DESC`
      : `SELECT p.*, a.user_id AS author_user_id, a.slug AS author_slug, a.name AS author_name,
                a.role AS author_role, a.bio AS author_bio, a.avatar_url AS author_avatar_url,
                a.banner_url AS author_banner_url, a.socials_json AS author_socials_json,
            a.welcome_message AS author_welcome_message, a.last_seen_at AS author_last_seen_at,
              a.welcome_message AS author_welcome_message, a.last_seen_at AS author_last_seen_at
         FROM app_animilair_products p
         JOIN app_animilair_authors a ON a.id = p.author_id
         WHERE p.status != 'deleted' AND a.user_id = ?
         ORDER BY datetime(p.updated_at) DESC, p.id DESC`,
    ...(isAdmin ? [] : [user.id])
  )
  const media = await prisma.$queryRawUnsafe<MediaRow[]>(
    `SELECT * FROM app_animilair_product_media ORDER BY product_id ASC, position ASC, id ASC`
  )
  const viewCounts = await getAnimilairProductViewCounts(rows.map((product) => Number(product.id)))
  const ratingStats = await getAnimilairProductRatingStats(rows.map((product) => Number(product.id)))
  return rows.map((product) => {
    const productId = Number(product.id)
    return mapProduct(
      product,
      media,
      viewCounts.get(productId) || 0,
      ratingStats.get(productId) || { average: null, count: 0 }
    )
  })
}

async function getAnimilairProductRow(slugOrId: string | number) {
  const field = Number.isFinite(Number(slugOrId)) ? 'p.id = ?' : 'p.slug = ?'
  const rows = await prisma.$queryRawUnsafe<ProductRow[]>(
    `SELECT p.*, a.user_id AS author_user_id, a.slug AS author_slug, a.name AS author_name,
            a.role AS author_role, a.bio AS author_bio, a.avatar_url AS author_avatar_url,
            a.banner_url AS author_banner_url, a.socials_json AS author_socials_json,
            a.welcome_message AS author_welcome_message, a.last_seen_at AS author_last_seen_at
     FROM app_animilair_products p
     JOIN app_animilair_authors a ON a.id = p.author_id
     WHERE ${field} AND p.status != 'deleted'
     LIMIT 1`,
    slugOrId
  )
  return rows[0] || null
}

export async function updateAnimilairProduct(input: {
  slugOrId: string | number
  user: AuthUser
  role: UserRole
  title: string
  category: string
  description: string
  priceFrom?: number | null
  deliveryDays?: number | null
  coverUrl?: string | null
  tags?: string[]
  media?: string[]
}) {
  const row = await getAnimilairProductRow(input.slugOrId)
  if (!row) throw new Error('Товар не знайдено')
  if (!canManageAnimilairProduct(input.user, input.role, row.author_user_id || null)) {
    throw new Error('Немає доступу до редагування цього товару')
  }
  const title = input.title.trim().slice(0, 120)
  const { shortDesc, description } = splitAnimilairProductDescription(input.description)
  if (!title || !description) {
    throw new Error('Заповніть назву та опис послуги')
  }
  const now = nowIso()
  const tags = (input.tags || []).map((tag) => tag.trim()).filter(Boolean).slice(0, 8)
  const productId = Number(row.id)
  const slug = await uniqueProductSlug(title, productId)
  await prisma.$executeRawUnsafe(
    `UPDATE app_animilair_products
     SET slug = ?, title = ?, category = ?, short_desc = ?, description = ?, price_from = ?, delivery_days = ?,
         cover_url = ?, tags_json = ?, updated_at = ?
     WHERE id = ?`,
    slug,
    title,
    input.category.trim().slice(0, 40) || 'design',
    shortDesc,
    description,
    input.priceFrom || null,
    input.deliveryDays || null,
    input.coverUrl?.trim() || null,
    JSON.stringify(tags),
    now,
    productId
  )
  if (input.media !== undefined) {
    await prisma.$executeRawUnsafe(`DELETE FROM app_animilair_product_media WHERE product_id = ?`, productId)
    const media = input.media.filter(Boolean).slice(0, 8)
    for (let index = 0; index < media.length; index += 1) {
      const url = media[index]
      await prisma.$executeRawUnsafe(
        `INSERT INTO app_animilair_product_media (product_id, type, url, caption, position, created_at)
         VALUES (?, 'image', ?, '', ?, ?)`,
        productId,
        url,
        index + 1,
        now
      )
    }
  }
  return getAnimilairProduct(productId)
}

export async function deleteAnimilairProduct(input: {
  slugOrId: string | number
  user: AuthUser
  role: UserRole
}) {
  const row = await getAnimilairProductRow(input.slugOrId)
  if (!row) throw new Error('Товар не знайдено')
  if (!canManageAnimilairProduct(input.user, input.role, row.author_user_id || null)) {
    throw new Error('Немає доступу до видалення цього товару')
  }
  const now = nowIso()
  await prisma.$executeRawUnsafe(
    `UPDATE app_animilair_products SET status = 'deleted', updated_at = ? WHERE id = ?`,
    now,
    Number(row.id)
  )
  return { success: true }
}

export async function createAnimilairOrder(input: {
  productId: number
  user: AuthUser
  title: string
  brief: string
  budget?: string
  deadline?: string | null
  contact?: string
}) {
  const product = await getAnimilairProduct(input.productId)
  if (!product) throw new Error('Послугу не знайдено')

  const title = input.title.trim().slice(0, 140)
  const brief = input.brief.trim().slice(0, 5000)
  if (!title) throw new Error('Заповніть назву замовлення')

  const now = nowIso()
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_animilair_orders
      (product_id, customer_id, status, title, brief, budget, deadline, contact, created_at, updated_at)
     VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?)`,
    product.id,
    input.user.id,
    title,
    brief,
    String(input.budget || '').trim().slice(0, 80),
    input.deadline ? String(input.deadline).trim().slice(0, 40) : null,
    String(input.contact || '').trim().slice(0, 160),
    now,
    now
  )
  const idRows = await prisma.$queryRawUnsafe<Array<{ id: number | bigint }>>('SELECT last_insert_rowid() AS id')
  const orderId = Number(idRows[0]?.id || 0)

  if (brief) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO app_animilair_order_messages (order_id, user_id, body, attachments_json, created_at)
       VALUES (?, ?, ?, '[]', ?)`,
      orderId,
      input.user.id,
      brief,
      now
    )
  }

  return getAnimilairOrder(orderId, input.user, 'USER')
}

export async function ensureAnimilairCustomerOrder(input: {
  productId: number
  user: AuthUser
  role?: UserRole
}) {
  const role = input.role || 'USER'
  const product = await getAnimilairProduct(input.productId)
  if (!product) throw new Error('Послугу не знайдено')

  if (product.author?.userId === input.user.id) {
    throw new Error('Дизайнер не може замовити власну послугу')
  }

  const existing = await getAnimilairOrdersForProduct(input.productId, input.user, role)
  const active = existing.find(
    (order) => order.customerId === input.user.id && !['canceled', 'completed'].includes(order.status)
  )
  if (active) return active

  return createAnimilairOrder({
    productId: input.productId,
    user: input.user,
    title: `Замовлення: ${product.title}`,
    brief: '',
    budget: product.priceFrom ? `${product.priceFrom} грн` : '',
    deadline: product.deliveryDays ? `${product.deliveryDays} дн.` : null,
  })
}

export async function touchAnimilairAuthorPresence(userId: string) {
  const now = nowIso()
  await prisma.$executeRawUnsafe(
    `UPDATE app_animilair_authors SET last_seen_at = ?, updated_at = ? WHERE user_id = ?`,
    now,
    now,
    userId
  )
}

export async function getAnimilairAuthorPresence(authorUserId: string | null) {
  if (!authorUserId) {
    return { isOnline: false, lastSeenAt: null as string | null }
  }
  const rows = await prisma.$queryRawUnsafe<Array<{ last_seen_at: string | null }>>(
    `SELECT last_seen_at FROM app_animilair_authors WHERE user_id = ? LIMIT 1`,
    authorUserId
  )
  const lastSeenAt = rows[0]?.last_seen_at || null
  return { isOnline: isAnimilairAuthorOnline(lastSeenAt), lastSeenAt }
}

export async function updateAnimilairAuthorWelcome(input: {
  user: AuthUser
  role: UserRole
  authorId: number
  welcomeMessage: string
}) {
  const rows = await prisma.$queryRawUnsafe<AuthorRow[]>(
    `SELECT * FROM app_animilair_authors WHERE id = ? LIMIT 1`,
    input.authorId
  )
  const row = rows[0]
  if (!row) throw new Error('Автора не знайдено')
  if (!canManageAnimilairProduct(input.user, input.role, row.user_id)) {
    throw new Error('Немає доступу до редагування вітання')
  }
  const welcomeMessage = input.welcomeMessage.trim().slice(0, 600)
  const now = nowIso()
  await prisma.$executeRawUnsafe(
    `UPDATE app_animilair_authors SET welcome_message = ?, updated_at = ? WHERE id = ?`,
    welcomeMessage,
    now,
    input.authorId
  )
  const updated = await prisma.$queryRawUnsafe<AuthorRow[]>(
    `SELECT * FROM app_animilair_authors WHERE id = ? LIMIT 1`,
    input.authorId
  )
  return mapAuthor(updated[0])
}

export async function getAnimilairOrders(user: AuthUser, role: UserRole = 'USER') {
  await ensureAnimilairSeedData()
  const isAdmin = role === 'ADMIN'
  const rows = await prisma.$queryRawUnsafe<OrderRow[]>(
    `SELECT o.*, p.title AS product_title, p.slug AS product_slug, p.cover_url AS product_cover_url,
            a.user_id AS author_user_id, a.name AS author_name,
            u.full_name AS customer_name, u.avatar_url AS customer_avatar_url
     FROM app_animilair_orders o
     JOIN app_animilair_products p ON p.id = o.product_id
     JOIN app_animilair_authors a ON a.id = p.author_id
     JOIN app_users u ON u.id = o.customer_id
     ${isAdmin
      ? `WHERE NOT (o.customer_archived_at IS NOT NULL AND o.author_archived_at IS NOT NULL)`
      : `WHERE (o.customer_id = ? AND o.customer_archived_at IS NULL)
              OR (a.user_id = ? AND o.author_archived_at IS NULL)`}
     ORDER BY datetime(o.updated_at) DESC, o.id DESC`,
    ...(isAdmin ? [] : [user.id, user.id])
  )
  return rows.map(mapOrder)
}

export async function getAnimilairOrdersForProduct(productId: number, user: AuthUser, role: UserRole = 'USER') {
  await ensureAnimilairOrderArchiveColumns()
  const isAdmin = role === 'ADMIN'
  const rows = await prisma.$queryRawUnsafe<OrderRow[]>(
    `SELECT o.*, p.title AS product_title, p.slug AS product_slug, p.cover_url AS product_cover_url,
            a.user_id AS author_user_id, a.name AS author_name,
            u.full_name AS customer_name, u.avatar_url AS customer_avatar_url
     FROM app_animilair_orders o
     JOIN app_animilair_products p ON p.id = o.product_id
     JOIN app_animilair_authors a ON a.id = p.author_id
     JOIN app_users u ON u.id = o.customer_id
     WHERE o.product_id = ?
     ${isAdmin
      ? `AND NOT (o.customer_archived_at IS NOT NULL AND o.author_archived_at IS NOT NULL)`
      : `AND ((o.customer_id = ? AND o.customer_archived_at IS NULL)
               OR (a.user_id = ? AND o.author_archived_at IS NULL))`}
     ORDER BY datetime(o.updated_at) DESC, o.id DESC`,
    ...(isAdmin ? [productId] : [productId, user.id, user.id])
  )
  return rows.map(mapOrder)
}

export async function getAnimilairOrder(id: number, user: AuthUser, role: UserRole = 'USER') {
  const rows = await prisma.$queryRawUnsafe<OrderRow[]>(
    `SELECT o.*, p.title AS product_title, p.slug AS product_slug, p.cover_url AS product_cover_url,
            a.user_id AS author_user_id, a.name AS author_name,
            u.full_name AS customer_name, u.avatar_url AS customer_avatar_url
     FROM app_animilair_orders o
     JOIN app_animilair_products p ON p.id = o.product_id
     JOIN app_animilair_authors a ON a.id = p.author_id
     JOIN app_users u ON u.id = o.customer_id
     WHERE o.id = ?
     LIMIT 1`,
    id
  )
  const order = rows[0] ? mapOrder(rows[0]) : null
  if (!order) return null
  const canAccess = role === 'ADMIN' || order.customerId === user.id || order.authorUserId === user.id
  if (!canAccess) throw new Error('Немає доступу до цього замовлення')
  return order
}

export async function getAnimilairMessages(orderId: number, user: AuthUser, role: UserRole = 'USER') {
  await getAnimilairOrder(orderId, user, role)
  const rows = await prisma.$queryRawUnsafe<MessageRow[]>(
    `SELECT m.*, u.full_name AS author_name, u.avatar_url AS author_avatar_url
     FROM app_animilair_order_messages m
     LEFT JOIN app_users u ON u.id = m.user_id
     WHERE m.order_id = ?
     ORDER BY datetime(m.created_at) ASC, m.id ASC`,
    orderId
  )
  return rows.map(mapMessage)
}

export async function addAnimilairMessage(input: {
  orderId: number
  user: AuthUser
  role?: UserRole
  body: string
  attachments?: AnimilairMessageAttachment[]
}) {
  await getAnimilairOrder(input.orderId, input.user, input.role || 'USER')
  const body = input.body.trim().slice(0, ANIMILAIR_MESSAGE_MAX_LENGTH)
  const attachments = normalizeMessageAttachments(input.attachments || [])
  if (!body && attachments.length === 0) {
    throw new Error('Напишіть повідомлення або додайте вкладення')
  }
  const now = nowIso()
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_animilair_order_messages (order_id, user_id, body, attachments_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    input.orderId,
    input.user.id,
    body,
    JSON.stringify(attachments),
    now
  )
  await prisma.$executeRawUnsafe(
    `UPDATE app_animilair_orders SET updated_at = ? WHERE id = ?`,
    now,
    input.orderId
  )
  return getAnimilairMessages(input.orderId, input.user, input.role || 'USER')
}

export async function updateAnimilairOrderStatus(input: {
  orderId: number
  user: AuthUser
  role?: UserRole
  status: string
}) {
  const role = input.role || 'USER'
  const order = await getAnimilairOrder(input.orderId, input.user, role)
  if (!order) throw new Error('Замовлення не знайдено')

  const nextStatus = String(input.status || '').trim()
  const allowed = new Set(['new', 'in_progress', 'waiting_customer', 'awaiting_confirmation', 'completed', 'canceled'])
  if (!allowed.has(nextStatus)) throw new Error('Некоректний статус замовлення')

  const isAdmin = role === 'ADMIN'
  const isDesigner = order.authorUserId === input.user.id
  const isCustomer = order.customerId === input.user.id
  const currentStatus = order.status

  const designerTransitions: Record<string, string[]> = {
    new: ['in_progress'],
    in_progress: ['waiting_customer', 'awaiting_confirmation'],
    waiting_customer: ['in_progress', 'awaiting_confirmation'],
  }
  const customerTransitions: Record<string, string[]> = {
    new: ['canceled'],
    in_progress: ['canceled'],
    waiting_customer: ['canceled'],
    awaiting_confirmation: ['completed', 'canceled'],
  }

  let canUpdate = false
  if (isAdmin) {
    canUpdate = true
  } else if (isDesigner && designerTransitions[currentStatus]?.includes(nextStatus)) {
    canUpdate = true
  } else if (isCustomer && customerTransitions[currentStatus]?.includes(nextStatus)) {
    canUpdate = true
  }

  if (!canUpdate) {
    throw new Error('Немає доступу до зміни статусу')
  }

  if (nextStatus === 'completed' && currentStatus !== 'awaiting_confirmation' && !isAdmin) {
    throw new Error('Замовлення можна завершити лише після підтвердження покупцем')
  }

  const statusMessages = ANIMILAIR_ORDER_STATUS_MESSAGES
  const statusBody = statusMessages[nextStatus] || `Статус замовлення: ${nextStatus}`
  const now = nowIso()
  await ensureAnimilairSupportUser()
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE app_animilair_orders SET status = ?, updated_at = ? WHERE id = ?`,
      nextStatus,
      now,
      input.orderId
    )
    await tx.$executeRawUnsafe(
      `INSERT INTO app_animilair_order_messages (order_id, user_id, body, attachments_json, created_at)
       VALUES (?, ?, ?, '[]', ?)`,
      input.orderId,
      ANIMILAIR_SUPPORT_USER_ID,
      statusBody,
      now
    )
  })

  return getAnimilairOrder(input.orderId, input.user, role)
}

export async function archiveAnimilairOrder(input: {
  orderId: number
  user: AuthUser
  role?: UserRole
}) {
  await ensureAnimilairOrderArchiveColumns()
  const role = input.role || 'USER'
  const order = await getAnimilairOrder(input.orderId, input.user, role)
  if (!order) throw new Error('Замовлення не знайдено')
  if (!isAnimilairOrderClosed(order.status)) {
    throw new Error('Прибрати зі списку можна лише завершені або скасовані замовлення')
  }
  const isAdmin = role === 'ADMIN'
  const isCustomer = order.customerId === input.user.id
  const isDesigner = order.authorUserId === input.user.id
  if (!isAdmin && !isCustomer && !isDesigner) {
    throw new Error('Немає доступу до цього замовлення')
  }
  const now = nowIso()
  if (isAdmin || isCustomer) {
    await prisma.$executeRawUnsafe(
      `UPDATE app_animilair_orders SET customer_archived_at = ?, updated_at = ? WHERE id = ?`,
      now,
      now,
      input.orderId
    )
  }
  if (isAdmin || isDesigner) {
    await prisma.$executeRawUnsafe(
      `UPDATE app_animilair_orders SET author_archived_at = ?, updated_at = ? WHERE id = ?`,
      now,
      now,
      input.orderId
    )
  }
  return { success: true }
}

export async function getAnimilairProductReviews(productId: number, limit = 20) {
  const rows = await prisma.$queryRawUnsafe<ReviewRow[]>(
    `SELECT r.*, u.full_name AS customer_name, u.avatar_url AS customer_avatar_url
     FROM app_animilair_product_reviews r
     JOIN app_users u ON u.id = r.customer_id
     WHERE r.product_id = ?
     ORDER BY datetime(r.created_at) DESC, r.id DESC
     LIMIT ?`,
    productId,
    Math.max(1, Math.min(limit, 50))
  )
  return rows.map(mapReview)
}

export async function getAnimilairOrderReview(orderId: number, user: AuthUser, role: UserRole = 'USER') {
  await getAnimilairOrder(orderId, user, role)
  const rows = await prisma.$queryRawUnsafe<ReviewRow[]>(
    `SELECT r.*, u.full_name AS customer_name, u.avatar_url AS customer_avatar_url
     FROM app_animilair_product_reviews r
     JOIN app_users u ON u.id = r.customer_id
     WHERE r.order_id = ?
     LIMIT 1`,
    orderId
  )
  return rows[0] ? mapReview(rows[0]) : null
}

export async function createAnimilairProductReview(input: {
  orderId: number
  user: AuthUser
  role?: UserRole
  rating: number
  body?: string
}) {
  const role = input.role || 'USER'
  const order = await getAnimilairOrder(input.orderId, input.user, role)
  if (!order) throw new Error('Замовлення не знайдено')
  if (order.customerId !== input.user.id && role !== 'ADMIN') {
    throw new Error('Відгук може залишити лише покупець')
  }
  if (order.status !== 'completed') {
    throw new Error('Відгук доступний лише після завершення замовлення')
  }

  const existing = await prisma.$queryRawUnsafe<Array<{ id: number | bigint }>>(
    `SELECT id FROM app_animilair_product_reviews WHERE order_id = ? LIMIT 1`,
    input.orderId
  )
  if (existing[0]) throw new Error('Відгук по цьому замовленню вже залишено')

  const rating = Math.round(Number(input.rating))
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Оцінка має бути від 1 до 5')
  }
  const body = String(input.body || '').trim().slice(0, 2000)
  const now = nowIso()

  await prisma.$executeRawUnsafe(
    `INSERT INTO app_animilair_product_reviews
      (product_id, order_id, customer_id, rating, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    order.productId,
    order.id,
    order.customerId,
    rating,
    body,
    now,
    now
  )

  const rows = await prisma.$queryRawUnsafe<ReviewRow[]>(
    `SELECT r.*, u.full_name AS customer_name, u.avatar_url AS customer_avatar_url
     FROM app_animilair_product_reviews r
     JOIN app_users u ON u.id = r.customer_id
     WHERE r.order_id = ?
     LIMIT 1`,
    order.id
  )
  return rows[0] ? mapReview(rows[0]) : null
}

export async function getAnimilairHeroDescription(): Promise<string> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ animilair_hero_description?: string }>>(
      `SELECT animilair_hero_description FROM app_site_settings WHERE id = 1 LIMIT 1`
    )
    const text = String(rows[0]?.animilair_hero_description || '').trim()
    return text || ANIMILAIR_DEFAULT_HERO_DESCRIPTION
  } catch {
    return ANIMILAIR_DEFAULT_HERO_DESCRIPTION
  }
}

export async function updateAnimilairHeroDescription(input: {
  user: AuthUser
  role: UserRole
  description: string
}) {
  if (!roleCanSell(input.role)) {
    throw new Error('Редагувати опис маркетплейсу можуть лише дизайнери AnimiLair або адміністратор')
  }
  const description = input.description.trim().slice(0, 600)
  if (!description) {
    throw new Error('Опис не може бути порожнім')
  }
  const now = nowIso()
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_site_settings
      (id, maintenance_enabled, maintenance_title, maintenance_message, animilair_hero_description, updated_at)
     VALUES (1, 0, 'Технічні роботи', 'Ми оновлюємо Eyzencore. Сайт незабаром повернеться.', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       animilair_hero_description = excluded.animilair_hero_description,
       updated_at = excluded.updated_at`,
    description,
    now
  )
  return description
}
