import { prisma } from '@/lib/prisma'
import type { AuthUser } from '@/lib/auth-db'

export type ServerEventType = 'wipe' | 'tournament' | 'giveaway' | 'update' | 'season'

export type ServerEventComment = {
  id: number
  text: string
  createdAt: string
  author: {
    id: string
    name: string
    avatarUrl: string | null
    slug: string | null
  }
}

export type ServerEvent = {
  id: number
  serverId: number
  ownerId: string
  type: ServerEventType
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  location: string | null
  prize: string | null
  imageUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
  attendeesCount: number
  commentsCount: number
  userGoing: boolean
  userReminder: boolean
  comments: ServerEventComment[]
}

type EventRow = {
  id: number
  server_id: number
  owner_id: string
  type: string
  title: string
  description: string
  starts_at: string
  ends_at: string | null
  location: string | null
  prize: string | null
  image_url: string | null
  status: string
  created_at: string
  updated_at: string
  attendees_count: number | bigint | null
  comments_count: number | bigint | null
  user_going: number | bigint | null
  user_reminder: number | bigint | null
}

type CommentRow = {
  id: number
  event_id: number
  user_id: string
  text: string
  created_at: string
  full_name: string | null
  avatar_url: string | null
  profile_slug: string | null
}

const EVENT_TYPES = new Set<ServerEventType>(['wipe', 'tournament', 'giveaway', 'update', 'season'])

let ensuredTables = false

export async function ensureServerEventTables() {
  if (ensuredTables) return
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "app_server_events" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "server_id" INTEGER NOT NULL,
      "owner_id" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'update',
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "starts_at" TEXT NOT NULL,
      "ends_at" TEXT,
      "location" TEXT,
      "prize" TEXT,
      "image_url" TEXT,
      "status" TEXT NOT NULL DEFAULT 'published',
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      FOREIGN KEY ("owner_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "app_server_event_attendees" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "event_id" INTEGER NOT NULL,
      "user_id" TEXT NOT NULL,
      "reminder_enabled" INTEGER NOT NULL DEFAULT 1,
      "created_at" TEXT NOT NULL,
      FOREIGN KEY ("event_id") REFERENCES "app_server_events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "app_server_event_comments" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "event_id" INTEGER NOT NULL,
      "user_id" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      FOREIGN KEY ("event_id") REFERENCES "app_server_events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )
  `)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_server_events_server_id" ON "app_server_events"("server_id")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_server_events_starts_at" ON "app_server_events"("starts_at")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_server_events_status" ON "app_server_events"("status")`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_server_event_attendees_unique" ON "app_server_event_attendees"("event_id", "user_id")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_server_event_attendees_user" ON "app_server_event_attendees"("user_id")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_server_event_comments_event" ON "app_server_event_comments"("event_id", "created_at")`)
  ensuredTables = true
}

export function normalizeEventType(value: unknown): ServerEventType {
  const type = String(value || '').trim() as ServerEventType
  return EVENT_TYPES.has(type) ? type : 'update'
}

function mapComments(rows: CommentRow[]): ServerEventComment[] {
  return rows.map((row) => ({
    id: Number(row.id),
    text: String(row.text || ''),
    createdAt: String(row.created_at),
    author: {
      id: String(row.user_id),
      name: String(row.full_name || 'Користувач'),
      avatarUrl: row.avatar_url || null,
      slug: row.profile_slug || null,
    },
  }))
}

function mapEvents(rows: EventRow[], commentsByEvent: Map<number, ServerEventComment[]>): ServerEvent[] {
  return rows.map((row) => {
    const eventId = Number(row.id)
    return {
      id: eventId,
      serverId: Number(row.server_id),
      ownerId: String(row.owner_id),
      type: normalizeEventType(row.type),
      title: String(row.title || ''),
      description: String(row.description || ''),
      startsAt: String(row.starts_at),
      endsAt: row.ends_at || null,
      location: row.location || null,
      prize: row.prize || null,
      imageUrl: row.image_url || null,
      status: String(row.status || 'published'),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      attendeesCount: Number(row.attendees_count || 0),
      commentsCount: Number(row.comments_count || 0),
      userGoing: Number(row.user_going || 0) > 0,
      userReminder: Number(row.user_reminder || 0) > 0,
      comments: commentsByEvent.get(eventId) || [],
    }
  })
}

export async function listServerEvents(input: { serverId: number; userId?: string | null; limit?: number }) {
  await ensureServerEventTables()
  const limit = Math.max(1, Math.min(50, Number(input.limit || 20)))
  const userId = input.userId || ''
  const rows = await prisma.$queryRawUnsafe<EventRow[]>(
    `
      SELECT e.*,
        (SELECT COUNT(*) FROM app_server_event_attendees a WHERE a.event_id = e.id) AS attendees_count,
        (SELECT COUNT(*) FROM app_server_event_comments c WHERE c.event_id = e.id) AS comments_count,
        (SELECT COUNT(*) FROM app_server_event_attendees a WHERE a.event_id = e.id AND a.user_id = ?) AS user_going,
        COALESCE((SELECT a.reminder_enabled FROM app_server_event_attendees a WHERE a.event_id = e.id AND a.user_id = ? LIMIT 1), 0) AS user_reminder
      FROM app_server_events e
      WHERE e.server_id = ? AND e.status != 'deleted'
      ORDER BY datetime(e.starts_at) ASC, e.id DESC
      LIMIT ?
    `,
    userId,
    userId,
    input.serverId,
    limit,
  )
  const ids = rows.map((row) => Number(row.id))
  const commentsByEvent = new Map<number, ServerEventComment[]>()
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',')
    const comments = await prisma.$queryRawUnsafe<CommentRow[]>(
      `
        SELECT c.*, u.full_name, u.avatar_url, u.profile_slug
        FROM app_server_event_comments c
        JOIN app_users u ON u.id = c.user_id
        WHERE c.event_id IN (${placeholders})
        ORDER BY datetime(c.created_at) ASC
      `,
      ...ids,
    )
    for (const comment of mapComments(comments)) {
      const source = comments.find((row) => Number(row.id) === comment.id)
      const eventId = Number(source?.event_id || 0)
      if (!eventId) continue
      commentsByEvent.set(eventId, [...(commentsByEvent.get(eventId) || []), comment])
    }
  }
  return mapEvents(rows, commentsByEvent)
}

export async function getServerEvent(eventId: number) {
  await ensureServerEventTables()
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number; server_id: number; owner_id: string }>>(
    `SELECT id, server_id, owner_id FROM app_server_events WHERE id = ? AND status != 'deleted' LIMIT 1`,
    eventId,
  )
  return rows[0] || null
}

export async function createServerEvent(input: {
  serverId: number
  ownerId: string
  type: ServerEventType
  title: string
  description?: string
  startsAt: string
  endsAt?: string | null
  location?: string | null
  prize?: string | null
  imageUrl?: string | null
}) {
  await ensureServerEventTables()
  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO app_server_events
        (server_id, owner_id, type, title, description, starts_at, ends_at, location, prize, image_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
    `,
    input.serverId,
    input.ownerId,
    input.type,
    input.title,
    input.description || '',
    input.startsAt,
    input.endsAt || null,
    input.location || null,
    input.prize || null,
    input.imageUrl || null,
    now,
    now,
  )
  const row = await prisma.$queryRawUnsafe<Array<{ id: number }>>(`SELECT last_insert_rowid() AS id`)
  return Number(row[0]?.id || 0)
}

export async function toggleEventAttendance(input: { eventId: number; user: AuthUser; reminderEnabled: boolean }) {
  await ensureServerEventTables()
  const existing = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id FROM app_server_event_attendees WHERE event_id = ? AND user_id = ? LIMIT 1`,
    input.eventId,
    input.user.id,
  )
  if (existing[0]) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM app_server_event_attendees WHERE id = ?`,
      Number(existing[0].id),
    )
    return { going: false, reminderEnabled: false }
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_server_event_attendees (event_id, user_id, reminder_enabled, created_at) VALUES (?, ?, ?, ?)`,
    input.eventId,
    input.user.id,
    input.reminderEnabled ? 1 : 0,
    new Date().toISOString(),
  )
  return { going: true, reminderEnabled: input.reminderEnabled }
}

export async function addEventComment(input: { eventId: number; userId: string; text: string }) {
  await ensureServerEventTables()
  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_server_event_comments (event_id, user_id, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    input.eventId,
    input.userId,
    input.text,
    now,
    now,
  )
}
