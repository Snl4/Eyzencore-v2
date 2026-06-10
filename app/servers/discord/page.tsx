import type { Metadata } from 'next'
import { ServersPageClient } from '../ServersPageClient'
import { listServers } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'

export const metadata: Metadata = {
  title: 'Discord сервери — Eyzencore',
  description: 'Моніторинг українських Discord-спільнот: онлайн, учасники, категорії.',
}

export default async function DiscordServersPage() {
  const initialServers = await listServers()
  const initialUser = await getCurrentUser()
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
        addHref="/add-server?platform=discord"
      />
    </>
  )
}
