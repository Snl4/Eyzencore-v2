import { prisma } from '@/lib/prisma'
import { buildResourceSlug } from '@/lib/resource-slug'

export type CommunityResourceType =
  | 'mod'
  | 'plugin'
  | 'resourcepack'
  | 'shader'
  | 'datapack'
  | 'modpack'
  | 'tool'

export type CommunityResourceStatus = 'draft' | 'published'

export type CommunityResource = {
  id: number
  authorUserId: string
  name: string
  slug: string
  type: CommunityResourceType
  summary: string
  description: string
  iconUrl: string | null
  gallery: string[]
  sourceUrl: string
  downloadUrl: string | null
  sourceHost: string | null
  projectId: string | null
  authorName: string | null
  license: string | null
  loaders: string[]
  gameVersions: string[]
  tags: string[]
  side: string | null
  downloads: number
  followers: number
  status: CommunityResourceStatus
  featured: boolean
  verified: boolean
  publishedAt: string | null
  updatedRemoteAt: string | null
  createdAt: string
  updatedAt: string
}

export type CommunityResourceInput = {
  authorUserId: string
  name: string
  type?: CommunityResourceType
  summary?: string
  description?: string
  iconUrl?: string | null
  gallery?: string[]
  sourceUrl: string
  downloadUrl?: string | null
  sourceHost?: string | null
  projectId?: string | null
  authorName?: string | null
  license?: string | null
  loaders?: string[]
  gameVersions?: string[]
  tags?: string[]
  side?: string | null
  downloads?: number
  followers?: number
  status?: CommunityResourceStatus
  featured?: boolean
  verified?: boolean
  publishedAt?: string | null
  updatedRemoteAt?: string | null
}

type CommunityResourceRow = {
  id: number
  author_user_id: string
  name: string
  slug: string
  type: string
  summary: string | null
  description: string | null
  icon_url: string | null
  gallery_json: string | null
  source_url: string
  download_url: string | null
  source_host: string | null
  project_id: string | null
  author_name: string | null
  license: string | null
  loaders_json: string | null
  game_versions_json: string | null
  tags_json: string | null
  side: string | null
  downloads: number | null
  followers: number | null
  status: string | null
  featured: number | null
  verified: number | null
  published_at: string | null
  updated_remote_at: string | null
  created_at: string
  updated_at: string
}

let ensuredTables = false

function nowIso() {
  return new Date().toISOString()
}

function cleanText(value: unknown, max = 5000) {
  return String(value || '').trim().slice(0, max)
}

function cleanUrl(value: unknown) {
  const url = String(value || '').trim()
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function cleanList(value: unknown, maxItems = 40) {
  const list = Array.isArray(value) ? value : []
  return Array.from(new Set(list.map((item) => cleanText(item, 64)).filter(Boolean))).slice(0, maxItems)
}

function parseList(raw: string | null) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return cleanList(parsed)
  } catch {
    return []
  }
}

function normalizeType(value: unknown): CommunityResourceType {
  const raw = cleanText(value, 32).toLowerCase()
  if (raw === 'plugin' || raw === 'resourcepack' || raw === 'shader' || raw === 'datapack' || raw === 'modpack' || raw === 'tool') {
    return raw
  }
  return 'mod'
}

function normalizeStatus(value: unknown): CommunityResourceStatus {
  return cleanText(value, 32).toLowerCase() === 'draft' ? 'draft' : 'published'
}

function mapResourceRow(row: CommunityResourceRow): CommunityResource {
  return {
    id: Number(row.id),
    authorUserId: row.author_user_id,
    name: row.name,
    slug: row.slug,
    type: normalizeType(row.type),
    summary: row.summary || '',
    description: row.description || '',
    iconUrl: row.icon_url || null,
    gallery: parseList(row.gallery_json),
    sourceUrl: row.source_url,
    downloadUrl: row.download_url || null,
    sourceHost: row.source_host || null,
    projectId: row.project_id || null,
    authorName: row.author_name || null,
    license: row.license || null,
    loaders: parseList(row.loaders_json),
    gameVersions: parseList(row.game_versions_json),
    tags: parseList(row.tags_json),
    side: row.side || null,
    downloads: Number(row.downloads || 0),
    followers: Number(row.followers || 0),
    status: normalizeStatus(row.status),
    featured: Number(row.featured || 0) > 0,
    verified: Number(row.verified || 0) > 0,
    publishedAt: row.published_at || null,
    updatedRemoteAt: row.updated_remote_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function ensureCommunityResourceTables() {
  if (ensuredTables) return
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS community_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'mod',
      summary TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      icon_url TEXT,
      gallery_json TEXT NOT NULL DEFAULT '[]',
      source_url TEXT NOT NULL,
      download_url TEXT,
      source_host TEXT,
      project_id TEXT,
      author_name TEXT,
      license TEXT,
      loaders_json TEXT NOT NULL DEFAULT '[]',
      game_versions_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      side TEXT,
      downloads INTEGER NOT NULL DEFAULT 0,
      followers INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published',
      featured INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 1,
      published_at TEXT,
      updated_remote_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (author_user_id) REFERENCES app_users(id) ON DELETE CASCADE
    )
  `)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_community_resources_status_created ON community_resources(status, created_at)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_community_resources_type ON community_resources(type)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_community_resources_source ON community_resources(source_host, project_id)`)
  ensuredTables = true
}

async function ensureUniqueResourceSlug(base: string) {
  await ensureCommunityResourceTables()
  const cleanBase = buildResourceSlug({ name: base })
  let candidate = cleanBase
  let suffix = 2
  while (true) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      'SELECT id FROM community_resources WHERE slug = ? LIMIT 1',
      candidate,
    )
    if (rows.length === 0) return candidate
    candidate = `${cleanBase}-${suffix}`
    suffix += 1
  }
}

export async function listCommunityResources(input: {
  includeDrafts?: boolean
  limit?: number
  search?: string
  type?: string
} = {}) {
  await ensureCommunityResourceTables()
  const where: string[] = []
  const params: unknown[] = []
  if (!input.includeDrafts) {
    where.push("status = 'published'")
  }
  if (input.type && input.type !== 'all') {
    where.push('type = ?')
    params.push(normalizeType(input.type))
  }
  const search = cleanText(input.search, 120).toLowerCase()
  if (search) {
    where.push('(lower(name) LIKE ? OR lower(summary) LIKE ? OR lower(description) LIKE ? OR lower(tags_json) LIKE ? OR lower(loaders_json) LIKE ? OR lower(game_versions_json) LIKE ?)')
    const q = `%${search}%`
    params.push(q, q, q, q, q, q)
  }
  const limit = Math.max(1, Math.min(Number(input.limit || 80), 200))
  params.push(limit)
  const rows = await prisma.$queryRawUnsafe<CommunityResourceRow[]>(
    `SELECT * FROM community_resources ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY featured DESC, datetime(created_at) DESC LIMIT ?`,
    ...params,
  )
  return rows.map(mapResourceRow)
}

export async function getCommunityResourceBySlug(slug: string, includeDrafts = false) {
  await ensureCommunityResourceTables()
  const rows = await prisma.$queryRawUnsafe<CommunityResourceRow[]>(
    `SELECT * FROM community_resources WHERE slug = ? ${includeDrafts ? '' : "AND status = 'published'"} LIMIT 1`,
    slug,
  )
  return rows[0] ? mapResourceRow(rows[0]) : null
}

export async function getCommunityResourceById(resourceId: number, includeDrafts = false) {
  await ensureCommunityResourceTables()
  const rows = await prisma.$queryRawUnsafe<CommunityResourceRow[]>(
    `SELECT * FROM community_resources WHERE id = ? ${includeDrafts ? '' : "AND status = 'published'"} LIMIT 1`,
    resourceId,
  )
  return rows[0] ? mapResourceRow(rows[0]) : null
}

export async function createCommunityResource(input: CommunityResourceInput) {
  await ensureCommunityResourceTables()
  const name = cleanText(input.name, 140)
  const sourceUrl = cleanUrl(input.sourceUrl)
  if (!name) throw new Error('Вкажіть назву ресурсу')
  if (!sourceUrl) throw new Error('Додайте коректне посилання на ресурс')
  const now = nowIso()
  const slug = await ensureUniqueResourceSlug(name)
  await prisma.$executeRawUnsafe(
    `INSERT INTO community_resources (
      author_user_id, name, slug, type, summary, description, icon_url, gallery_json,
      source_url, download_url, source_host, project_id, author_name, license,
      loaders_json, game_versions_json, tags_json, side, downloads, followers,
      status, featured, verified, published_at, updated_remote_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.authorUserId,
    name,
    slug,
    normalizeType(input.type),
    cleanText(input.summary, 500),
    cleanText(input.description, 16000),
    cleanUrl(input.iconUrl),
    JSON.stringify(cleanList(input.gallery, 12)),
    sourceUrl,
    cleanUrl(input.downloadUrl),
    cleanText(input.sourceHost, 80) || new URL(sourceUrl).hostname.replace(/^www\./, ''),
    cleanText(input.projectId, 120) || null,
    cleanText(input.authorName, 120) || null,
    cleanText(input.license, 80) || null,
    JSON.stringify(cleanList(input.loaders, 20)),
    JSON.stringify(cleanList(input.gameVersions, 60)),
    JSON.stringify(cleanList(input.tags, 30)),
    cleanText(input.side, 80) || null,
    Math.max(0, Number(input.downloads || 0)),
    Math.max(0, Number(input.followers || 0)),
    normalizeStatus(input.status),
    input.featured ? 1 : 0,
    input.verified === false ? 0 : 1,
    input.publishedAt || null,
    input.updatedRemoteAt || null,
    now,
    now,
  )
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>('SELECT last_insert_rowid() AS id')
  const created = await getCommunityResourceById(Number(rows[0]?.id || 0), true)
  if (!created) throw new Error('Не вдалося створити ресурс')
  return created
}

export async function deleteCommunityResource(resourceId: number) {
  await ensureCommunityResourceTables()
  const existing = await getCommunityResourceById(resourceId, true)
  if (!existing) {
    throw new Error('Ресурс не знайдено')
  }
  await prisma.$executeRawUnsafe('DELETE FROM community_resources WHERE id = ?', resourceId)
  return existing
}
