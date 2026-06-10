import type { Metadata } from 'next'
import { ServersPageClient } from '../ServersPageClient'
import { listServers } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'

export const metadata: Metadata = {
  title: 'Minecraft сервери — Eyzencore',
  description: 'Каталог українських Minecraft-серверів з live-моніторингом онлайну.',
}

export default async function MinecraftServersPage() {
  const initialServers = await listServers()
  const initialUser = await getCurrentUser()
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
        addHref="/add-server?platform=minecraft"
      />
    </>
  )
}
