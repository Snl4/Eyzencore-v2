'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Icons } from '@/components/ui/Icons'
import { Select } from '@/components/ui/Select'
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

const SORT_OPTIONS = [
  { key: 'downloads', label: 'Завантаження' },
  { key: 'views', label: 'Перегляди' },
  { key: 'updated', label: 'Оновлено' },
] as const

function formatNumber(value: number) {
  return new Intl.NumberFormat('uk-UA', { notation: value > 9999 ? 'compact' : 'standard' }).format(value)
}

function formatUpdatedAt(value: string | null) {
  if (!value) return 'щойно'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'щойно'
  const diffMs = timestamp - Date.now()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day
  const formatter = new Intl.RelativeTimeFormat('uk-UA', { numeric: 'auto' })
  const abs = Math.abs(diffMs)
  if (abs >= year) return formatter.format(Math.round(diffMs / year), 'year')
  if (abs >= month) return formatter.format(Math.round(diffMs / month), 'month')
  if (abs >= day) return formatter.format(Math.round(diffMs / day), 'day')
  if (abs >= hour) return formatter.format(Math.round(diffMs / hour), 'hour')
  return formatter.format(Math.round(diffMs / minute), 'minute')
}

function compareVersions(a: string, b: string) {
  const left = a.match(/\d+|[a-z]+/gi) || [a]
  const right = b.match(/\d+|[a-z]+/gi) || [b]
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const l = left[index] || ''
    const r = right[index] || ''
    const ln = Number(l)
    const rn = Number(r)
    if (Number.isFinite(ln) && Number.isFinite(rn) && ln !== rn) return rn - ln
    if (l !== r) return r.localeCompare(l, 'uk')
  }
  return b.localeCompare(a, 'uk')
}

function ResourceStatIcon({ type }: { type: 'downloads' | 'views' | 'updated' }) {
  if (type === 'views') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <path d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
      </svg>
    )
  }
  if (type === 'updated') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

function ResourceCard({ resource }: { resource: CommunityResource }) {
  const versions = resource.gameVersions.slice(0, 5)
  const loaders = resource.loaders.slice(0, 3)
  const description = resource.summary || resource.description
  const chips = [resource.side, resource.license, ...loaders, ...versions]
    .filter((item): item is string => Boolean(item))
    .slice(0, 7)

  return (
    <Link href={buildResourcePath(resource)} className="resource-card">
      <div className="resource-card-media">
        <img src={resource.iconUrl || IMAGE_PLACEHOLDER} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="resource-card-body">
        <div className="resource-card-title-row">
          <div className="resource-title-block">
            <div className="resource-title-line">
            <h3>{resource.name}</h3>
              {resource.verified && <span className="resource-verified">✓</span>}
              <span className="resource-author">by {resource.authorName || resource.sourceHost || 'Eyzencore'}</span>
            </div>
          </div>
        </div>
        <p>{description}</p>
        <div className="resource-chip-row">
          <span className="resource-type-pill">{TYPE_LABELS[resource.type] || resource.type}</span>
          {chips.map((item) => (
            <span key={item} className="resource-chip">{item}</span>
          ))}
        </div>
      </div>
      <div className="resource-card-meta">
        <span className="resource-stat"><ResourceStatIcon type="downloads" /> <b>{formatNumber(resource.downloads)}</b></span>
        <span className="resource-stat"><ResourceStatIcon type="views" /> <b>{formatNumber(resource.views)}</b></span>
        <span className="resource-stat resource-stat-muted"><ResourceStatIcon type="updated" /> {formatUpdatedAt(resource.updatedRemoteAt || resource.updatedAt)}</span>
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
  const [versionSearch, setVersionSearch] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeVersion, setActiveVersion] = useState('all')
  const [sortMode, setSortMode] = useState<(typeof SORT_OPTIONS)[number]['key']>('downloads')

  const versionOptions = useMemo(() => {
    return Array.from(new Set(initialResources.flatMap((resource) => resource.gameVersions)))
      .filter(Boolean)
      .sort(compareVersions)
  }, [initialResources])

  const visibleVersionOptions = useMemo(() => {
    const q = versionSearch.trim().toLowerCase()
    return versionOptions.filter((version) => !q || version.toLowerCase().includes(q)).slice(0, 30)
  }, [versionOptions, versionSearch])

  const typeCounts = useMemo(() => {
    return initialResources.reduce<Record<string, number>>((counts, resource) => {
      counts.all = (counts.all || 0) + 1
      counts[resource.type] = (counts[resource.type] || 0) + 1
      return counts
    }, { all: 0 })
  }, [initialResources])

  const filteredResources = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    const rows = initialResources.filter((resource) => {
      const typeOk = activeType === 'all' || resource.type === activeType
      const versionOk = activeVersion === 'all' || resource.gameVersions.includes(activeVersion)
      const haystack = [
        resource.name,
        resource.summary,
        resource.description,
        resource.sourceHost,
        ...resource.tags,
        ...resource.loaders,
        ...resource.gameVersions,
      ].join(' ').toLowerCase()
      return typeOk && versionOk && (!q || haystack.includes(q))
    })
    return rows.sort((a, b) => {
      if (sortMode === 'updated') {
        return new Date(b.updatedRemoteAt || b.updatedAt).getTime() - new Date(a.updatedRemoteAt || a.updatedAt).getTime()
      }
      if (sortMode === 'views') {
        return b.views - a.views
      }
      return b.downloads - a.downloads
    })
  }, [activeType, activeVersion, initialResources, searchValue, sortMode])

  const hasFilters = Boolean(searchValue.trim() || activeType !== 'all' || activeVersion !== 'all')

  return (
    <PageShell active="resources" initialUser={initialUser}>
      <div className="page-main resources-page">
        <div className="page-topbar resources-topbar">
          <div>
            <Breadcrumbs items={[{ label: 'Спільнота', href: '/forum' }, { label: 'Ресурси' }]} />
            <h1 className="page-title">Ресурси Minecraft</h1>
          </div>
          {canManage && (
            <Link href="/resources/new" className="btn btn-primary">
              {Icons.plus} Додати ресурс
            </Link>
          )}
        </div>

        <div className="resources-browser">
          <aside className="resources-sidebar" aria-label="Фільтри ресурсів">
            <section>
              <div className="resources-filter-heading">
                <span>Тип ресурсу</span>
                <b>{initialResources.length}</b>
              </div>
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
                    <span>{typeCounts[type.key] || 0}</span>
                  </Toggle>
                ))}
              </div>
            </section>

            <section>
              <div className="resources-filter-heading">
                <span>Версія гри</span>
                <b>{versionOptions.length}</b>
              </div>
              <div className="resources-filter-search">
                {Icons.search}
                <input
                  value={versionSearch}
                  onChange={(event) => setVersionSearch(event.target.value)}
                  placeholder="Пошук версії..."
                  aria-label="Пошук версії Minecraft"
                />
              </div>
              <div className="resources-version-list">
                <button
                  type="button"
                  className={activeVersion === 'all' ? 'active' : ''}
                  onClick={() => setActiveVersion('all')}
                >
                  Усі версії
                </button>
                {visibleVersionOptions.map((version) => (
                  <button
                    key={version}
                    type="button"
                    className={activeVersion === version ? 'active' : ''}
                    onClick={() => setActiveVersion(version)}
                  >
                    {version}
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="resources-results">
            <div className="resources-controls">
              <div className="resources-control-row">
                <div className="page-search resources-search">
                  {Icons.search}
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Пошук ресурсів..."
                    aria-label="Пошук ресурсів"
                  />
                </div>
                <div className="resources-sort-control">
                  <span>Сортування</span>
                  <Select
                    value={sortMode}
                    onChange={(value) => setSortMode(value as (typeof SORT_OPTIONS)[number]['key'])}
                    options={SORT_OPTIONS.map((option) => ({ value: option.key, label: option.label }))}
                    ariaLabel="Сортування ресурсів"
                    className="resources-sort-select"
                    size="sm"
                  />
                </div>
                {hasFilters && (
                  <button
                    type="button"
                    className="btn btn-secondary resources-clear-btn"
                    onClick={() => {
                      setSearchValue('')
                      setVersionSearch('')
                      setActiveType('all')
                      setActiveVersion('all')
                    }}
                  >
                    Скинути
                  </button>
                )}
              </div>
            </div>

            <div className="resources-summary">
              <span>{filteredResources.length} з {initialResources.length} ресурсів</span>
              {activeVersion !== 'all' && <b>Minecraft {activeVersion}</b>}
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
          </section>
        </div>
      </div>
    </PageShell>
  )
}
