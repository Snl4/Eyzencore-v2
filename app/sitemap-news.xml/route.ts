import { getCachedPublicNews } from '@/lib/public-cache'
import { buildNewsPath } from '@/lib/news-slug'
import { SITE_URL } from '@/lib/seo'
import { buildSitemapXml, safeLastModified } from '@/lib/sitemap-xml'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const now = new Date()
  const news = await getCachedPublicNews(200)
  const entries = news.map((post) => ({
    url: `${SITE_URL}${buildNewsPath(post)}`,
    lastModified: safeLastModified(post.updatedAt || post.createdAt, now),
    changeFrequency: 'weekly' as const,
    priority: 0.68,
  }))
  return new Response(buildSitemapXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
