import { unstable_cache } from 'next/cache'
import {
  getAdminStats,
  listNewsPosts,
  listServers,
} from '@/lib/auth-db'

export async function getCachedPublicServers() {
  return listServers()
}

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
