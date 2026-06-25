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
import type { ServerFilterOptions } from '@/hooks/useServerFilter'

type LockedPlatform = 'Minecraft' | 'Discord'
type SortOption = 'online' | 'rating' | 'newest' | 'oldest'

type SeoLandingContent = {
  kicker?: string
  title: string
  paragraphs: string[]
  faqTitle: string
  faqAnswer: string
  relatedLinks: Array<{ label: string; href: string }>
}

type ServersPageClientProps = {
  initialServers: Server[]
  initialUser: AuthUser | null
  lockedPlatform?: LockedPlatform
  activeKey?: string
  title?: string
  crumb?: string
  breadcrumbs?: BreadcrumbItem[]
  addHref?: string
  seoVariant?: LockedPlatform
  filterOptions?: ServerFilterOptions
  seoLanding?: SeoLandingContent
}

const SORT_LABELS: Record<SortOption, string> = {
  online: 'онлайн',
  rating: 'рейтинг',
  newest: 'новіші',
  oldest: 'старіші',
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
  seoVariant,
  filterOptions,
  seoLanding,
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
    sort,
    setSort,
    modes,
    versions,
    platforms,
    lockMode,
    lockVer,
  } = useServerFilter(initialServers, lockedPlatform, filterOptions)

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
          lockMode={lockMode}
          lockVer={lockVer}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16, fontSize: 13, color: 'var(--fg-2)' }}>
          <span>
            Знайдено <b style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{filtered.length}</b> серверів
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-3)' }}>
              сортування:
            </span>
            <div className="forum-sort" aria-label="Сортування серверів">
              {(['online', 'rating', 'newest', 'oldest'] as SortOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={sort === option ? 'active' : ''}
                  onClick={() => setSort(option)}
                >
                  {SORT_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="set-card">Завантаження серверів...</div>
        ) : filtered.length === 0 ? (
          <div className="set-card">
            {lockedPlatform === 'Discord'
              ? 'Discord-серверів ще немає. Додай першу спільноту.'
              : lockedPlatform === 'Minecraft'
                ? 'Minecraft-серверів ще немає. Додай перший.'
                : 'Серверів ще немає. Додай перший.'}
          </div>
        ) : (
          <div className="servers-grid">
            {filtered.map((server) => <ServerCard key={server.seed} s={server} />)}
          </div>
        )}

        {seoLanding ? (
          <ServersSeoLandingBlock content={seoLanding} />
        ) : seoVariant ? (
          <ServersSeoBlock variant={seoVariant} count={initialServers.length} />
        ) : null}
      </div>
    </PageShell>
  )
}

function ServersSeoLandingBlock({ content }: { content: SeoLandingContent }) {
  return (
    <section className="seo-panel" aria-labelledby="seo-landing-title">
      <div>
        {content.kicker ? <p className="seo-kicker">{content.kicker}</p> : null}
        <h2 id="seo-landing-title">{content.title}</h2>
        {content.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {content.relatedLinks.length > 0 && (
        <div className="seo-link-cloud">
          {content.relatedLinks.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </div>
      )}
      <div className="seo-faq">
        <h3>{content.faqTitle}</h3>
        <p>{content.faqAnswer}</p>
      </div>
    </section>
  )
}

function ServersSeoBlock({ variant, count }: { variant: LockedPlatform; count: number }) {
  const isMinecraft = variant === 'Minecraft'
  const links = isMinecraft
    ? [
        ['Українські сервера майнкрафт', '/servers/minecraft/ukraine'],
        ['Survival сервери', '/servers/minecraft/survival'],
        ['Bedrock сервери', '/servers/minecraft/bedrock'],
        ['Без донату', '/servers/minecraft/no-p2w'],
        ['Java сервери', '/servers/minecraft?version=Java'],
        ['PvP сервери', '/servers/minecraft?mode=PvP'],
      ]
    : [
        ['Gaming Discord', '/servers/discord?mode=Gaming'],
        ['Minecraft Discord', '/servers/discord?mode=Minecraft'],
        ['Community сервери', '/servers/discord?mode=Community'],
        ['Support спільноти', '/servers/discord?mode=Support'],
      ]

  return (
    <section className="seo-panel" aria-labelledby="seo-catalog-title">
      <div>
        <p className="seo-kicker">Пошук і моніторинг</p>
        <h2 id="seo-catalog-title">
          {isMinecraft ? 'Українські сервера майнкрафт: моніторинг, рейтинг і онлайн' : 'Каталог Discord серверів і спільнот'}
        </h2>
        <p>
          {isMinecraft
            ? `Eyzencore - каталог українських серверів майнкрафт з онлайном, версією, режимом, рейтингом, голосами та відгуками. У каталозі зараз ${count} проєктів: Java, Bedrock, Survival, SMP, SkyBlock, RPG, PvP і mini-games.`
            : `Eyzencore збирає Discord сервери та українські спільноти для gaming, Minecraft, support, giveaways і voice chat. У каталозі зараз ${count} спільнот із рейтингом, активністю та описом.`}
        </p>
      </div>
      <div className="seo-link-cloud">
        {links.map(([label, href]) => (
          <Link key={href} href={href}>{label}</Link>
        ))}
      </div>
      <div className="seo-faq">
        <h3>{isMinecraft ? 'Як вибрати Minecraft сервер?' : 'Як вибрати Discord сервер?'}</h3>
        <p>
          {isMinecraft
            ? 'Дивіться онлайн, версію Minecraft, тип ядра Java або Bedrock, теги режимів, відгуки гравців і позицію в рейтингу. Для власників доступні API, callback і статистика.'
            : 'Перевіряйте тематику спільноти, активність, опис, теги, рейтинг і відгуки. Для власників серверів доступні сторінка проєкту, новини та інструменти просування.'}
        </p>
      </div>
    </section>
  )
}
