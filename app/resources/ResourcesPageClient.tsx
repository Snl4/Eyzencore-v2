'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Icons } from '@/components/ui/Icons'
import { Toggle } from '@/components/ui/Toggle'
import type { AuthUser } from '@/lib/auth-db'
import type { CommunityResource } from '@/lib/resources-db'
import { buildResourcePath } from '@/lib/resource-slug'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'

const RESOURCE_TYPES = [
  { key: 'all', label: 'Усі' },
  { key: 'mod', label: 'Моди' },
  { key: 'plugin', label: 'Плагіни' },
  { key: 'resourcepack', label: 'Ресурспаки' },
  { key: 'shader', label: 'Шейдери' },
  { key: 'datapack', label: 'Датапаки' },
  { key: 'modpack', label: 'Збірки' },
  { key: 'tool', label: 'Інструменти' },
] as const

const TYPE_LABELS: Record<string, string> = Object.fromEntries(RESOURCE_TYPES.map((type) => [type.key, type.label]))

function formatNumber(value: number) {
  return new Intl.NumberFormat('uk-UA', { notation: value > 9999 ? 'compact' : 'standard' }).format(value)
}

function ResourceCard({ resource }: { resource: CommunityResource }) {
  const versions = resource.gameVersions.slice(0, 4)
  const loaders = resource.loaders.slice(0, 3)
  return (
    <Link href={buildResourcePath(resource)} className="resource-card">
      <div className="resource-card-media">
        <img src={resource.iconUrl || IMAGE_PLACEHOLDER} alt="" loading="lazy" />
        <span className="resource-type-pill">{TYPE_LABELS[resource.type] || resource.type}</span>
      </div>
      <div className="resource-card-body">
        <div className="resource-card-title-row">
          <h3>{resource.name}</h3>
          {resource.verified && <span className="resource-verified">✓</span>}
        </div>
        <p>{resource.summary || resource.description.slice(0, 150)}</p>
        <div className="resource-chip-row">
          {[...loaders, ...versions].slice(0, 6).map((item) => (
            <span key={item} className="resource-chip">{item}</span>
          ))}
        </div>
        <div className="resource-card-meta">
          <span>{resource.sourceHost || 'джерело'}</span>
          <span>{formatNumber(resource.downloads)} завантажень</span>
          <span>{formatNumber(resource.followers)} підписок</span>
        </div>
      </div>
    </Link>
  )
}

export function ResourcesPageClient({
  initialUser,
  initialResources,
  canManage,
}: {
  initialUser: AuthUser | null
  initialResources: CommunityResource[]
  canManage: boolean
}) {
  const [searchValue, setSearchValue] = useState('')
  const [activeType, setActiveType] = useState('all')

  const filteredResources = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    return initialResources.filter((resource) => {
      const typeOk = activeType === 'all' || resource.type === activeType
      const haystack = [
        resource.name,
        resource.summary,
        resource.description,
        resource.sourceHost,
        ...resource.tags,
        ...resource.loaders,
        ...resource.gameVersions,
      ].join(' ').toLowerCase()
      return typeOk && (!q || haystack.includes(q))
    })
  }, [activeType, initialResources, searchValue])

  return (
    <PageShell active="resources" initialUser={initialUser}>
      <div className="page-main resources-page">
        <div className="page-topbar resources-topbar">
          <div>
            <Breadcrumbs items={[{ label: 'Спільнота', href: '/forum' }, { label: 'Ресурси' }]} />
            <h1 className="page-title">Ресурси Minecraft</h1>
          </div>
          <div className="page-search">
            {Icons.search}
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Пошук модів, плагінів, версій..."
              aria-label="Пошук ресурсів"
            />
          </div>
          {canManage && (
            <Link href="/resources/new" className="btn btn-primary">
              {Icons.plus} Додати ресурс
            </Link>
          )}
        </div>

        <section className="resources-hero">
          <div>
            <span className="resources-kicker">Eyzencore Library</span>
            <h2>Моди, плагіни й набори для українських Minecraft-проєктів</h2>
            <p>
              Короткі українські описи, швидкі фільтри, версії гри, loader-и та перевірені посилання на оригінальні сторінки.
            </p>
          </div>
          <div className="resources-hero-stats">
            <span><b>{initialResources.length}</b> ресурсів</span>
            <span><b>{RESOURCE_TYPES.length - 1}</b> категорій</span>
          </div>
        </section>

        <div className="resource-tabs">
          {RESOURCE_TYPES.map((type) => (
            <Toggle
              key={type.key}
              type="button"
              variant="outline"
              size="sm"
              className="resource-tab"
              pressed={activeType === type.key}
              onPressedChange={() => setActiveType(type.key)}
            >
              {type.label}
            </Toggle>
          ))}
        </div>

        {filteredResources.length === 0 ? (
          <div className="set-card resources-empty">
            Поки немає ресурсів під цей фільтр.
          </div>
        ) : (
          <div className="resources-grid">
            {filteredResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
