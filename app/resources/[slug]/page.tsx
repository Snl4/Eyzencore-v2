import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { buildPageMetadata, SITE_URL } from '@/lib/seo'
import { buildResourcePath, parseResourceIdFromSlug } from '@/lib/resource-slug'
import { getCommunityResourceById, getCommunityResourceBySlug, listCommunityResources } from '@/lib/resources-db'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'
import { DeleteResourceButton } from './DeleteResourceButton'

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
  tool: 'Інструмент',
}

function isVideoMedia(url: string) {
  return /\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(url)
}

async function getResourceFromParam(value: string) {
  const byId = parseResourceIdFromSlug(value)
  if (byId) return getCommunityResourceById(byId)
  const bySlug = await getCommunityResourceBySlug(value)
  if (bySlug) return bySlug
  const resources = await listCommunityResources({ limit: 200 })
  return resources.find((resource) => resource.slug === value) || null
}

export async function generateMetadata({ params }: ResourceDetailsPageProps): Promise<Metadata> {
  const resource = await getResourceFromParam(params.slug)
  if (!resource) return { title: 'Ресурс не знайдено' }
  return buildPageMetadata({
    title: `${resource.name} - ${TYPE_LABELS[resource.type] || 'Ресурс'} Minecraft`,
    description: resource.summary || resource.description,
    path: buildResourcePath(resource),
    image: resource.iconUrl || IMAGE_PLACEHOLDER,
    keywords: [resource.name, resource.type, ...resource.loaders, ...resource.gameVersions, ...resource.tags],
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: resource.name,
    url: `${SITE_URL}${canonicalPath}`,
    image: resource.iconUrl || undefined,
    description: resource.summary || resource.description,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Minecraft',
    downloadUrl: resource.downloadUrl || resource.sourceUrl,
    author: resource.authorName ? { '@type': 'Person', name: resource.authorName } : undefined,
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bg-aurora" />
      <PageShell active="resources" initialUser={initialUser}>
        <article className="page-main resource-details">
          <Breadcrumbs items={[{ label: 'Спільнота', href: '/forum' }, { label: 'Ресурси', href: '/resources' }, { label: resource.name }]} />
          <section className="resource-detail-hero">
            <img className="resource-detail-icon" src={resource.iconUrl || IMAGE_PLACEHOLDER} alt="" />
            <div className="resource-detail-heading">
              <span className="resource-type-pill">{TYPE_LABELS[resource.type] || resource.type}</span>
              <h1>{resource.name}</h1>
              <p>{resource.summary || resource.description.slice(0, 240)}</p>
              <div className="resource-detail-actions">
                <a className="btn btn-primary" href={resource.downloadUrl || resource.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Відкрити джерело
                </a>
                <Link className="btn btn-secondary" href="/resources">До каталогу</Link>
                {canManage && <DeleteResourceButton resourceId={resource.id} />}
              </div>
            </div>
            <aside className="resource-detail-stats">
              <span><b>{resource.downloads.toLocaleString('uk-UA')}</b> завантажень</span>
              <span><b>{resource.followers.toLocaleString('uk-UA')}</b> підписок</span>
              <span><b>{resource.sourceHost || 'джерело'}</b> платформа</span>
            </aside>
          </section>

          <div className="resource-detail-grid">
            <section className="resource-detail-panel">
              <h2>Опис</h2>
              <div className="resource-description">
                {(resource.description || resource.summary).split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
            <aside className="resource-detail-panel resource-side-panel">
              <h2>Сумісність</h2>
              <ResourceList title="Loader-и" items={resource.loaders} empty="Не вказано" />
              <ResourceList title="Версії Minecraft" items={resource.gameVersions} empty="Не вказано" />
              <ResourceList title="Теги" items={resource.tags} empty="Без тегів" />
              {resource.license && <p className="resource-fact"><span>Ліцензія</span><b>{resource.license}</b></p>}
              {resource.side && <p className="resource-fact"><span>Сторона</span><b>{resource.side}</b></p>}
            </aside>
          </div>

          {resource.gallery.length > 0 && (
            <section className="resource-gallery">
              {resource.gallery.map((media) => (
                isVideoMedia(media)
                  ? <video key={media} src={media} controls preload="metadata" />
                  : <img key={media} src={media} alt="" loading="lazy" />
              ))}
            </section>
          )}
        </article>
      </PageShell>
    </>
  )
}

function ResourceList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="resource-list-block">
      <span>{title}</span>
      <div className="resource-chip-row">
        {items.length > 0 ? items.slice(0, 18).map((item) => <span key={item} className="resource-chip">{item}</span>) : <span className="resource-muted">{empty}</span>}
      </div>
    </div>
  )
}

