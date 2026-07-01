import { unstable_cache } from 'next/cache'
import {
  getAdminStats,
  listNewsPosts,
  listServers,
} from '@/lib/auth-db'

export const getCachedPublicServers = unstable_cache(
  async () => listServers(),
  ['public-servers-v4'],
  { revalidate: 60 }
)

export const getCachedPublicNews = unstable_cache(
  async (limit: number) => listNewsPosts(limit),
  ['public-news-v2'],
  { revalidate: 30 }
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
