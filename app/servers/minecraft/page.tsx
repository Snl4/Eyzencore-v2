import type { Metadata } from 'next'
import { ServersPageClient } from '../ServersPageClient'
import { getCurrentUser } from '@/lib/auth-server'
import { getCachedPublicServers } from '@/lib/public-cache'
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqJsonLd,
  itemListJsonLd,
  serverJsonLd,
} from '@/lib/seo'
import { buildServerPublicPath } from '@/lib/server-slug'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Українські сервера майнкрафт - рейтинг, онлайн, голосування',
    description:
      'Каталог українських серверів майнкрафт: Java, Bedrock, Survival, SkyBlock, RPG, PvP, SMP. Перевіряйте онлайн, рейтинг, голоси, відгуки та IP серверів України.',
    path: '/servers/minecraft',
    keywords: [
      'українські сервера майнкрафт',
      'українські Minecraft сервери',
      'майнкрафт сервери',
      'Minecraft сервери',
      'моніторинг майнкрафт серверів',
      'топ майнкрафт серверів',
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
  const jsonLd = [
    itemListJsonLd({
      name: 'Minecraft сервери на Eyzencore',
      path: '/servers/minecraft',
      items: initialServers.slice(0, 20).map((server) => ({
        name: server.name,
        url: buildServerPublicPath(server),
        item: serverJsonLd(server),
      })),
    }),
    breadcrumbJsonLd([
      { name: 'Eyzencore', path: '/' },
      { name: 'Minecraft сервери', path: '/servers/minecraft' },
    ]),
    faqJsonLd([
      {
        question: 'Як знайти хороший Minecraft сервер?',
        answer: 'Фільтруйте сервери за режимом, версією, Java або Bedrock, дивіться онлайн, рейтинг, голоси та відгуки гравців.',
      },
      {
        question: 'Чи можна додати свій Minecraft сервер у моніторинг?',
        answer: 'Так, власник може додати сервер, підтвердити права, отримати статистику, API-ключі, callback і сторінку для просування.',
      },
      {
        question: 'Які Minecraft сервери є в каталозі?',
        answer: 'У каталозі є Survival, SMP, SkyBlock, RPG, PvP, Creative, Hardcore, mini-games, Java і Bedrock сервери.',
      },
    ]),
  ]

  return (
    <>
      {jsonLd.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
      <div className="bg-aurora" />
      <ServersPageClient
        initialServers={initialServers}
        initialUser={initialUser}
        lockedPlatform="Minecraft"
        activeKey="servers-minecraft"
        title="Українські сервера майнкрафт"
        crumb="простір / minecraft"
        addHref="/add-server/minecraft"
        seoVariant="Minecraft"
      />
    </>
  )
}
