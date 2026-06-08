import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProfileClient } from '@/components/profile/ProfileClient'
import { countServersByOwner, getUserByProfileSlug, getUserProfileSummary, listServersByOwner } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

type PublicProfilePageProps = {
  params: {
    handle: string
  }
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const user = getUserByProfileSlug(params.handle)
  if (!user) {
    return {
      title: 'Профіль не знайдено',
    }
  }
  return {
    title: `Профіль @${user.user_metadata.profile_slug || 'user'}`,
    description: `Публічний профіль користувача ${user.user_metadata.full_name || 'Eyzencore user'}.`,
  }
}

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
  const user = getUserByProfileSlug(params.handle)
  if (!user) {
    notFound()
  }
  const currentUser = getCurrentUser()
  const serverCount = countServersByOwner(user.id)
  const ownedServers = listServersByOwner(user.id)
  const totalOnline = ownedServers.reduce((sum, server) => sum + (server.on ? server.players : 0), 0)
  const summary = getUserProfileSummary(user.id, 30)
  return (
    <>
      <div className="bg-aurora" />
      <ProfileClient
        user={user}
        currentUser={currentUser}
        serverCount={serverCount}
        totalOnline={totalOnline}
        summary={summary}
        isPublicView
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
