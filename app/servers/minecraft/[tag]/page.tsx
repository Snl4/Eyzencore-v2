import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ServersPageClient } from '../../ServersPageClient'
import { getCurrentUser } from '@/lib/auth-server'
import { getCachedPublicServers } from '@/lib/public-cache'
import {
  filterMinecraftServers,
  getMinecraftSeoLandingPage,
  listMinecraftSeoLandingSlugs,
  MINECRAFT_SEO_LANDING_PAGES,
} from '@/lib/minecraft-seo-pages'
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqJsonLd,
  itemListJsonLd,
  serverJsonLd,
} from '@/lib/seo'
import { buildServerPublicPath } from '@/lib/server-slug'

interface MinecraftSeoPageProps {
  params: { tag: string }
}

export function generateStaticParams(): Array<{ tag: string }> {
  return listMinecraftSeoLandingSlugs().map((tag) => ({ tag }))
}

export async function generateMetadata({ params }: MinecraftSeoPageProps): Promise<Metadata> {
  const page = getMinecraftSeoLandingPage(params.tag)
  if (!page) return {}
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: `/servers/minecraft/${page.slug}`,
    keywords: page.keywords,
  })
}

export default async function MinecraftSeoLandingRoute({ params }: MinecraftSeoPageProps) {
  const page = getMinecraftSeoLandingPage(params.tag)
  if (!page) notFound()
  const [servers, initialUser] = await Promise.all([
    getCachedPublicServers(),
    getCurrentUser(),
  ])
  const initialServers = filterMinecraftServers(servers)
  const relatedLinks = MINECRAFT_SEO_LANDING_PAGES
    .filter((entry) => entry.slug !== page.slug)
    .map((entry) => ({
      label: entry.h1,
      href: `/servers/minecraft/${entry.slug}`,
    }))
  const jsonLd = [
    itemListJsonLd({
      name: page.h1,
      path: `/servers/minecraft/${page.slug}`,
      items: initialServers.filter(page.matchServer).slice(0, 20).map((server) => ({
        name: server.name,
        url: buildServerPublicPath(server),
        item: serverJsonLd(server),
      })),
    }),
    breadcrumbJsonLd([
      { name: 'Eyzencore', path: '/' },
      { name: 'Minecraft сервери', path: '/servers/minecraft' },
      { name: page.h1, path: `/servers/minecraft/${page.slug}` },
    ]),
    faqJsonLd(page.faq),
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
        title={page.h1}
        breadcrumbs={[
          { label: 'Eyzencore', href: '/' },
          { label: 'Minecraft сервери', href: '/servers/minecraft' },
          { label: page.h1 },
        ]}
        addHref="/add-server/minecraft"
        filterOptions={{
          defaultMode: page.defaultMode,
          defaultVer: page.defaultVer,
          lockMode: page.lockMode,
          lockVer: page.lockVer,
          matchServer: page.matchServer,
        }}
        seoLanding={{
          kicker: 'Тематичний каталог',
          title: page.h1,
          paragraphs: page.paragraphs,
          faqTitle: page.faq[0]?.question || 'Як обрати сервер?',
          faqAnswer: page.faq[0]?.answer || '',
          relatedLinks,
        }}
      />
    </>
  )
}
