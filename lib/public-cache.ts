import { unstable_cache } from 'next/cache'
import {
  getAdminStats,
  listNewsPosts,
  listServers,
} from '@/lib/auth-db'

export const getCachedPublicServers = unstable_cache(
  async () => listServers(),
  ['public-servers-v1'],
  { revalidate: 15 }
)

export const getCachedPublicNews = unstable_cache(
  async (limit: number) => listNewsPosts(limit),
  ['public-news-v1'],
  { revalidate: 30 }
)

export const getCachedPublicStats = unstable_cache(
  async () => getAdminStats(),
  ['public-stats-v1'],
  { revalidate: 30 }
)
