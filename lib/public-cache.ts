import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import {
  getAdminStats,
  listNewsPosts,
  listServers,
} from '@/lib/auth-db'

export const PUBLIC_NEWS_CACHE_TAG = 'public-news'

export const getCachedPublicServers = unstable_cache(
  async () => listServers(),
  ['public-servers-v5'],
  { revalidate: 60 }
)

export const getCachedPublicNews = unstable_cache(
  async (limit: number) => listNewsPosts(limit),
  ['public-news-v2'],
  { revalidate: 30, tags: [PUBLIC_NEWS_CACHE_TAG] }
)

export const getCachedPublicStats = unstable_cache(
  async () => getAdminStats(),
  ['public-stats-v2'],
  { revalidate: 30 }
)

export const getCachedForumThreads = unstable_cache(
  async (limit: number) => {
    const { listForumThreads } = await import('@/lib/forum-db')
    return listForumThreads({ limit })
  },
  ['public-forum-threads-v1'],
  { revalidate: 300 }
)

export function revalidatePublicNews(postPath?: string | null) {
  revalidateTag(PUBLIC_NEWS_CACHE_TAG)
  revalidatePath('/news')
  revalidatePath('/')
  if (postPath) {
    revalidatePath(postPath)
  }
}
