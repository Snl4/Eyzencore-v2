import type { Metadata } from 'next'
import { ServersPageClient } from '../ServersPageClient'
import { getCurrentUser } from '@/lib/auth-server'
import { getCachedPublicServers } from '@/lib/public-cache'

export const metadata: Metadata = {
  title: 'Minecraft сервери — Eyzencore',
  description: 'Каталог українських Minecraft-серверів з live-моніторингом онлайну.',
}

export default async function MinecraftServersPage() {
  const [servers, initialUser] = await Promise.all([
    getCachedPublicServers(),
    getCurrentUser(),
  ])
  const initialServers = servers.filter(
    (server) => server.platform !== 'discord' && server.core !== 'discord'
  )
  return (
    <>
      <div className="bg-aurora" />
      <ServersPageClient
        initialServers={initialServers}
        initialUser={initialUser}
        lockedPlatform="Minecraft"
        activeKey="servers-minecraft"
        title="Minecraft сервери"
        crumb="простір / minecraft"
        addHref="/add-server/minecraft"
      />
    </>
  )
}
