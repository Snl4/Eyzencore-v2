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
import { getCommunityResourceById, getCommunityResourceBySlug, listCommunityResources } from '@/lib/resources-db'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'
import { resolveUploadPath, UPLOAD_URL_PREFIX } from '@/lib/upload-store'
import { DeleteResourceButton } from './DeleteResourceButton'
import { ResourceDownloadButton } from './ResourceDownloadButton'
import { ResourceDetailTabs } from './ResourceDetailTabs'
import { ResourceViewTracker } from './ResourceViewTracker'

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

type ResourceDownloadVersion = {
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
}

type ModrinthVersion = {
  id: string
  name: string
  version_number: string
  version_type: string
  game_versions: string[]
  loaders: string[]
  date_published: string
  files: Array<{
    url: string
    filename: string
    primary?: boolean
    size?: number
  }>
}

async function getResourceFromParam(value: string) {
  const byId = parseResourceIdFromSlug(value)
  if (byId) return getCommunityResourceById(byId)
  const bySlug = await getCommunityResourceBySlug(value)
  if (bySlug) return bySlug
  const resources = await listCommunityResources({ limit: 200 })
  return resources.find((resource) => resource.slug === value) || null
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

async function getModrinthDownloadVersions(projectId: string | null, sourceHost: string | null): Promise<ResourceDownloadVersion[]> {
  if (!projectId || sourceHost !== 'modrinth.com') return []
  try {
    const response = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Eyzencore resources (https://eyzencore.com)',
      },
      next: { revalidate: 3600 },
    })
    if (!response.ok) return []
    const versions = (await response.json()) as ModrinthVersion[]
    return versions
      .map((version) => {
        const file = version.files.find((item) => item.primary) || version.files[0]
        if (!file?.url) return null
        return {
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
        }
      })
      .filter((version): version is ResourceDownloadVersion => Boolean(version))
  } catch {
    return []
  }
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('uk-UA', { notation: value > 9999 ? 'compact' : 'standard' }).format(value)
}

export async function generateMetadata({ params }: ResourceDetailsPageProps): Promise<Metadata> {
  const resource = await getResourceFromParam(params.slug)
  if (!resource) return { title: 'Ресурс не знайдено' }
  return buildPageMetadata({
    title: `${resource.name} - ${TYPE_LABELS[resource.type] || 'Ресурс'} Minecraft`,
    description: resource.summary || resource.description,
    path: buildResourcePath(resource),
    image: resource.iconUrl || IMAGE_PLACEHOLDER,
    modifiedTime: resource.updatedAt,
    keywords: [
      resource.name,
      resource.type,
      `${resource.name} download`,
      `${resource.name} Minecraft`,
      `${resource.name} скачати`,
      `${TYPE_LABELS[resource.type] || 'Ресурс'} Minecraft`,
      ...resource.loaders.map((loader) => `${loader} Minecraft`),
      ...resource.gameVersions.map((version) => `Minecraft ${version}`),
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
  if (params.slug !== canonicalPath.split('/').pop()) {
    permanentRedirect(canonicalPath)
  }
  const role = initialUser
    ? await resolveUserRole({
        userId: initialUser.id,
        role: initialUser.user_metadata.role,
      })
    : null
  const canManage = Boolean(initialUser && (role === 'ADMIN' || initialUser.email === ADMIN_EMAIL))
  const [gallery, downloadVersions] = await Promise.all([
    filterExistingResourceMedia(resource.gallery),
    getModrinthDownloadVersions(resource.projectId, resource.sourceHost),
  ])
  const primaryDownloadUrl = downloadVersions[0]?.fileUrl || resource.downloadUrl || resource.sourceUrl
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: resource.name,
      url: `${SITE_URL}${canonicalPath}`,
      image: absoluteUrl(resource.iconUrl || IMAGE_PLACEHOLDER),
      description: resource.summary || resource.description,
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
      { name: 'Ресурси', path: '/resources' },
      { name: resource.name, path: canonicalPath },
    ]),
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ResourceViewTracker resourceId={resource.id} />
      <div className="bg-aurora" />
      <PageShell active="resources" initialUser={initialUser}>
        <article className="page-main resource-details">
          <Breadcrumbs items={[{ label: 'Спільнота', href: '/forum' }, { label: 'Ресурси', href: '/resources' }, { label: resource.name }]} />
          <section className="resource-project-hero">
            <img className="resource-project-icon" src={resource.iconUrl || IMAGE_PLACEHOLDER} alt="" loading="eager" decoding="async" fetchPriority="high" />
            <div className="resource-project-heading">
              <div className="resource-project-title-row">
                <h1>{resource.name}</h1>
                <span className="resource-type-pill">{TYPE_LABELS[resource.type] || resource.type}</span>
              </div>
              <p>{resource.summary || resource.description.slice(0, 240)}</p>
              <div className="resource-project-meta">
                <span>↓ {formatCompactNumber(resource.downloads)} завантажень</span>
                <span>◉ {formatCompactNumber(resource.views)} переглядів</span>
                {resource.tags[0] && <span>{resource.tags[0]}</span>}
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
          />
        </article>
      </PageShell>
    </>
  )
}

