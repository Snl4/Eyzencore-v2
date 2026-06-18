import { prisma } from '@/lib/prisma'

export type AuthReviewTickerItem = {
  id: number
  text: string
  rating: number
  author: string
  serverName: string
  serverAvatarUrl: string
  platform: string
}

export async function getAuthReviewTicker(): Promise<AuthReviewTickerItem[]> {
  const reviews = await prisma.app_server_reviews.findMany({
    where: {
      text: { not: '' },
    },
    orderBy: [
      { updated_at: 'desc' },
      { rating: 'desc' },
    ],
    take: 8,
    select: {
      id: true,
      text: true,
      rating: true,
      author_name: true,
      app_servers: {
        select: {
          name: true,
          avatar_url: true,
          platform: true,
          core: true,
        },
      },
      app_users: {
        select: {
          full_name: true,
        },
      },
    },
  })

  return reviews.map((review) => ({
    id: review.id,
    text: review.text,
    rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
    author: review.app_users?.full_name || review.author_name || 'Гість',
    serverName: review.app_servers?.name || 'сервер спільноти',
    serverAvatarUrl: review.app_servers?.avatar_url || '/project-default-logo.png',
    platform: review.app_servers?.platform === 'discord' || review.app_servers?.core === 'discord' ? 'Discord' : 'Minecraft',
  }))
}
