import { prisma } from '@/lib/prisma'
import type { CmsSiteMonthlyReport, CmsSiteReportTopServer } from '@/lib/cms-site-report-shared'

export type { CmsSiteMonthlyReport, CmsSiteReportTopServer } from '@/lib/cms-site-report-shared'
export { formatSiteReportText } from '@/lib/cms-site-report-shared'

type CountRow = { c: number | bigint }

type TopServerRow = {
  server_id: number | bigint
  server_name: string
  views: number | bigint
  votes: number | bigint
  likes: number | bigint
}

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const normalized = String(monthKey || '').trim()
  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error('Некоректний місяць. Використовуйте формат YYYY-MM')
  }
  const [yearText, monthText] = normalized.split('-')
  return { year: Number(yearText), month: Number(monthText) }
}

function buildMonthBounds(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString()
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString()
  return { start, end }
}

function buildMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('uk-UA', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

function mapCount(row: CountRow | undefined): number {
  return Number(row?.c || 0)
}

async function countInRange(sql: string, start: string, end: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql, start, end)
  return mapCount(rows[0])
}

async function countUniqueVisitors(start: string, end: string): Promise<number> {
  return countInRange(
    `SELECT COUNT(DISTINCT fingerprint) AS c
     FROM (
       SELECT fingerprint, created_at FROM app_server_views
       UNION ALL
       SELECT fingerprint, created_at FROM app_server_views_archive
     ) v
     WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`,
    start,
    end,
  )
}

async function countViews(start: string, end: string): Promise<number> {
  return countInRange(
    `SELECT COUNT(*) AS c
     FROM (
       SELECT created_at FROM app_server_views
       UNION ALL
       SELECT created_at FROM app_server_views_archive
     ) v
     WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`,
    start,
    end,
  )
}

async function countNicknameVotes(start: string, end: string): Promise<number> {
  return countInRange(
    `SELECT COUNT(*) AS c
     FROM (
       SELECT created_at FROM app_server_nickname_votes
       UNION ALL
       SELECT created_at FROM app_server_nickname_votes_archive
     ) v
     WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`,
    start,
    end,
  )
}

async function countAccountVotes(start: string, end: string): Promise<number> {
  return countInRange(
    `SELECT COUNT(*) AS c
     FROM (
       SELECT created_at FROM app_server_votes
       UNION ALL
       SELECT created_at FROM app_server_votes_archive
     ) v
     WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`,
    start,
    end,
  )
}

async function countLikes(start: string, end: string): Promise<number> {
  return countInRange(
    `SELECT COUNT(*) AS c
     FROM (
       SELECT created_at FROM app_server_likes
       UNION ALL
       SELECT created_at FROM app_server_likes_archive
     ) v
     WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`,
    start,
    end,
  )
}

async function countReviews(start: string, end: string): Promise<number> {
  return countInRange(
    `SELECT COUNT(*) AS c
     FROM app_server_reviews
     WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`,
    start,
    end,
  )
}

async function countNewUsers(start: string, end: string): Promise<number> {
  return countInRange(
    `SELECT COUNT(*) AS c
     FROM app_users
     WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`,
    start,
    end,
  )
}

async function listTopServers(start: string, end: string, limit = 10): Promise<CmsSiteReportTopServer[]> {
  const safeLimit = Math.max(1, Math.min(limit, 25))
  const rows = await prisma.$queryRawUnsafe<TopServerRow[]>(
    `SELECT
       s.id AS server_id,
       s.name AS server_name,
       COALESCE(v.views, 0) AS views,
       COALESCE(vo.votes, 0) AS votes,
       COALESCE(l.likes, 0) AS likes
     FROM app_servers s
     LEFT JOIN (
       SELECT server_id, COUNT(*) AS views
       FROM (
         SELECT server_id, created_at FROM app_server_views
         UNION ALL
         SELECT server_id, created_at FROM app_server_views_archive
       ) t
       WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)
       GROUP BY server_id
     ) v ON v.server_id = s.id
     LEFT JOIN (
       SELECT server_id, COUNT(*) AS votes
       FROM (
         SELECT server_id, created_at FROM app_server_nickname_votes
         UNION ALL
         SELECT server_id, created_at FROM app_server_nickname_votes_archive
         UNION ALL
         SELECT server_id, created_at FROM app_server_votes
         UNION ALL
         SELECT server_id, created_at FROM app_server_votes_archive
       ) t
       WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)
       GROUP BY server_id
     ) vo ON vo.server_id = s.id
     LEFT JOIN (
       SELECT server_id, COUNT(*) AS likes
       FROM (
         SELECT server_id, created_at FROM app_server_likes
         UNION ALL
         SELECT server_id, created_at FROM app_server_likes_archive
       ) t
       WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)
       GROUP BY server_id
     ) l ON l.server_id = s.id
     WHERE COALESCE(v.views, 0) > 0 OR COALESCE(vo.votes, 0) > 0 OR COALESCE(l.likes, 0) > 0
     ORDER BY views DESC, votes DESC, likes DESC, s.name ASC
     LIMIT ?`,
    start,
    end,
    start,
    end,
    start,
    end,
    safeLimit,
  )
  return rows.map((row) => ({
    serverId: Number(row.server_id),
    serverName: row.server_name,
    views: Number(row.views || 0),
    votes: Number(row.votes || 0),
    likes: Number(row.likes || 0),
  }))
}

async function buildReportForMonth(year: number, month: number): Promise<CmsSiteMonthlyReport> {
  const { start, end } = buildMonthBounds(year, month)
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const [
    uniqueVisitors,
    views,
    nicknameVotes,
    accountVotes,
    likes,
    reviews,
    newUsers,
    topServers,
  ] = await Promise.all([
    countUniqueVisitors(start, end),
    countViews(start, end),
    countNicknameVotes(start, end),
    countAccountVotes(start, end),
    countLikes(start, end),
    countReviews(start, end),
    countNewUsers(start, end),
    listTopServers(start, end),
  ])
  const previous = shiftMonth(year, month, -1)
  const previousBounds = buildMonthBounds(previous.year, previous.month)
  const [prevVisitors, prevViews, prevNicknameVotes, prevAccountVotes, prevLikes] = await Promise.all([
    countUniqueVisitors(previousBounds.start, previousBounds.end),
    countViews(previousBounds.start, previousBounds.end),
    countNicknameVotes(previousBounds.start, previousBounds.end),
    countAccountVotes(previousBounds.start, previousBounds.end),
    countLikes(previousBounds.start, previousBounds.end),
  ])
  return {
    month: monthKey,
    label: buildMonthLabel(year, month),
    periodStart: start,
    periodEnd: end,
    uniqueVisitors,
    views,
    nicknameVotes,
    accountVotes,
    totalVotes: nicknameVotes + accountVotes,
    likes,
    reviews,
    newUsers,
    topServers,
    previousMonth: {
      uniqueVisitors: prevVisitors,
      views: prevViews,
      totalVotes: prevNicknameVotes + prevAccountVotes,
      likes: prevLikes,
    },
  }
}

export function listReportMonthOptions(count = 18): string[] {
  const safeCount = Math.max(3, Math.min(count, 36))
  const now = new Date()
  const options: string[] = []
  for (let index = 0; index < safeCount; index += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1))
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    options.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return options
}

export function buildCurrentMonthKey(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

export async function getCmsSiteMonthlyReport(monthKey?: string): Promise<CmsSiteMonthlyReport> {
  const parsed = parseMonthKey(monthKey || buildCurrentMonthKey())
  return buildReportForMonth(parsed.year, parsed.month)
}
