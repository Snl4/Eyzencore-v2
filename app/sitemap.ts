import type { MetadataRoute } from 'next'
import { listForumThreads } from '@/lib/forum-db'
import { getCachedPublicNews, getCachedPublicServers } from '@/lib/public-cache'
import { SITE_URL } from '@/lib/seo'
import { buildNewsPath } from '@/lib/news-slug'
import { buildServerPublicPath } from '@/lib/server-slug'

const now = new Date()

function url(path: string): string {
  return `${SITE_URL}${path}`
}

function safeLastModified(value?: string | Date | null): Date {
  if (!value) return now
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return now
  return date
}

function buildStaticRoutes(): MetadataRoute.Sitemap {
  return [
    {
      url: url('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: url('/servers/minecraft'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: url('/servers/discord'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: url('/news'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.82,
    },
    {
      url: url('/forum'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.72,
    },
    {
      url: url('/partners/animilair'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.74,
    },
    {
      url: url('/terms'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.25,
    },
    {
      url: url('/privacy'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.25,
    },
    {
      url: url('/sla'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
  ]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = buildStaticRoutes()
  try {
    const [serversResult, newsResult, forumResult] = await Promise.allSettled([
      getCachedPublicServers(),
      getCachedPublicNews(100),
      listForumThreads({ limit: 100 }),
    ])
    const servers = serversResult.status === 'fulfilled' ? serversResult.value : []
    const news = newsResult.status === 'fulfilled' ? newsResult.value : []
    const forumThreads = forumResult.status === 'fulfilled' ? forumResult.value : []
    const serverRoutes: MetadataRoute.Sitemap = servers.map((server) => ({
      url: url(buildServerPublicPath(server)),
      lastModified: safeLastModified(server.createdAt),
      changeFrequency: 'hourly',
      priority: server.boosted ? 0.92 : server.verified ? 0.86 : 0.78,
    }))
    const newsRoutes: MetadataRoute.Sitemap = news.map((post) => ({
      url: url(buildNewsPath(post)),
      lastModified: safeLastModified(post.updatedAt || post.createdAt),
      changeFrequency: 'weekly',
      priority: 0.68,
    }))
    const forumRoutes: MetadataRoute.Sitemap = forumThreads.map((thread) => ({
      url: url(`/forum/${thread.id}`),
      lastModified: safeLastModified(thread.updatedAt || thread.createdAt),
      changeFrequency: 'weekly',
      priority: thread.isPinned ? 0.66 : 0.58,
    }))
    return [...staticRoutes, ...serverRoutes, ...newsRoutes, ...forumRoutes]
  } catch {
    return staticRoutes
  }
}
