import type { CommunityResourceInput, CommunityResourceType } from '@/lib/resources-db'

export type ImportedResourceDraft = Omit<CommunityResourceInput, 'authorUserId' | 'status' | 'featured' | 'verified'>

type ModrinthProject = {
  slug: string
  team?: string
  project_type: string
  title: string
  description?: string
  body?: string
  icon_url?: string | null
  gallery?: Array<{ url?: string; raw_url?: string }>
  source_url?: string | null
  wiki_url?: string | null
  discord_url?: string | null
  license?: { id?: string; name?: string }
  client_side?: string
  server_side?: string
  downloads?: number
  followers?: number
  published?: string
  updated?: string
  categories?: string[]
  loaders?: string[]
  game_versions?: string[]
}

type ModrinthTeamMember = {
  role?: string
  accepted?: boolean
  user?: {
    username?: string
    name?: string | null
  }
}

function asType(value: string): CommunityResourceType {
  if (value === 'modpack') return 'modpack'
  if (value === 'resourcepack') return 'resourcepack'
  if (value === 'shader') return 'shader'
  if (value === 'plugin') return 'plugin'
  if (value === 'datapack') return 'datapack'
  return 'mod'
}

function parseSourceUrl(value: string) {
  const url = new URL(value.trim())
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Підтримуються тільки http/https посилання')
  }
  return url
}

function getModrinthProjectId(url: URL) {
  if (!/(^|\.)modrinth\.com$/i.test(url.hostname)) return null
  const parts = url.pathname.split('/').filter(Boolean)
  const projectIndex = parts.findIndex((part) => part === 'mod' || part === 'plugin' || part === 'resourcepack' || part === 'shader' || part === 'datapack' || part === 'modpack')
  if (projectIndex >= 0 && parts[projectIndex + 1]) return parts[projectIndex + 1]
  return parts[0] || null
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function readMeta(html: string, property: string) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i')
  return decodeHtml(pattern.exec(html)?.[1] || '')
}

function normalizeMediaUrl(value: string) {
  const url = decodeHtml(value.trim())
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  if (/^https?:\/\//i.test(url) || url.startsWith('/api/uploads/')) return url
  return ''
}

async function getModrinthAuthorName(teamId: string | undefined) {
  if (!teamId) return null
  try {
    const response = await fetch(`https://api.modrinth.com/v2/team/${encodeURIComponent(teamId)}/members`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Eyzencore resources importer (https://eyzencore.com)',
      },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const members = (await response.json()) as ModrinthTeamMember[]
    const accepted = members.filter((member) => member.accepted !== false && member.user)
    const owner = accepted.find((member) => member.role?.toLowerCase() === 'owner') || accepted[0]
    const name = owner?.user?.username || owner?.user?.name || ''
    return name.trim() || null
  } catch {
    return null
  }
}

async function importModrinth(url: URL): Promise<ImportedResourceDraft | null> {
  const projectId = getModrinthProjectId(url)
  if (!projectId) return null
  const response = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Eyzencore resources importer (https://eyzencore.com)',
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error('Modrinth не віддав дані для цього посилання')
  }
  const project = (await response.json()) as ModrinthProject
  const authorName = await getModrinthAuthorName(project.team)
  const description = project.body || project.description || ''
  const gallery = (project.gallery || []).map((item) => normalizeMediaUrl(item.raw_url || item.url || '')).filter(Boolean)
  return {
    name: project.title || project.slug,
    type: asType(project.project_type),
    summary: project.description || '',
    description,
    iconUrl: project.icon_url || null,
    gallery: Array.from(new Set(gallery)).slice(0, 24),
    sourceUrl: url.toString(),
    downloadUrl: url.toString(),
    sourceHost: 'modrinth.com',
    projectId: project.slug || projectId,
    authorName,
    license: project.license?.name || project.license?.id || null,
    loaders: project.loaders || [],
    gameVersions: project.game_versions || [],
    tags: project.categories || [],
    side: [project.client_side, project.server_side].filter(Boolean).join(' / ') || null,
    downloads: Number(project.downloads || 0),
    followers: Number(project.followers || 0),
    publishedAt: project.published || null,
    updatedRemoteAt: project.updated || null,
  }
}

async function importOpenGraph(url: URL): Promise<ImportedResourceDraft> {
  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'Eyzencore resources importer (https://eyzencore.com)',
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error('Не вдалося прочитати сторінку ресурсу')
  }
  const html = await response.text()
  const title = readMeta(html, 'og:title') || /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] || url.hostname
  const description = readMeta(html, 'og:description') || readMeta(html, 'description')
  const image = readMeta(html, 'og:image') || null
  const video = readMeta(html, 'og:video') || readMeta(html, 'og:video:url') || null
  const authorName = readMeta(html, 'author') || readMeta(html, 'article:author') || readMeta(html, 'og:site_name') || null
  const media = [image, video].map((item) => normalizeMediaUrl(item || '')).filter(Boolean)
  return {
    name: title.replace(/\s*\|.*$/, '').trim(),
    type: 'mod',
    summary: description,
    description,
    iconUrl: image,
    gallery: Array.from(new Set(media)).slice(0, 24),
    sourceUrl: url.toString(),
    downloadUrl: url.toString(),
    sourceHost: url.hostname.replace(/^www\./, ''),
    projectId: null,
    authorName,
    license: null,
    loaders: [],
    gameVersions: [],
    tags: [],
    side: null,
    downloads: 0,
    followers: 0,
    publishedAt: null,
    updatedRemoteAt: null,
  }
}

export async function importCommunityResourceFromUrl(value: string): Promise<ImportedResourceDraft> {
  const url = parseSourceUrl(value)
  const modrinth = await importModrinth(url)
  if (modrinth) return modrinth
  return importOpenGraph(url)
}
