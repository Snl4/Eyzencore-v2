'use client'

import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { ServerCard } from '@/components/servers/ServerCard'
import { FilterBar } from '@/components/servers/FilterBar'
import { useServerFilter } from '@/hooks/useServerFilter'
import { Icons } from '@/components/ui/Icons'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/Breadcrumbs'
import type { Server } from '@/lib/types'
import type { AuthUser } from '@/lib/auth-db'

type LockedPlatform = 'Minecraft' | 'Discord'

type ServersPageClientProps = {
  initialServers: Server[]
  initialUser: AuthUser | null
  lockedPlatform?: LockedPlatform
  activeKey?: string
  title?: string
  crumb?: string
  breadcrumbs?: BreadcrumbItem[]
  addHref?: string
}

export function ServersPageClient({
  initialServers,
  initialUser,
  lockedPlatform,
  activeKey = 'servers',
  title = 'Каталог серверів',
  crumb = 'простір / сервери',
  breadcrumbs,
  addHref = '/add-server',
}: ServersPageClientProps) {
  const {
    filtered,
    loading,
    platform,
    setPlatform,
    mode,
    setMode,
    ver,
    setVer,
    query,
    setQuery,
    modes,
    versions,
    platforms,
  } = useServerFilter(initialServers, lockedPlatform)

  return (
    <PageShell active={activeKey} initialUser={initialUser}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={breadcrumbs || crumb.split('/').map((part, index, parts) => ({
              label: part.trim(),
              href: index === parts.length - 1 ? undefined : '/',
            }))} />
            <h1 className="page-title">{title}</h1>
          </div>
          <div className="page-search">
            {Icons.search}
            <input
              placeholder="Пошук серверів..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘K</kbd>
          </div>
          <Link href={addHref} className="btn btn-primary">
            {Icons.plus} Додати сервер
          </Link>
        </div>

        <FilterBar
          platforms={lockedPlatform ? [] : platforms}
          platform={lockedPlatform || platform}
          onPlatform={lockedPlatform ? undefined : (value) => {
            setPlatform(value)
            setMode('Всі')
            setVer('Всі')
          }}
          modes={modes}
          versions={versions}
          mode={mode}
          ver={ver}
          onMode={setMode}
          onVer={setVer}
          hideVersions={lockedPlatform === 'Discord' || platform === 'Discord'}
        />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, fontSize: 13, color: 'var(--fg-2)' }}>
          <span>
            Знайдено <b style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{filtered.length}</b> серверів
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>
            сортування: рейтинг · голоси · лайки · відгуки
          </span>
        </div>

        {loading ? (
          <div className="set-card">Завантаження серверів...</div>
        ) : filtered.length === 0 ? (
          <div className="set-card">
            {lockedPlatform === 'Discord'
              ? 'Discord-серверів ще немає. Додай перший спільноту.'
              : lockedPlatform === 'Minecraft'
                ? 'Minecraft-серверів ще немає. Додай перший.'
                : 'Серверів ще немає. Додай перший.'}
          </div>
        ) : (
          <div className="servers-grid">
            {filtered.map((server) => <ServerCard key={server.seed} s={server} />)}
          </div>
        )}
      </div>
    </PageShell>
  )
}
