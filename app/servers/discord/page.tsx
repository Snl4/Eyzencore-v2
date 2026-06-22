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
      'каталог Discord серверів',
      'моніторинг Discord серверів',
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
  const jsonLd = [
    itemListJsonLd({
      name: 'Discord сервери на Eyzencore',
      path: '/servers/discord',
      items: initialServers.slice(0, 20).map((server) => ({
        name: server.name,
        url: buildServerPublicPath(server),
        item: serverJsonLd(server),
      })),
    }),
    breadcrumbJsonLd([
      { name: 'Eyzencore', path: '/' },
      { name: 'Discord сервери', path: '/servers/discord' },
    ]),
    faqJsonLd([
      {
        question: 'Як знайти активний Discord сервер?',
        answer: 'Обирайте спільноти за тематикою, описом, тегами, рейтингом, активністю та відгуками користувачів.',
      },
      {
        question: 'Чи можна додати свій Discord сервер?',
        answer: 'Так, власник може додати Discord сервер у каталог, оформити сторінку, зібрати відгуки та просувати спільноту.',
      },
      {
        question: 'Які Discord спільноти є в Eyzencore?',
        answer: 'У каталозі є gaming, Minecraft, community, support, voice chat, giveaways та інші українські й міжнародні Discord сервери.',
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
        lockedPlatform="Discord"
        activeKey="servers-discord"
        title="Discord сервери"
        crumb="простір / discord"
        addHref="/add-server/discord"
        seoVariant="Discord"
      />
    </>
  )
}
