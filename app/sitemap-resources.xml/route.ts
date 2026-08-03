import { listCommunityResources } from '@/lib/resources-db'
import { buildResourcePath } from '@/lib/resource-slug'
import { SITE_URL } from '@/lib/seo'
import { buildSitemapXml, safeLastModified } from '@/lib/sitemap-xml'

export const revalidate = 3600

export async function GET(): Promise<Response> {
  const now = new Date()
  const resources = await listCommunityResources({ limit: 200 })
  const entries = [
    {
      url: `${SITE_URL}/resources`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.82,
    },
    ...resources.map((resource) => ({
      url: `${SITE_URL}${buildResourcePath(resource)}`,
      lastModified: safeLastModified(resource.updatedAt, now),
      changeFrequency: 'weekly' as const,
      priority: resource.featured ? 0.78 : resource.verified ? 0.72 : 0.68,
    })),
  ]

  return new Response(buildSitemapXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
