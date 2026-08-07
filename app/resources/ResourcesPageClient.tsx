'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  POPULAR_CATEGORIES,
  POPULAR_GAME_VERSIONS,
  POPULAR_LOADERS,
} from '@/lib/modrinth'

const RESOURCE_TYPES = [
  { key: 'all', label: 'Усі' },
  { key: 'mod', label: 'Моди' },
  { key: 'plugin', label: 'Плагіни' },
  { key: 'resourcepack', label: 'Ресурспаки' },
  { key: 'shader', label: 'Шейдери' },
  { key: 'datapack', label: 'Датапаки' },
  { key: 'modpack', label: 'Збірки' },
] as const

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RESOURCE_TYPES.map((type) => [type.key, type.label]),
)

const SORT_OPTIONS = [
  { key: 'downloads', label: 'Завантаження' },
  { key: 'follows', label: 'Підписники' },
  { key: 'updated', label: 'Оновлено' },
  { key: 'newest', label: 'Нові' },
  { key: 'relevance', label: 'Релевантність' },
] as const

function formatNumber(value: number) {
  return new Intl.NumberFormat('uk-UA', {
    notation: value > 9999 ? 'compact' : 'standard',
  }).format(value)
}

function formatUpdatedAt(value: string | null) {
  if (!value) return 'нещодавно'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'нещодавно'
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

function ResourceStatIcon({ type }: { type: 'downloads' | 'views' | 'updated' | 'follows' }) {
  if (type === 'views') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  if (type === 'follows') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    )
  }
  if (type === 'updated') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

function ResourceCard({ resource }: { resource: CommunityResource }) {
  const versions = resource.gameVersions.slice(0, 4)
  const loaders = resource.loaders.slice(0, 3)
  const description = resource.summary || resource.description
  const chips = [...loaders, ...versions].filter(Boolean).slice(0, 6)

  return (
    <Link href={buildResourcePath(resource)} className="resource-card" prefetch={false}>
      <div className="resource-card-media">
        <img
          src={resource.iconUrl || IMAGE_PLACEHOLDER}
          alt={resource.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src = IMAGE_PLACEHOLDER
          }}
        />
      </div>
      <div className="resource-card-body">
        <div className="resource-card-title-row">
          <div className="resource-title-block">
            <div className="resource-title-line">
              <h3>{resource.name}</h3>
              {resource.verified && (
                <span className="resource-verified" title="Перевірений ресурс Modrinth">✓</span>
              )}
              <span className="resource-author">by {resource.authorName || resource.sourceHost || 'Modrinth'}</span>
            </div>
          </div>
        </div>
        <p>{description}</p>
        <div className="resource-chip-row">
          <span className="resource-type-pill">{TYPE_LABELS[resource.type] || resource.type}</span>
          {resource.side && (
            <span className="resource-chip resource-chip-side">{resource.side}</span>
          )}
          {chips.map((item) => (
            <span key={item} className="resource-chip">{item}</span>
          ))}
        </div>
      </div>
      <div className="resource-card-meta">
        <span className="resource-stat" title="Завантажень">
          <ResourceStatIcon type="downloads" /> <b>{formatNumber(resource.downloads)}</b>
        </span>
        {resource.followers > 0 && (
          <span className="resource-stat" title="Підписників">
            <ResourceStatIcon type="follows" /> <b>{formatNumber(resource.followers)}</b>
          </span>
        )}
        <span className="resource-stat resource-stat-muted" title="Дата оновлення">
          <ResourceStatIcon type="updated" /> {formatUpdatedAt(resource.updatedRemoteAt || resource.updatedAt)}
        </span>
      </div>
    </Link>
  )
}

function ResourceCardSkeleton() {
  return (
    <div className="resource-card resource-card-skeleton animate-pulse">
      <div className="resource-card-media skeleton-box" style={{ width: 64, height: 64, borderRadius: 12 }} />
      <div className="resource-card-body" style={{ width: '100%' }}>
        <div className="skeleton-box" style={{ height: 20, width: '40%', marginBottom: 8 }} />
        <div className="skeleton-box" style={{ height: 14, width: '90%', marginBottom: 6 }} />
        <div className="skeleton-box" style={{ height: 14, width: '70%', marginBottom: 12 }} />
        <div className="resource-chip-row">
          <div className="skeleton-box" style={{ height: 20, width: 60, borderRadius: 6 }} />
          <div className="skeleton-box" style={{ height: 20, width: 50, borderRadius: 6 }} />
          <div className="skeleton-box" style={{ height: 20, width: 70, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  )
}

export function ResourcesPageClient({
  initialUser,
  initialResources,
  initialTotalHits,
  initialPage,
  initialTotalPages,
  initialFilters,
  canManage,
}: {
  initialUser: AuthUser | null
  initialResources: CommunityResource[]
  initialTotalHits: number
  initialPage: number
  initialTotalPages: number
  initialFilters: {
    search: string
    type: string
    loader: string
    version: string
    category: string
    sort: (typeof SORT_OPTIONS)[number]['key']
  }
  canManage: boolean
}) {
  const [searchValue, setSearchValue] = useState(initialFilters.search)
  const [versionSearch, setVersionSearch] = useState('')
  const [activeType, setActiveType] = useState(initialFilters.type || 'all')
  const [activeLoader, setActiveLoader] = useState(initialFilters.loader || 'all')
  const [activeVersion, setActiveVersion] = useState(initialFilters.version || 'all')
  const [activeCategory, setActiveCategory] = useState(initialFilters.category || 'all')
  const [sortMode, setSortMode] = useState<(typeof SORT_OPTIONS)[number]['key']>(
    initialFilters.sort || 'downloads',
  )
  const [page, setPage] = useState(initialPage || 1)

  const [resources, setResources] = useState<CommunityResource[]>(initialResources)
  const [totalHits, setTotalHits] = useState(initialTotalHits)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [isLoading, setIsLoading] = useState(false)

  const isInitialMount = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const visibleVersionOptions = useMemo(() => {
    const q = versionSearch.trim().toLowerCase()
    return POPULAR_GAME_VERSIONS.filter((version) => !q || version.toLowerCase().includes(q))
  }, [versionSearch])

  const fetchResources = useCallback(
    async (params: {
      search: string
      type: string
      loader: string
      version: string
      category: string
      sort: string
      page: number
    }) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      setIsLoading(true)

      const searchParams = new URLSearchParams()
      if (params.search.trim()) searchParams.set('q', params.search.trim())
      if (params.type !== 'all') searchParams.set('type', params.type)
      if (params.loader !== 'all') searchParams.set('loader', params.loader)
      if (params.version !== 'all') searchParams.set('version', params.version)
      if (params.category !== 'all') searchParams.set('category', params.category)
      if (params.sort) searchParams.set('sort', params.sort)
      if (params.page > 1) searchParams.set('page', String(params.page))

      // Update browser URL silently for shareable links
      const newUrl = `/resources${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      window.history.replaceState(null, '', newUrl)

      try {
        const res = await fetch(`/api/resources?${searchParams.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('API error')
        const data = await res.json()
        setResources(data.resources || [])
        setTotalHits(data.totalHits || 0)
        setTotalPages(data.totalPages || 1)
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('[Resources] Fetch failed:', error)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  // Effect to trigger search when filters change (debounced for search text)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timer = setTimeout(() => {
      fetchResources({
        search: searchValue,
        type: activeType,
        loader: activeLoader,
        version: activeVersion,
        category: activeCategory,
        sort: sortMode,
        page,
      })
    }, 250)

    return () => clearTimeout(timer)
  }, [searchValue, activeType, activeLoader, activeVersion, activeCategory, sortMode, page, fetchResources])

  const handleTypeChange = (typeKey: string) => {
    setActiveType(typeKey)
    setPage(1)
  }

  const handleLoaderChange = (loaderKey: string) => {
    setActiveLoader(loaderKey)
    setPage(1)
  }

  const handleVersionChange = (versionKey: string) => {
    setActiveVersion(versionKey)
    setPage(1)
  }

  const handleCategoryChange = (categoryKey: string) => {
    setActiveCategory(categoryKey)
    setPage(1)
  }

  const handleSortChange = (newSort: (typeof SORT_OPTIONS)[number]['key']) => {
    setSortMode(newSort)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    const resultsElem = document.querySelector('.resources-results')
    if (resultsElem) {
      resultsElem.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleResetFilters = () => {
    setSearchValue('')
    setVersionSearch('')
    setActiveType('all')
    setActiveLoader('all')
    setActiveVersion('all')
    setActiveCategory('all')
    setSortMode('downloads')
    setPage(1)
  }

  const hasFilters = Boolean(
    searchValue.trim() ||
      activeType !== 'all' ||
      activeLoader !== 'all' ||
      activeVersion !== 'all' ||
      activeCategory !== 'all' ||
      page > 1,
  )

  // Generate pagination page numbers
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 7
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, -1, totalPages)
      } else if (page >= totalPages - 3) {
        pages.push(1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, -1, page - 1, page, page + 1, -2, totalPages)
      }
    }
    return pages
  }, [page, totalPages])

  return (
    <PageShell active="resources" initialUser={initialUser}>
      <div className="page-main resources-page">
        <div className="page-topbar resources-topbar">
          <div>
            <Breadcrumbs items={[{ label: 'Спільнота', href: '/forum' }, { label: 'Ресурси' }]} />
            <h1 className="page-title">Ресурси Minecraft</h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0', color: 'var(--color-muted, #94a3b8)', fontSize: '0.95rem' }}>
              Повний каталог із понад 150 000 модів, плагінів, ресурспаків, шейдерів та модпаків з відкритим Modrinth API.
            </p>
          </div>
          {canManage && (
            <Link href="/resources/new" className="btn btn-primary">
              {Icons.plus} Додати ресурс
            </Link>
          )}
        </div>

        <div className="resources-browser">
          <aside className="resources-sidebar" aria-label="Фільтри ресурсів">
            {/* Type selector */}
            <section>
              <div className="resources-filter-heading">
                <span>Тип ресурсу</span>
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
                    onPressedChange={() => handleTypeChange(type.key)}
                  >
                    {type.label}
                  </Toggle>
                ))}
              </div>
            </section>

            {/* Loaders filter */}
            <section>
              <div className="resources-filter-heading">
                <span>Платформа / Лоадер</span>
                {activeLoader !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleLoaderChange('all')}
                    style={{ fontSize: '0.75rem', color: 'var(--color-primary, #38bdf8)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Скинути
                  </button>
                )}
              </div>
              <div className="resources-filter-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  className={`btn-chip ${activeLoader === 'all' ? 'active' : ''}`}
                  onClick={() => handleLoaderChange('all')}
                >
                  Усі
                </button>
                {POPULAR_LOADERS.map((loader) => (
                  <button
                    key={loader.key}
                    type="button"
                    className={`btn-chip ${activeLoader === loader.key ? 'active' : ''}`}
                    onClick={() => handleLoaderChange(loader.key)}
                  >
                    {loader.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Game version filter */}
            <section>
              <div className="resources-filter-heading">
                <span>Версія гри</span>
                {activeVersion !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleVersionChange('all')}
                    style={{ fontSize: '0.75rem', color: 'var(--color-primary, #38bdf8)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Скинути
                  </button>
                )}
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
                  onClick={() => handleVersionChange('all')}
                >
                  Усі версії
                </button>
                {visibleVersionOptions.map((version) => (
                  <button
                    key={version}
                    type="button"
                    className={activeVersion === version ? 'active' : ''}
                    onClick={() => handleVersionChange(version)}
                  >
                    {version}
                  </button>
                ))}
              </div>
            </section>

            {/* Categories filter */}
            <section>
              <div className="resources-filter-heading">
                <span>Категорії</span>
                {activeCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('all')}
                    style={{ fontSize: '0.75rem', color: 'var(--color-primary, #38bdf8)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Скинути
                  </button>
                )}
              </div>
              <div className="resources-category-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  type="button"
                  className={`btn-category ${activeCategory === 'all' ? 'active' : ''}`}
                  onClick={() => handleCategoryChange('all')}
                >
                  Усі категорії
                </button>
                {POPULAR_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`btn-category ${activeCategory === cat.key ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(cat.key)}
                  >
                    {cat.label}
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
                    onChange={(event) => {
                      setSearchValue(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Пошук серед 150 000+ ресурсів (Sodium, Iris, EssentialsX...)..."
                    aria-label="Пошук ресурсів"
                  />
                </div>
                <div className="resources-sort-control">
                  <span>Сортування</span>
                  <Select
                    value={sortMode}
                    onChange={(value) => handleSortChange(value as (typeof SORT_OPTIONS)[number]['key'])}
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
                    onClick={handleResetFilters}
                  >
                    Скинути все
                  </button>
                )}
              </div>
            </div>

            <div className="resources-summary">
              <span>
                Знайдено <b>{formatNumber(totalHits)}</b> ресурсів
                {totalPages > 1 && ` • Сторінка ${page} з ${totalPages}`}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {activeVersion !== 'all' && (
                  <span className="resource-chip" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    MC {activeVersion}
                  </span>
                )}
                {activeLoader !== 'all' && (
                  <span className="resource-chip" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                    {activeLoader}
                  </span>
                )}
                {activeCategory !== 'all' && (
                  <span className="resource-chip" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                    {POPULAR_CATEGORIES.find((c) => c.key === activeCategory)?.label || activeCategory}
                  </span>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="resources-grid">
                {Array.from({ length: 12 }).map((_, index) => (
                  <ResourceCardSkeleton key={index} />
                ))}
              </div>
            ) : resources.length === 0 ? (
              <div className="set-card resources-empty" style={{ padding: 48, textAlign: 'center' }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>Нічого не знайдено</p>
                <p style={{ color: 'var(--color-muted, #94a3b8)', marginBottom: 16 }}>
                  За вашим фільтром або пошуковим запитом ресурсів не знайдено на Modrinth.
                </p>
                <button type="button" className="btn btn-primary" onClick={handleResetFilters}>
                  Скинути фільтри
                </button>
              </div>
            ) : (
              <>
                <div className="resources-grid">
                  {resources.map((resource) => (
                    <ResourceCard key={`${resource.sourceHost}-${resource.slug || resource.id}`} resource={resource} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div
                    className="resources-pagination"
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 32,
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={page <= 1 || isLoading}
                      onClick={() => handlePageChange(page - 1)}
                      style={{ opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ← Попередня
                    </button>

                    {pageNumbers.map((p, idx) => {
                      if (p < 0) {
                        return (
                          <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--color-muted, #64748b)' }}>
                            …
                          </span>
                        )
                      }
                      return (
                        <button
                          key={p}
                          type="button"
                          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ minWidth: 36, fontWeight: p === page ? 700 : 400 }}
                          onClick={() => handlePageChange(p)}
                          disabled={isLoading}
                        >
                          {p}
                        </button>
                      )
                    })}

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={page >= totalPages || isLoading}
                      onClick={() => handlePageChange(page + 1)}
                      style={{ opacity: page >= totalPages ? 0.5 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Наступна →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  )
}
