import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

type CountRow = { c: number | bigint | null }

type CommentRow = {
  id: number | bigint
  text: string
  created_at: string
  updated_at: string
  user_id: string
  full_name: string | null
  profile_slug: string | null
  avatar_url: string | null
}

export type NewsEngagementComment = {
  id: number
  text: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    slug: string | null
    avatarUrl: string | null
  }
}

export type NewsEngagement = {
  likes: number
  views: number
  commentsCount: number
  likedByMe: boolean
  userComment: NewsEngagementComment | null
  comments: NewsEngagementComment[]
}

let tablesReady = false

function toNumber(value: number | bigint | null | undefined): number {
  if (typeof value === 'bigint') return Number(value)
  return Number(value || 0)
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeCommentText(value: unknown): string {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, 900)
}

export function getNewsRequestIp(request: Request): string | null {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  )
}

export function buildNewsViewFingerprint(input: {
  userId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}): string {
  if (input.userId) return `user:${input.userId}`
  const source = `${input.ipAddress || 'unknown'}|${input.userAgent || 'unknown'}`
  return `guest:${createHash('sha256').update(source).digest('hex').slice(0, 48)}`
}

async function ensureNewsEngagementTables() {
  if (tablesReady) return
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "app_news_comments" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "news_id" INTEGER NOT NULL,
      "user_id" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      CONSTRAINT "app_news_comments_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "app_news_posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      CONSTRAINT "app_news_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "app_news_likes" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "news_id" INTEGER NOT NULL,
      "user_id" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      CONSTRAINT "app_news_likes_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "app_news_posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      CONSTRAINT "app_news_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "app_news_views" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "news_id" INTEGER NOT NULL,
      "user_id" TEXT,
      "fingerprint" TEXT NOT NULL,
      "ip_address" TEXT,
      "user_agent" TEXT,
      "created_at" TEXT NOT NULL,
      CONSTRAINT "app_news_views_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "app_news_posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      CONSTRAINT "app_news_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
    )
  `)
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_comments_unique_user" ON "app_news_comments"("news_id", "user_id")')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_news_comments_news" ON "app_news_comments"("news_id", "created_at")')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_news_comments_user" ON "app_news_comments"("user_id")')
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_likes_unique_user" ON "app_news_likes"("news_id", "user_id")')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_news_likes_news" ON "app_news_likes"("news_id")')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_news_likes_user" ON "app_news_likes"("user_id")')
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_views_unique_fingerprint" ON "app_news_views"("news_id", "fingerprint")')
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_views_unique_user" ON "app_news_views"("news_id", "user_id") WHERE "user_id" IS NOT NULL')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_news_views_news" ON "app_news_views"("news_id")')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_news_views_created" ON "app_news_views"("created_at")')
  tablesReady = true
}

function mapComment(row: CommentRow): NewsEngagementComment {
  return {
    id: toNumber(row.id),
    text: String(row.text || ''),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: String(row.user_id || ''),
      name: String(row.full_name || 'Користувач'),
      slug: row.profile_slug || null,
      avatarUrl: row.avatar_url || null,
    },
  }
}

export async function getNewsEngagement(newsId: number, userId?: string | null): Promise<NewsEngagement> {
  await ensureNewsEngagementTables()
  const [likesRows, viewsRows, commentsRows, likedRows, userCommentRows, rows] = await Promise.all([
    prisma.$queryRawUnsafe<CountRow[]>('SELECT COUNT(*) AS c FROM app_news_likes WHERE news_id = ?', newsId),
    prisma.$queryRawUnsafe<CountRow[]>('SELECT COUNT(*) AS c FROM app_news_views WHERE news_id = ?', newsId),
    prisma.$queryRawUnsafe<CountRow[]>('SELECT COUNT(*) AS c FROM app_news_comments WHERE news_id = ?', newsId),
    userId
      ? prisma.$queryRawUnsafe<CountRow[]>('SELECT COUNT(*) AS c FROM app_news_likes WHERE news_id = ? AND user_id = ?', newsId, userId)
      : Promise.resolve([{ c: 0 }]),
    userId
      ? prisma.$queryRawUnsafe<CommentRow[]>(
          `SELECT c.id, c.text, c.created_at, c.updated_at, c.user_id, u.full_name, u.profile_slug, u.avatar_url
           FROM app_news_comments c
           JOIN app_users u ON u.id = c.user_id
           WHERE c.news_id = ? AND c.user_id = ?
           LIMIT 1`,
          newsId,
          userId
        )
      : Promise.resolve([]),
    prisma.$queryRawUnsafe<CommentRow[]>(
      `SELECT c.id, c.text, c.created_at, c.updated_at, c.user_id, u.full_name, u.profile_slug, u.avatar_url
       FROM app_news_comments c
       JOIN app_users u ON u.id = c.user_id
       WHERE c.news_id = ?
       ORDER BY datetime(c.updated_at) DESC
       LIMIT 30`,
      newsId
    ),
  ])

  return {
    likes: toNumber(likesRows[0]?.c),
    views: toNumber(viewsRows[0]?.c),
    commentsCount: toNumber(commentsRows[0]?.c),
    likedByMe: toNumber(likedRows[0]?.c) > 0,
    userComment: userCommentRows[0] ? mapComment(userCommentRows[0]) : null,
    comments: rows.map(mapComment),
  }
}

export async function recordNewsView(input: {
  newsId: number
  userId?: string | null
  fingerprint: string
  ipAddress?: string | null
  userAgent?: string | null
}) {
  await ensureNewsEngagementTables()
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO app_news_views (news_id, user_id, fingerprint, ip_address, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.newsId,
    input.userId || null,
    input.fingerprint,
    input.ipAddress || null,
    input.userAgent || null,
    nowIso()
  )
}

export async function toggleNewsLike(newsId: number, userId: string) {
  await ensureNewsEngagementTables()
  const existing = await prisma.$queryRawUnsafe<CountRow[]>(
    'SELECT COUNT(*) AS c FROM app_news_likes WHERE news_id = ? AND user_id = ?',
    newsId,
    userId
  )
  if (toNumber(existing[0]?.c) > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM app_news_likes WHERE news_id = ? AND user_id = ?', newsId, userId)
    return false
  }
  await prisma.$executeRawUnsafe(
    'INSERT OR IGNORE INTO app_news_likes (news_id, user_id, created_at) VALUES (?, ?, ?)',
    newsId,
    userId,
    nowIso()
  )
  return true
}

export async function saveNewsComment(newsId: number, userId: string, value: unknown) {
  await ensureNewsEngagementTables()
  const text = normalizeCommentText(value)
  if (!text) {
    throw new Error('Повідомлення не може бути порожнім')
  }
  const now = nowIso()
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_news_comments (news_id, user_id, text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(news_id, user_id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
    newsId,
    userId,
    text,
    now,
    now
  )
}
