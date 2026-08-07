import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { buildPageMetadata, itemListJsonLd, breadcrumbJsonLd, FILTERED_LISTING_ROBOTS } from '@/lib/seo'
import { buildResourcePath } from '@/lib/resource-slug'
import { searchModrinth, mapModrinthHitToCommunityResource } from '@/lib/modrinth'
import { listCommunityResources } from '@/lib/resources-db'
import { ResourcesPageClient } from './ResourcesPageClient'

export const dynamic = 'force-dynamic'

type ResourcesPageProps = {
  searchParams?: {
    q?: string
    search?: string
    type?: string
    version?: string
    loader?: string
    category?: string
    sort?: string
    page?: string
  }
}

const TYPE_NAMES_UK: Record<string, string> = {
  mod: 'Моди',
  plugin: 'Плагіни',
  resourcepack: 'Ресурспаки',
  shader: 'Шейдери',
  datapack: 'Датапаки',
  modpack: 'Збірки (модпаки)',
}

export async function generateMetadata({ searchParams }: ResourcesPageProps): Promise<Metadata> {
  const search = (searchParams?.search || searchParams?.q || '').trim()
  const type = searchParams?.type || 'all'
  const version = searchParams?.version || 'all'
  const loader = searchParams?.loader || 'all'
  const page = Number(searchParams?.page || 1)

  const parts: string[] = []
  if (type !== 'all' && TYPE_NAMES_UK[type]) {
    parts.push(TYPE_NAMES_UK[type])
  } else {
    parts.push('Ресурси Minecraft')
  }

  if (loader !== 'all') {
    parts.push(`для ${loader.charAt(0).toUpperCase() + loader.slice(1)}`)
  }

  if (version !== 'all') {
    parts.push(`Minecraft ${version}`)
  }

  if (search) {
    parts.push(`за запитом «${search}»`)
  }

  if (page > 1) {
    parts.push(`— Сторінка ${page}`)
  }

  const title = parts.join(' ')
  const typeDesc = type !== 'all' && TYPE_NAMES_UK[type] ? TYPE_NAMES_UK[type].toLowerCase() : 'моди, плагіни, ресурспаки, шейдери, датапаки та збірки'
  const description = `Каталог ресурсів Minecraft на Eyzencore: знаходьте та завантажуйте найкращі ${typeDesc} з Modrinth${version !== 'all' ? ` для версії ${version}` : ''}${loader !== 'all' ? ` під ${loader}` : ''}. Прямі завантаження, опис та сумісність.`

  const hasFilters = Boolean(search || type !== 'all' || version !== 'all' || loader !== 'all' || page > 1)

  return {
    ...buildPageMetadata({
      title,
      description,
      path: '/resources',
      keywords: [
        'Minecraft моди',
        'Minecraft плагіни',
        'ресурспаки Minecraft',
        'шейдери Minecraft',
        'датапаки Minecraft',
        'Modrinth Україна',
        'Fabric моди',
        'Forge моди',
        'Paper плагіни',
        'Spigot плагіни',
        'скачати моди майнкрафт',
      ],
    }),
    ...(hasFilters ? { robots: FILTERED_LISTING_ROBOTS } : {}),
  }
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const search = (searchParams?.search || searchParams?.q || '').trim()
  const type = searchParams?.type || 'all'
  const loader = searchParams?.loader || 'all'
  const gameVersion = searchParams?.version || 'all'
  const category = searchParams?.category || 'all'
  const sort = (searchParams?.sort || (search ? 'relevance' : 'downloads')) as
    | 'relevance'
    | 'downloads'
    | 'follows'
    | 'newest'
    | 'updated'
  const page = Math.max(Number(searchParams?.page || 1), 1)
  const limit = 24
  const offset = (page - 1) * limit

  const [initialUser, modrinthResult] = await Promise.all([
    getCurrentUser(),
    searchModrinth({
      query: search,
      projectType: type,
      loader,
      gameVersion,
      category,
      sort,
      offset,
      limit,
    }),
  ])

  const role = initialUser
    ? await resolveUserRole({
        userId: initialUser.id,
        role: initialUser.user_metadata.role,
      })
    : null
  const canManage = Boolean(initialUser && (role === 'ADMIN' || initialUser.email === ADMIN_EMAIL))

  const modrinthResources = modrinthResult.hits.map(mapModrinthHitToCommunityResource)

  let localResources: typeof modrinthResources = []
  if (page === 1 && !search && loader === 'all' && gameVersion === 'all' && category === 'all') {
    try {
      const localList = await listCommunityResources({
        limit: 10,
        type: type === 'all' ? undefined : type,
      })
      localResources = localList.filter((r) => r.featured)
    } catch {
      // Ignore local db errors
    }
  }

  const seenSlugs = new Set<string>()
  const resources = [...localResources, ...modrinthResources].filter((r) => {
    if (seenSlugs.has(r.slug)) return false
    seenSlugs.add(r.slug)
    return true
  })

  const totalHits = modrinthResult.total_hits + localResources.length
  const totalPages = Math.max(1, Math.ceil(totalHits / limit))

  const jsonLd = [
    itemListJsonLd({
      name: 'Каталог ресурсів Minecraft — Eyzencore',
      path: '/resources',
      items: resources.slice(0, 30).map((resource) => ({
        name: resource.name,
        url: buildResourcePath(resource),
      })),
    }),
    breadcrumbJsonLd([
      { name: 'Спільнота', path: '/forum' },
      { name: 'Ресурси', path: '/resources' },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="bg-aurora" />
      <ResourcesPageClient
        initialUser={initialUser}
        initialResources={resources}
        initialTotalHits={totalHits}
        initialPage={page}
        initialTotalPages={totalPages}
        initialFilters={{
          search,
          type,
          loader,
          version: gameVersion,
          category,
          sort,
        }}
        canManage={canManage}
      />
    </>
  )
}
