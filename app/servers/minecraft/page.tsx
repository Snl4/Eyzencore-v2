import type { Metadata } from 'next'
import { ServersPageClient } from '../ServersPageClient'
import { getCurrentUser } from '@/lib/auth-server'
import { getCachedPublicServers } from '@/lib/public-cache'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Minecraft сервери — рейтинг, онлайн, голосування',
    description:
      'Каталог Minecraft серверів України та світу: Java, Bedrock, Survival, SkyBlock, RPG, PvP, SMP. Перевіряйте онлайн, рейтинг, голоси, відгуки та IP серверів.',
    path: '/servers/minecraft',
    keywords: [
      'Minecraft сервери',
      'майнкрафт сервери',
      'українські Minecraft сервери',
      'Minecraft servers',
      'Minecraft server list',
      'Minecraft survival server',
      'Bedrock servers',
      'Java servers',
      'SkyBlock сервер',
      'PvP Minecraft',
      'SMP Minecraft',
    ],
  }),
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
