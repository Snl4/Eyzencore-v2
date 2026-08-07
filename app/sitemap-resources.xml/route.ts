import { listCommunityResources } from '@/lib/resources-db'
import { buildResourcePath } from '@/lib/resource-slug'
import { SITE_URL } from '@/lib/seo'
import { buildSitemapXml, safeLastModified } from '@/lib/sitemap-xml'
import { searchModrinth } from '@/lib/modrinth'

export const revalidate = 7200 // 2 hours cache

const POPULAR_TYPES = ['mod', 'plugin', 'shader', 'resourcepack', 'datapack', 'modpack']

export async function GET(): Promise<Response> {
  const now = new Date()

  // 1. Local resources
  let localResources: Awaited<ReturnType<typeof listCommunityResources>> = []
  try {
    localResources = await listCommunityResources({ limit: 200 })
  } catch {
    // Ignore local db errors
  }

  // 2. Top Modrinth resources across popular categories
  const modrinthSlugs: Array<{ slug: string; dateModified?: string; downloads: number }> = []
  try {
    const popularSearches = await Promise.all([
      searchModrinth({ sort: 'downloads', limit: 50 }),
      searchModrinth({ projectType: 'mod', sort: 'downloads', limit: 40 }),
      searchModrinth({ projectType: 'plugin', sort: 'downloads', limit: 40 }),
      searchModrinth({ projectType: 'shader', sort: 'downloads', limit: 30 }),
      searchModrinth({ projectType: 'resourcepack', sort: 'downloads', limit: 30 }),
    ])

    const seen = new Set<string>()
    for (const res of popularSearches) {
      for (const hit of res.hits) {
        if (!seen.has(hit.slug)) {
          seen.add(hit.slug)
          modrinthSlugs.push({
            slug: hit.slug,
            dateModified: hit.date_modified,
            downloads: hit.downloads,
          })
        }
      }
    }
  } catch (err) {
    console.warn('[Sitemap Resources] Failed to fetch top Modrinth items:', err)
  }

  const entries = [
    {
      url: `${SITE_URL}/resources`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    ...POPULAR_TYPES.map((type) => ({
      url: `${SITE_URL}/resources?type=${type}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.85,
    })),
    ...localResources.map((resource) => ({
      url: `${SITE_URL}${buildResourcePath(resource)}`,
      lastModified: safeLastModified(resource.updatedAt, now),
      changeFrequency: 'weekly' as const,
      priority: resource.featured ? 0.82 : 0.75,
    })),
    ...modrinthSlugs.map((item) => ({
      url: `${SITE_URL}/resources/${item.slug}`,
      lastModified: safeLastModified(item.dateModified, now),
      changeFrequency: 'weekly' as const,
      priority: item.downloads > 1000000 ? 0.8 : item.downloads > 100000 ? 0.75 : 0.7,
    })),
  ]

  return new Response(buildSitemapXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=86400',
    },
  })
}
