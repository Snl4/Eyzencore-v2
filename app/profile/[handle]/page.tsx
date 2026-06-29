import { notFound } from 'next/navigation'
import { ProfileClient } from '@/components/profile/ProfileClient'
import { listUserBadges } from '@/lib/achievements'
import { countServersByOwner, getUserByProfileSlug, getUserProfileSummary, listServersByOwner } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { listForumThreadsByUser } from '@/lib/forum-db'
import { buildPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type PublicProfilePageProps = {
  params: {
    handle: string
  }
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const user = await getUserByProfileSlug(params.handle)
  if (!user) {
    return {
      title: 'Профіль не знайдено',
    }
  }
  const profileSlug = user.user_metadata.profile_slug || params.handle
  return buildPageMetadata({
    title: `Профіль @${profileSlug}`,
    description: `Публічний профіль користувача ${user.user_metadata.full_name || 'Eyzencore user'}.`,
    path: `/profile/${profileSlug}`,
  })
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const user = await getUserByProfileSlug(params.handle)
  if (!user) {
    notFound()
  }
  const [currentUser, serverCount, ownedServers, forumThreads, summary, badges] = await Promise.all([
    getCurrentUser(),
    countServersByOwner(user.id),
    listServersByOwner(user.id),
    listForumThreadsByUser(user.id),
    getUserProfileSummary(user.id, 30),
    listUserBadges(user.id),
  ])
  const totalOnline = ownedServers.reduce((sum, server) => sum + (server.on ? server.players : 0), 0)
  return (
    <>
      <div className="bg-aurora" />
      <ProfileClient
        user={user}
        currentUser={currentUser}
        serverCount={serverCount}
        totalOnline={totalOnline}
        summary={summary}
        forumThreads={forumThreads}
        isPublicView
        badges={badges}
        ownedServers={ownedServers.map((server) => ({
          seed: server.seed,
          ic: server.ic,
          name: server.name,
          addr: server.addr,
          avatarUrl: server.avatarUrl,
          bannerUrl: server.bannerUrl,
          online: server.on,
          players: server.players,
          max: server.max,
          ver: server.ver,
          mode: server.mode,
          uptime: server.uptime,
        }))}
      />
    </>
  )
}
