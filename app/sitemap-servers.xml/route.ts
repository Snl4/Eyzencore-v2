import { getCachedPublicServers } from '@/lib/public-cache'
import { SITE_URL } from '@/lib/seo'
import { buildServerPublicPath } from '@/lib/server-slug'
import { buildSitemapXml, safeLastModified } from '@/lib/sitemap-xml'

export const revalidate = 3600

export async function GET(): Promise<Response> {
  const now = new Date()
  const servers = await getCachedPublicServers()
  const entries = servers.map((server) => ({
    url: `${SITE_URL}${buildServerPublicPath(server)}`,
    lastModified: safeLastModified(server.createdAt, now),
    changeFrequency: 'hourly' as const,
    priority: server.boosted ? 0.92 : server.verified ? 0.86 : 0.78,
  }))
  return new Response(buildSitemapXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
