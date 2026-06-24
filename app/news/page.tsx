import type { Metadata } from 'next'
import { NewsPageClient } from './NewsPageClient'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { getCachedPublicNews } from '@/lib/public-cache'
import { buildNewsPath } from '@/lib/news-slug'
import { buildPageMetadata, itemListJsonLd, newsJsonLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Новини Minecraft, Discord і серверів',
    description:
      'Новини Eyzencore: оновлення Minecraft і Discord серверів, анонси спільнот, гайди, огляди, події, ресурси та новини української gaming-спільноти.',
    path: '/news',
    keywords: [
      'новини Minecraft',
      'Minecraft news',
      'Discord news',
      'анонси серверів',
      'гайди Minecraft',
      'ресурси Minecraft',
      'новини серверів',
    ],
  }),
}

export default async function NewsPage() {
  const [initialUser, initialPosts] = await Promise.all([
    getCurrentUser(),
    getCachedPublicNews(50),
  ])
  const role = initialUser
    ? await resolveUserRole({
        userId: initialUser.id,
        role: initialUser.user_metadata.role,
      })
    : null
  const canCreateNews = role === 'OWNER' || role === 'ADMIN'
  const jsonLd = itemListJsonLd({
    name: 'Новини Eyzencore',
    path: '/news',
    items: initialPosts.slice(0, 20).map((post) => ({
      name: post.title,
      url: buildNewsPath(post),
      item: newsJsonLd(post),
    })),
  })
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="bg-aurora" />
      <NewsPageClient initialUser={initialUser} initialPosts={initialPosts} canCreateNews={canCreateNews} />
    </>
  )
}
