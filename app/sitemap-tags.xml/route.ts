import { listMinecraftSeoLandingSlugs } from '@/lib/minecraft-seo-pages'
import { SITE_URL } from '@/lib/seo'
import { buildSitemapXml } from '@/lib/sitemap-xml'

export const revalidate = 86400

export async function GET(): Promise<Response> {
  const now = new Date()
  const entries = listMinecraftSeoLandingSlugs().map((slug) => ({
    url: `${SITE_URL}/servers/minecraft/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.84,
  }))
  return new Response(buildSitemapXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
