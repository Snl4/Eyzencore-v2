import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { listCommunityResources } from '@/lib/resources-db'
import { buildPageMetadata, itemListJsonLd } from '@/lib/seo'
import { buildResourcePath } from '@/lib/resource-slug'
import { ResourcesPageClient } from './ResourcesPageClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Ресурси Minecraft: моди, плагіни, ресурспаки',
    description:
      'Український каталог ресурсів Eyzencore для Minecraft: моди, плагіни, ресурспаки, шейдери, датапаки, збірки та інструменти для серверів і гравців.',
    path: '/resources',
    keywords: ['Minecraft моди', 'Minecraft плагіни', 'ресурспаки Minecraft', 'Modrinth Україна', 'плагіни Paper', 'Fabric моди'],
  }),
}

export default async function ResourcesPage() {
  const [initialUser, resources] = await Promise.all([
    getCurrentUser(),
    listCommunityResources({ limit: 120 }),
  ])
  const role = initialUser
    ? await resolveUserRole({
        userId: initialUser.id,
        role: initialUser.user_metadata.role,
      })
    : null
  const canManage = Boolean(initialUser && (role === 'ADMIN' || initialUser.email === ADMIN_EMAIL))
  const jsonLd = itemListJsonLd({
    name: 'Ресурси Eyzencore',
    path: '/resources',
    items: resources.slice(0, 50).map((resource) => ({
      name: resource.name,
      url: buildResourcePath(resource),
    })),
  })
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="bg-aurora" />
      <ResourcesPageClient initialUser={initialUser} initialResources={resources} canManage={canManage} />
    </>
  )
}
