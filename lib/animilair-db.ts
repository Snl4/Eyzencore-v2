import { prisma } from '@/lib/prisma'
import type { AuthUser, UserRole } from '@/lib/auth-db'

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
  media: Array<{ id: number; type: string; url: string; caption: string }>
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

export type AnimilairOrderMessage = {
  id: number
  orderId: number
  userId: string
  authorName: string
  authorAvatarUrl: string | null
  body: string
  createdAt: string
}

type AuthorRow = {
  id: number | bigint
  user_id: string | null
  slug: string
  name: string
  role: string
  bio: string
  avatar_url: string | null
  banner_url: string | null
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9а-яіїєґё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `product-${Date.now()}`
}

function roleCanSell(role: UserRole) {
  return role === 'DESIGNER' || role === 'ADMIN'
}

function mapAuthor(row: AuthorRow): AnimilairAuthor {
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
  }
}

function mapProduct(row: ProductRow, media: MediaRow[] = []): AnimilairProduct {
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

function mapMessage(row: MessageRow): AnimilairOrderMessage {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    userId: row.user_id,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    body: row.body,
    createdAt: row.created_at,
  }
}

async function uniqueProductSlug(title: string) {
  const base = slugify(title)
  for (let index = 0; index < 20; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number | bigint }>>(
      `SELECT id FROM app_animilair_products WHERE slug = ? LIMIT 1`,
      slug
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

export async function ensureAnimilairSeedData() {
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
  const [authors, products, media] = await Promise.all([
    prisma.$queryRawUnsafe<AuthorRow[]>(
      `SELECT * FROM app_animilair_authors WHERE is_active = 1 ORDER BY position ASC, id ASC`
    ),
    prisma.$queryRawUnsafe<ProductRow[]>(
      `SELECT p.*, a.user_id AS author_user_id, a.slug AS author_slug, a.name AS author_name,
              a.role AS author_role, a.bio AS author_bio, a.avatar_url AS author_avatar_url,
              a.banner_url AS author_banner_url, a.socials_json AS author_socials_json
       FROM app_animilair_products p
       JOIN app_animilair_authors a ON a.id = p.author_id
       WHERE p.status = 'published'
       ORDER BY p.featured DESC, p.id ASC`
    ),
    prisma.$queryRawUnsafe<MediaRow[]>(
      `SELECT * FROM app_animilair_product_media ORDER BY product_id ASC, position ASC, id ASC`
    ),
  ])

  return {
    authors: authors.map(mapAuthor),
    products: products.map((product) => mapProduct(product, media)),
  }
}

export async function getAnimilairProduct(slugOrId: string | number) {
  await ensureAnimilairSeedData()
  const field = Number.isFinite(Number(slugOrId)) ? 'p.id = ?' : 'p.slug = ?'
  const rows = await prisma.$queryRawUnsafe<ProductRow[]>(
    `SELECT p.*, a.user_id AS author_user_id, a.slug AS author_slug, a.name AS author_name,
            a.role AS author_role, a.bio AS author_bio, a.avatar_url AS author_avatar_url,
            a.banner_url AS author_banner_url, a.socials_json AS author_socials_json
     FROM app_animilair_products p
     JOIN app_animilair_authors a ON a.id = p.author_id
     WHERE ${field} AND p.status = 'published'
     LIMIT 1`,
    slugOrId
  )
  const product = rows[0]
  if (!product) return null
  const media = await prisma.$queryRawUnsafe<MediaRow[]>(
    `SELECT * FROM app_animilair_product_media WHERE product_id = ? ORDER BY position ASC, id ASC`,
    Number(product.id)
  )
  return mapProduct(product, media)
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
  shortDesc: string
  description: string
  priceFrom?: number | null
  deliveryDays?: number | null
  coverUrl?: string | null
  tags?: string[]
  media?: string[]
}) {
  const author = await getOrCreateDesignerAuthor(input.user, input.role)
  const title = input.title.trim().slice(0, 120)
  const shortDesc = input.shortDesc.trim().slice(0, 260)
  const description = input.description.trim().slice(0, 5000)
  if (!title || !shortDesc || !description) {
    throw new Error('Заповніть назву, короткий опис і повний опис послуги')
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
  if (!title || !brief) throw new Error('Заповніть назву та опис замовлення')

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

  await prisma.$executeRawUnsafe(
    `INSERT INTO app_animilair_order_messages (order_id, user_id, body, created_at)
     VALUES (?, ?, ?, ?)`,
    orderId,
    input.user.id,
    brief,
    now
  )

  return getAnimilairOrder(orderId, input.user, 'USER')
}

export async function getAnimilairOrders(user: AuthUser, role: UserRole = 'USER') {
  await ensureAnimilairSeedData()
  const isAdmin = role === 'ADMIN'
  const isDesigner = role === 'DESIGNER'
  const rows = await prisma.$queryRawUnsafe<OrderRow[]>(
    `SELECT o.*, p.title AS product_title, p.slug AS product_slug,
            a.user_id AS author_user_id, a.name AS author_name,
            u.full_name AS customer_name, u.avatar_url AS customer_avatar_url
     FROM app_animilair_orders o
     JOIN app_animilair_products p ON p.id = o.product_id
     JOIN app_animilair_authors a ON a.id = p.author_id
     JOIN app_users u ON u.id = o.customer_id
     ${isAdmin ? '' : isDesigner ? 'WHERE o.customer_id = ? OR a.user_id = ?' : 'WHERE o.customer_id = ?'}
     ORDER BY datetime(o.updated_at) DESC, o.id DESC`,
    ...(isAdmin ? [] : isDesigner ? [user.id, user.id] : [user.id])
  )
  return rows.map(mapOrder)
}

export async function getAnimilairOrder(id: number, user: AuthUser, role: UserRole = 'USER') {
  const rows = await prisma.$queryRawUnsafe<OrderRow[]>(
    `SELECT o.*, p.title AS product_title, p.slug AS product_slug,
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
     JOIN app_users u ON u.id = m.user_id
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
}) {
  await getAnimilairOrder(input.orderId, input.user, input.role || 'USER')
  const body = input.body.trim().slice(0, 3000)
  if (!body) throw new Error('Напишіть повідомлення')

  const now = nowIso()
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_animilair_order_messages (order_id, user_id, body, created_at)
     VALUES (?, ?, ?, ?)`,
    input.orderId,
    input.user.id,
    body,
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
  const allowed = new Set(['new', 'in_progress', 'waiting_customer', 'completed', 'canceled'])
  if (!allowed.has(nextStatus)) throw new Error('Некоректний статус замовлення')

  const isAdmin = role === 'ADMIN'
  const isDesigner = order.authorUserId === input.user.id
  const isCustomer = order.customerId === input.user.id
  const canDesignerUpdate = isAdmin || isDesigner
  const canCustomerCancel = isCustomer && nextStatus === 'canceled'
  if (!canDesignerUpdate && !canCustomerCancel) {
    throw new Error('Немає доступу до зміни статусу')
  }

  const statusMessages: Record<string, string> = {
    new: 'Статус замовлення: нове',
    in_progress: 'Дизайнер прийняв замовлення в роботу.',
    waiting_customer: 'Дизайнер очікує відповідь замовника.',
    completed: 'Замовлення позначено як виконане.',
    canceled: 'Замовлення скасовано.',
  }

  const now = nowIso()
  await prisma.$executeRawUnsafe(
    `UPDATE app_animilair_orders SET status = ?, updated_at = ? WHERE id = ?`,
    nextStatus,
    now,
    input.orderId
  )
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_animilair_order_messages (order_id, user_id, body, created_at)
     VALUES (?, ?, ?, ?)`,
    input.orderId,
    input.user.id,
    statusMessages[nextStatus] || `Статус замовлення: ${nextStatus}`,
    now
  )

  return getAnimilairOrder(input.orderId, input.user, role)
}
