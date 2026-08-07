import { stat } from 'node:fs/promises'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, SITE_URL } from '@/lib/seo'
import { buildResourcePath, parseResourceIdFromSlug } from '@/lib/resource-slug'
import { getCommunityResourceById, getCommunityResourceBySlug } from '@/lib/resources-db'
import {
  getModrinthProject,
  getModrinthProjectTeam,
  getModrinthProjectVersions,
  mapModrinthProjectToCommunityResource,
} from '@/lib/modrinth'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'
import { resolveUploadPath, UPLOAD_URL_PREFIX } from '@/lib/upload-store'
import { DeleteResourceButton } from './DeleteResourceButton'
import { ResourceDownloadButton } from './ResourceDownloadButton'
import { ResourceDetailTabs } from './ResourceDetailTabs'
import { ResourceViewTracker } from './ResourceViewTracker'

export const revalidate = 300 // Revalidate cached resource pages every 5 minutes

type ResourceDetailsPageProps = {
  params: {
    slug: string
  }
}

const TYPE_LABELS: Record<string, string> = {
  mod: 'Мод',
  plugin: 'Плагін',
  resourcepack: 'Ресурспак',
  shader: 'Шейдер',
  datapack: 'Датапак',
  modpack: 'Збірка',
  model: 'Модель',
  tool: 'Інструмент',
}

export type ResourceDownloadVersion = {
  id: string
  name: string
  number: string
  type: string
  gameVersions: string[]
  loaders: string[]
  datePublished: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  changelog?: string | null
}

async function getResourceFromParam(value: string) {
  const cleanParam = decodeURIComponent(value.trim())

  // 1. Check local DB by numeric ID if present
  const byId = parseResourceIdFromSlug(cleanParam)
  if (byId) {
    const localById = await getCommunityResourceById(byId)
    if (localById) return localById
  }

  // 2. Check local DB by exact slug
  const bySlug = await getCommunityResourceBySlug(cleanParam)
  if (bySlug) return bySlug

  // 3. Query Modrinth API directly
  const modrinthSlug = cleanParam.replace(/-\d+$/, '') // strip trailing ID if any
  const modrinthProject = await getModrinthProject(modrinthSlug)
  if (modrinthProject) {
    const authorName = await getModrinthProjectTeam(modrinthProject.team)
    return mapModrinthProjectToCommunityResource(modrinthProject, authorName)
  }

  return null
}

async function localUploadExists(url: string) {
  if (!url.startsWith(`${UPLOAD_URL_PREFIX}/`)) return true
  const parts = url
    .slice(UPLOAD_URL_PREFIX.length + 1)
    .split('/')
    .filter(Boolean)
  const filePath = resolveUploadPath(parts)
  if (!filePath) return false
  try {
    const info = await stat(filePath)
    return info.isFile()
  } catch {
    return false
  }
}

async function filterExistingResourceMedia(media: string[]) {
  const checks = await Promise.all(
    media.map(async (item) => ({
      item,
      exists: await localUploadExists(item),
    })),
  )
  return checks.filter((check) => check.exists).map((check) => check.item)
}

async function getProjectDownloadVersions(
  projectId: string | null,
  sourceHost: string | null,
  slug: string,
): Promise<ResourceDownloadVersion[]> {
  const targetSlug = projectId || slug
  if (!targetSlug) return []

  try {
    const modrinthVersions = await getModrinthProjectVersions(targetSlug)
    if (modrinthVersions && modrinthVersions.length > 0) {
      const results: ResourceDownloadVersion[] = []
      for (const version of modrinthVersions) {
        const file = version.files.find((item) => item.primary) || version.files[0]
        if (!file?.url) continue
        results.push({
          id: version.id,
          name: version.name || version.version_number,
          number: version.version_number,
          type: version.version_type,
          gameVersions: version.game_versions || [],
          loaders: version.loaders || [],
          datePublished: version.date_published,
          fileName: file.filename,
          fileUrl: file.url,
          fileSize: typeof file.size === 'number' ? file.size : null,
          changelog: version.changelog || null,
        })
      }
      return results
    }
  } catch (err) {
    console.warn(`[Modrinth] Failed to fetch versions for ${targetSlug}:`, err)
  }

  return []
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('uk-UA', { notation: value > 9999 ? 'compact' : 'standard' }).format(value)
}

export async function generateMetadata({ params }: ResourceDetailsPageProps): Promise<Metadata> {
  const resource = await getResourceFromParam(params.slug)
  if (!resource) {
    return {
      title: 'Ресурс не знайдено — Eyzencore',
      description: 'Запитуваний ресурс Minecraft не знайдено у каталозі.',
    }
  }

  const typeLabel = TYPE_LABELS[resource.type] || 'Ресурс'
  const versionsString = resource.gameVersions.slice(0, 4).join(', ')
  const loadersString = resource.loaders.slice(0, 3).join(', ')

  const title = `${resource.name} — ${typeLabel} для Minecraft ${versionsString ? `(${versionsString})` : ''} | Скачати`
  const description =
    resource.summary ||
    `Завантажити ${resource.name} (${typeLabel} Minecraft) на Eyzencore. Сумісність: ${loadersString || 'Fabric, Forge'}, версії: ${versionsString || '1.20, 1.21'}. Безпечні прямі завантаження.`

  const canonicalPath = buildResourcePath(resource)

  return buildPageMetadata({
    title,
    description,
    path: canonicalPath,
    image: resource.iconUrl || resource.gallery[0] || IMAGE_PLACEHOLDER,
    modifiedTime: resource.updatedAt,
    publishedTime: resource.publishedAt || resource.createdAt,
    keywords: [
      resource.name,
      `${resource.name} Minecraft`,
      `${resource.name} скачати`,
      `${resource.name} download`,
      `${typeLabel} Minecraft`,
      'Minecraft моди',
      'Minecraft плагіни',
      ...resource.loaders.map((loader) => `${loader} ${resource.name}`),
      ...resource.gameVersions.map((version) => `Minecraft ${version} ${resource.name}`),
      ...resource.tags,
    ],
  })
}

export default async function ResourceDetailsPage({ params }: ResourceDetailsPageProps) {
  const [initialUser, resource] = await Promise.all([
    getCurrentUser(),
    getResourceFromParam(params.slug),
  ])

  if (!resource) notFound()

  const canonicalPath = buildResourcePath(resource)
  const currentSlug = decodeURIComponent(params.slug)
  const targetSlug = canonicalPath.split('/').pop()

  if (currentSlug !== targetSlug && !currentSlug.endsWith(`-${resource.id}`)) {
    permanentRedirect(canonicalPath)
  }

  const role = initialUser
    ? await resolveUserRole({
        userId: initialUser.id,
        role: initialUser.user_metadata.role,
      })
    : null
  const isLocalResource = resource.authorUserId !== 'modrinth' && resource.id > 0
  const canManage = Boolean(initialUser && isLocalResource && (role === 'ADMIN' || initialUser.email === ADMIN_EMAIL))

  const [gallery, downloadVersions] = await Promise.all([
    filterExistingResourceMedia(resource.gallery),
    getProjectDownloadVersions(resource.projectId, resource.sourceHost, resource.slug),
  ])

  const primaryDownloadUrl = downloadVersions[0]?.fileUrl || resource.downloadUrl || resource.sourceUrl

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: resource.name,
      url: `${SITE_URL}${canonicalPath}`,
      image: absoluteUrl(resource.iconUrl || resource.gallery[0] || IMAGE_PLACEHOLDER),
      description: resource.summary || resource.description.slice(0, 300),
      applicationCategory: 'GameApplication',
      operatingSystem: `Minecraft ${resource.gameVersions.slice(0, 8).join(', ') || 'Java Edition'}`,
      softwareVersion: downloadVersions[0]?.number || resource.gameVersions[0] || undefined,
      downloadUrl: primaryDownloadUrl,
      fileSize: downloadVersions[0]?.fileSize || undefined,
      dateModified: resource.updatedAt,
      datePublished: resource.publishedAt || resource.createdAt,
      license: resource.license || undefined,
      applicationSubCategory: TYPE_LABELS[resource.type] || resource.type,
      keywords: [...resource.loaders, ...resource.gameVersions, ...resource.tags].join(', '),
      author: resource.authorName ? { '@type': 'Person', name: resource.authorName } : undefined,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/DownloadAction',
          userInteractionCount: resource.downloads,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/ViewAction',
          userInteractionCount: resource.views,
        },
      ],
    },
    breadcrumbJsonLd([
      { name: 'Головна', path: '/' },
      { name: 'Ресурси', path: '/resources' },
      { name: resource.name, path: canonicalPath },
    ]),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {isLocalResource && <ResourceViewTracker resourceId={resource.id} />}
      <div className="bg-aurora" />
      <PageShell active="resources" initialUser={initialUser}>
        <article className="page-main resource-details">
          <Breadcrumbs
            items={[
              { label: 'Спільнота', href: '/forum' },
              { label: 'Ресурси', href: '/resources' },
              { label: resource.name },
            ]}
          />
          <section className="resource-project-hero">
            <img
              className="resource-project-icon"
              src={resource.iconUrl || IMAGE_PLACEHOLDER}
              alt={resource.name}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <div className="resource-project-heading">
              <div className="resource-project-title-row">
                <h1>{resource.name}</h1>
                <span className="resource-type-pill">{TYPE_LABELS[resource.type] || resource.type}</span>
                {resource.verified && (
                  <span className="resource-verified" title="Перевірений ресурс Modrinth">✓ Verified</span>
                )}
              </div>
              <p>{resource.summary || resource.description.slice(0, 240)}</p>
              <div className="resource-project-meta">
                <span>by <b>{resource.authorName || 'Modrinth Creator'}</b></span>
                <span>↓ {formatCompactNumber(resource.downloads)} завантажень</span>
                {resource.followers > 0 && <span>★ {formatCompactNumber(resource.followers)} підписників</span>}
                {resource.side && <span>⚙ {resource.side}</span>}
              </div>
            </div>
            <div className="resource-project-actions">
              <ResourceDownloadButton
                resourceId={resource.id}
                resourceName={resource.name}
                iconUrl={resource.iconUrl || IMAGE_PLACEHOLDER}
                versions={downloadVersions}
                fallbackDownloadUrl={primaryDownloadUrl}
              />
              {canManage && (
                <>
                  <Link className="btn btn-secondary" href={`${canonicalPath}/edit`}>
                    Редагувати
                  </Link>
                  <DeleteResourceButton resourceId={resource.id} />
                </>
              )}
            </div>
          </section>

          <ResourceDetailTabs
            description={resource.description || resource.summary}
            gallery={gallery}
            downloadVersions={downloadVersions}
            fallbackDownloadUrl={primaryDownloadUrl}
            sourceUrl={resource.sourceUrl}
            gameVersions={resource.gameVersions}
            loaders={resource.loaders}
            tags={resource.tags}
            side={resource.side}
            license={resource.license}
            authorName={resource.authorName}
          />
        </article>
      </PageShell>
    </>
  )
}
