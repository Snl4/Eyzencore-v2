import { prisma } from '@/lib/prisma'
import type { UserBadge } from '@/components/profile/UserBadgesTab'
import {
  UserAchievementMetrics,
  isAchievementConditionMet,
} from '@/lib/achievement-utils'

export async function getUserAchievementMetrics(
  userId: string
): Promise<UserAchievementMetrics> {
  const user = await prisma.app_users.findUnique({
    where: { id: userId },
    select: { created_at: true },
  })
  const ownedServers = await prisma.app_servers.findMany({
    where: { owner_id: userId },
    select: { id: true, verified: true, players: true },
  })
  const serverIds = ownedServers.map((server) => server.id)
  const [
    forumThreadsCount,
    forumPostsCount,
    votesReceived,
    reviewsReceived,
    viewsReceived,
    reviewsAgg,
  ] = await Promise.all([
    prisma.forum_threads.count({ where: { author_user_id: userId } }),
    prisma.forum_posts.count({ where: { author_user_id: userId } }),
    serverIds.length
      ? prisma.app_server_nickname_votes.count({
          where: { server_id: { in: serverIds } },
        })
      : 0,
    serverIds.length
      ? prisma.app_server_reviews.count({
          where: { server_id: { in: serverIds } },
        })
      : 0,
    serverIds.length
      ? prisma.app_server_views.count({
          where: { server_id: { in: serverIds } },
        })
      : 0,
    serverIds.length
      ? prisma.app_server_reviews.aggregate({
          where: { server_id: { in: serverIds } },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : { _avg: { rating: null }, _count: { rating: 0 } },
  ])
  const serversCount = ownedServers.length
  const hasVerifiedServer = ownedServers.some((server) => server.verified === 1)
  const maxServerPlayers = ownedServers.reduce(
    (max, server) => Math.max(max, server.players),
    0
  )
  const averageRating = Number(reviewsAgg._avg.rating ?? 0)
  const reviewCount = Number(reviewsAgg._count.rating ?? 0)
  const ratingBonus =
    reviewCount > 0 ? Math.round((averageRating - 3) * reviewCount * 2) : 0
  const karma = Math.max(0, votesReceived + reviewCount * 5 + ratingBonus)
  const createdAt = user?.created_at
  const accountAgeDays = createdAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0
  return {
    serversCount,
    forumThreadsCount,
    forumPostsCount,
    votesReceived,
    reviewsReceived,
    viewsReceived,
    karma,
    hasVerifiedServer,
    maxServerPlayers,
    accountAgeDays,
  }
}

export async function syncAchievementsForUser(userId: string): Promise<number> {
  const [achievements, metrics, earnedRows] = await Promise.all([
    prisma.app_achievements.findMany({
      where: { is_active: 1 },
      orderBy: { sort_order: 'asc' },
    }),
    getUserAchievementMetrics(userId),
    prisma.app_user_achievements.findMany({
      where: { user_id: userId },
      select: { achievement_id: true },
    }),
  ])
  const earnedIds = new Set(earnedRows.map((row) => row.achievement_id))
  const now = new Date().toISOString()
  let awarded = 0
  for (const achievement of achievements) {
    if (earnedIds.has(achievement.id)) continue
    if (
      !isAchievementConditionMet(
        achievement.trigger_type,
        achievement.trigger_value,
        metrics,
        false
      )
    ) {
      continue
    }
    await prisma.app_user_achievements.create({
      data: {
        achievement_id: achievement.id,
        user_id: userId,
        granted_by: 'auto',
        earned_at: now,
      },
    })
    awarded += 1
  }
  return awarded
}

export async function listUserBadges(userId: string): Promise<UserBadge[]> {
  await syncAchievementsForUser(userId)
  const [achievements, earnedRows, metrics] = await Promise.all([
    prisma.app_achievements.findMany({
      where: { is_active: 1 },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    }),
    prisma.app_user_achievements.findMany({
      where: { user_id: userId },
      select: { achievement_id: true },
    }),
    getUserAchievementMetrics(userId),
  ])
  const earnedIds = new Set(earnedRows.map((row) => row.achievement_id))
  return achievements.map((achievement) => ({
    name: achievement.name,
    description: achievement.description,
    emblem: achievement.emblem,
    earned: isAchievementConditionMet(
      achievement.trigger_type,
      achievement.trigger_value,
      metrics,
      earnedIds.has(achievement.id)
    ),
  }))
}

export async function grantAchievementToUser(
  achievementId: number,
  userId: string,
  grantedBy: 'manual' | 'cms' = 'cms'
): Promise<void> {
  const existing = await prisma.app_user_achievements.findFirst({
    where: { achievement_id: achievementId, user_id: userId },
    select: { id: true },
  })
  if (existing) return
  await prisma.app_user_achievements.create({
    data: {
      achievement_id: achievementId,
      user_id: userId,
      granted_by: grantedBy,
      earned_at: new Date().toISOString(),
    },
  })
}

export async function revokeAchievementFromUser(
  achievementId: number,
  userId: string
): Promise<void> {
  await prisma.app_user_achievements.deleteMany({
    where: { achievement_id: achievementId, user_id: userId },
  })
}

export async function syncAllUserAchievements(): Promise<number> {
  const users = await prisma.app_users.findMany({ select: { id: true } })
  let total = 0
  for (const user of users) {
    total += await syncAchievementsForUser(user.id)
  }
  return total
}
