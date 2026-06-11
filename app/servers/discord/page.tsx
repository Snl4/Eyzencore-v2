import type { Metadata } from 'next'
import { ServersPageClient } from '../ServersPageClient'
import { getCurrentUser } from '@/lib/auth-server'
import { getCachedPublicServers } from '@/lib/public-cache'

export const metadata: Metadata = {
  title: 'Discord сервери — Eyzencore',
  description: 'Моніторинг українських Discord-спільнот: онлайн, учасники, категорії.',
}

export default async function DiscordServersPage() {
  const [servers, initialUser] = await Promise.all([
    getCachedPublicServers(),
    getCurrentUser(),
  ])
  const initialServers = servers.filter(
    (server) => server.platform === 'discord' || server.core === 'discord'
  )
  return (
    <>
      <div className="bg-aurora" />
      <ServersPageClient
        initialServers={initialServers}
        initialUser={initialUser}
        lockedPlatform="Discord"
        activeKey="servers-discord"
        title="Discord сервери"
        crumb="простір / discord"
        addHref="/add-server/discord"
      />
    </>
  )
}
