import type { CommunityResource, CommunityResourceType } from '@/lib/resources-db'

const MODRINTH_API_URL = 'https://api.modrinth.com/v2'
const USER_AGENT = 'Eyzencore/2.0 (contact@eyzencore.com)'

export type ModrinthSearchHit = {
  slug: string
  title: string
  description: string
  categories?: string[]
  client_side?: string
  server_side?: string
  project_type: string
  downloads: number
  follows: number
  icon_url: string | null
  author: string
  versions?: string[]
  loaders?: string[]
  gallery?: string[]
  featured_gallery?: string | null
  license?: string
  date_created?: string
  date_modified?: string
  latest_version?: string
  display_categories?: string[]
}

export type ModrinthSearchResponse = {
  hits: ModrinthSearchHit[]
  offset: number
  limit: number
  total_hits: number
}

export type ModrinthProject = {
  id: string
  slug: string
  project_type: string
  team?: string
  title: string
  description?: string
  body?: string
  body_url?: string | null
  published?: string
  updated?: string
  icon_url?: string | null
  issues_url?: string | null
  source_url?: string | null
  wiki_url?: string | null
  discord_url?: string | null
  donation_urls?: Array<{ id: string; platform: string; url: string }>
  gallery?: Array<{
    url: string
    featured?: boolean
    title?: string
    description?: string
    created?: string
    ordering?: number
    raw_url?: string
  }>
  license?: { id?: string; name?: string; url?: string | null }
  client_side?: string
  server_side?: string
  downloads?: number
  followers?: number
  categories?: string[]
  additional_categories?: string[]
  game_versions?: string[]
  loaders?: string[]
  versions?: string[]
}

export type ModrinthVersionFile = {
  hashes: { sha512?: string; sha1?: string }
  url: string
  filename: string
  primary: boolean
  size: number
  file_type?: string | null
}

export type ModrinthVersion = {
  id: string
  project_id: string
  author_id?: string
  featured?: boolean
  name: string
  version_number: string
  changelog?: string | null
  dependencies?: Array<{
    version_id?: string | null
    project_id?: string | null
    file_name?: string | null
    dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
  }>
  game_versions: string[]
  version_type: 'release' | 'beta' | 'alpha'
  loaders: string[]
  date_published: string
  downloads: number
  files: ModrinthVersionFile[]
}

export type ModrinthTeamMember = {
  role?: string
  accepted?: boolean
  user?: {
    username?: string
    name?: string | null
    avatar_url?: string | null
  }
}

export type SearchModrinthOptions = {
  query?: string
  projectType?: string
  loader?: string
  gameVersion?: string
  category?: string
  sort?: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated'
  offset?: number
  limit?: number
}

export const POPULAR_LOADERS = [
  { key: 'fabric', label: 'Fabric' },
  { key: 'forge', label: 'Forge' },
  { key: 'neoforge', label: 'NeoForge' },
  { key: 'quilt', label: 'Quilt' },
  { key: 'paper', label: 'Paper' },
  { key: 'purpur', label: 'Purpur' },
  { key: 'spigot', label: 'Spigot' },
  { key: 'velocity', label: 'Velocity' },
  { key: 'bungeecord', label: 'BungeeCord' },
  { key: 'iris', label: 'Iris' },
  { key: 'optifine', label: 'OptiFine' },
  { key: 'datapack', label: 'DataPack' },
] as const

export const POPULAR_GAME_VERSIONS = [
  '1.21.4',
  '1.21.3',
  '1.21.1',
  '1.21',
  '1.20.6',
  '1.20.4',
  '1.20.2',
  '1.20.1',
  '1.20',
  '1.19.4',
  '1.19.2',
  '1.18.2',
  '1.16.5',
  '1.12.2',
  '1.8.9',
  '1.7.10',
] as const

export const POPULAR_CATEGORIES = [
  { key: 'optimization', label: 'Оптимізація' },
  { key: 'technology', label: 'Технології' },
  { key: 'magic', label: 'Магія' },
  { key: 'adventure', label: 'Пригоди' },
  { key: 'utility', label: 'Утиліти' },
  { key: 'worldgen', label: 'Генерація світу' },
  { key: 'storage', label: 'Сховища' },
  { key: 'decoration', label: 'Декорації' },
  { key: 'equipment', label: 'Екіпірування' },
  { key: 'library', label: 'Бібліотеки' },
] as const

export function normalizeModrinthType(rawType: string): CommunityResourceType {
  const t = (rawType || '').toLowerCase()
  if (t === 'modpack') return 'modpack'
  if (t === 'resourcepack') return 'resourcepack'
  if (t === 'shader') return 'shader'
  if (t === 'plugin') return 'plugin'
  if (t === 'datapack') return 'datapack'
  if (t === 'model') return 'model'
  return 'mod'
}

export function mapModrinthHitToCommunityResource(hit: ModrinthSearchHit): CommunityResource {
  const type = normalizeModrinthType(hit.project_type)
  const loaders = hit.loaders || []
  const categories = hit.categories || []
  const side = [hit.client_side, hit.server_side].filter(Boolean).join(' / ') || null
  const now = new Date().toISOString()

  return {
    id: 0,
    authorUserId: 'modrinth',
    name: hit.title || hit.slug,
    slug: hit.slug,
    type,
    summary: hit.description || '',
    description: hit.description || '',
    iconUrl: hit.icon_url || null,
    gallery: hit.gallery || [],
    sourceUrl: `https://modrinth.com/${hit.project_type}/${hit.slug}`,
    downloadUrl: `https://modrinth.com/${hit.project_type}/${hit.slug}`,
    sourceHost: 'modrinth.com',
    projectId: hit.slug,
    authorName: hit.author || 'Modrinth Creator',
    license: hit.license || null,
    loaders,
    gameVersions: hit.versions || [],
    tags: categories,
    side,
    downloads: Number(hit.downloads || 0),
    followers: Number(hit.follows || 0),
    views: Math.max(Number(hit.downloads || 0) * 2, Number(hit.follows || 0) * 5),
    status: 'published',
    featured: false,
    verified: true,
    publishedAt: hit.date_created || null,
    updatedRemoteAt: hit.date_modified || null,
    createdAt: hit.date_created || now,
    updatedAt: hit.date_modified || now,
  }
}

export function mapModrinthProjectToCommunityResource(
  project: ModrinthProject,
  authorName?: string | null,
): CommunityResource {
  const type = normalizeModrinthType(project.project_type)
  const gallery = (project.gallery || [])
    .map((item) => item.raw_url || item.url)
    .filter(Boolean)
  const side = [project.client_side, project.server_side].filter(Boolean).join(' / ') || null
  const now = new Date().toISOString()

  return {
    id: 0,
    authorUserId: 'modrinth',
    name: project.title || project.slug,
    slug: project.slug,
    type,
    summary: project.description || '',
    description: project.body || project.description || '',
    iconUrl: project.icon_url || null,
    gallery: Array.from(new Set(gallery)),
    sourceUrl: `https://modrinth.com/${project.project_type}/${project.slug}`,
    downloadUrl: `https://modrinth.com/${project.project_type}/${project.slug}`,
    sourceHost: 'modrinth.com',
    projectId: project.slug || project.id,
    authorName: authorName || 'Modrinth Creator',
    license: project.license?.name || project.license?.id || null,
    loaders: project.loaders || [],
    gameVersions: project.game_versions || [],
    tags: Array.from(new Set([...(project.categories || []), ...(project.additional_categories || [])])),
    side,
    downloads: Number(project.downloads || 0),
    followers: Number(project.followers || 0),
    views: Math.max(Number(project.downloads || 0) * 2, Number(project.followers || 0) * 5),
    status: 'published',
    featured: false,
    verified: true,
    publishedAt: project.published || null,
    updatedRemoteAt: project.updated || null,
    createdAt: project.published || now,
    updatedAt: project.updated || now,
  }
}

export async function searchModrinth(options: SearchModrinthOptions = {}): Promise<ModrinthSearchResponse> {
  const facets: string[][] = []

  if (options.projectType && options.projectType !== 'all') {
    facets.push([`project_type:${options.projectType}`])
  }

  if (options.loader && options.loader !== 'all') {
    facets.push([`categories:${options.loader}`])
  }

  if (options.gameVersion && options.gameVersion !== 'all') {
    facets.push([`versions:${options.gameVersion}`])
  }

  if (options.category && options.category !== 'all') {
    facets.push([`categories:${options.category}`])
  }

  const queryParams = new URLSearchParams()
  if (options.query && options.query.trim()) {
    queryParams.set('query', options.query.trim())
  }
  if (facets.length > 0) {
    queryParams.set('facets', JSON.stringify(facets))
  }

  const sort = options.sort || (options.query?.trim() ? 'relevance' : 'downloads')
  queryParams.set('index', sort)

  const limit = Math.min(Math.max(Number(options.limit || 24), 1), 100)
  const offset = Math.max(Number(options.offset || 0), 0)
  queryParams.set('limit', String(limit))
  queryParams.set('offset', String(offset))

  const url = `${MODRINTH_API_URL}/search?${queryParams.toString()}`

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 180 },
    })

    if (!res.ok) {
      console.warn(`[Modrinth API] search error status=${res.status}`)
      return { hits: [], offset, limit, total_hits: 0 }
    }

    const data = (await res.json()) as ModrinthSearchResponse
    return data
  } catch (error) {
    console.error('[Modrinth API] search failed:', error)
    return { hits: [], offset, limit, total_hits: 0 }
  }
}

export async function getModrinthProject(slugOrId: string): Promise<ModrinthProject | null> {
  const cleaned = encodeURIComponent(slugOrId.trim())
  if (!cleaned) return null

  try {
    const res = await fetch(`${MODRINTH_API_URL}/project/${cleaned}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 600 },
    })

    if (!res.ok) {
      return null
    }

    return (await res.json()) as ModrinthProject
  } catch (error) {
    console.error(`[Modrinth API] getProject failed for ${slugOrId}:`, error)
    return null
  }
}

export async function getModrinthProjectTeam(teamId: string | undefined): Promise<string | null> {
  if (!teamId) return null
  try {
    const res = await fetch(`${MODRINTH_API_URL}/team/${encodeURIComponent(teamId)}/members`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const members = (await res.json()) as ModrinthTeamMember[]
    const accepted = members.filter((member) => member.accepted !== false && member.user)
    const owner = accepted.find((member) => member.role?.toLowerCase() === 'owner') || accepted[0]
    return owner?.user?.username || owner?.user?.name || null
  } catch {
    return null
  }
}

export async function getModrinthProjectVersions(slugOrId: string): Promise<ModrinthVersion[]> {
  const cleaned = encodeURIComponent(slugOrId.trim())
  if (!cleaned) return []

  try {
    const res = await fetch(`${MODRINTH_API_URL}/project/${cleaned}/version`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 600 },
    })

    if (!res.ok) {
      return []
    }

    return (await res.json()) as ModrinthVersion[]
  } catch (error) {
    console.error(`[Modrinth API] getProjectVersions failed for ${slugOrId}:`, error)
    return []
  }
}

export async function getPopularModrinthSlugs(limit = 100): Promise<string[]> {
  try {
    const searchRes = await searchModrinth({
      sort: 'downloads',
      limit,
    })
    return searchRes.hits.map((hit) => hit.slug)
  } catch {
    return []
  }
}
