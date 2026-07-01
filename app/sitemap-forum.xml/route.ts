import { getCachedForumThreads } from '@/lib/public-cache'
import { SITE_URL } from '@/lib/seo'
import { buildSitemapXml, safeLastModified } from '@/lib/sitemap-xml'

export const revalidate = 3600

export async function GET(): Promise<Response> {
  const now = new Date()
  const forumThreads = await getCachedForumThreads(200)
  const entries = forumThreads.map((thread) => ({
    url: `${SITE_URL}/forum/${thread.id}`,
    lastModified: safeLastModified(thread.updatedAt || thread.createdAt, now),
    changeFrequency: 'weekly' as const,
    priority: thread.isPinned ? 0.66 : 0.58,
  }))
  return new Response(buildSitemapXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
