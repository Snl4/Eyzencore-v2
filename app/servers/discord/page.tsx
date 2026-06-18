import type { Metadata } from 'next'
import { ServersPageClient } from '../ServersPageClient'
import { getCurrentUser } from '@/lib/auth-server'
import { getCachedPublicServers } from '@/lib/public-cache'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Discord сервери і спільноти — рейтинг, онлайн, каталог',
    description:
      'Каталог Discord серверів і українських спільнот: gaming, Minecraft, support, community, giveaways, voice chat. Онлайн, учасники, категорії та рейтинг.',
    path: '/servers/discord',
    keywords: [
      'Discord сервери',
      'Discord servers',
      'українські Discord сервери',
      'Discord спільноти',
      'Discord communities',
      'Minecraft Discord',
      'gaming Discord Ukraine',
      'Discord server list',
    ],
  }),
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
