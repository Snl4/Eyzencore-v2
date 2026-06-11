'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Icons } from '@/components/ui/Icons'
import { Toggle } from '@/components/ui/Toggle'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { AuthUser, NewsPost } from '@/lib/auth-db'

type NewsPageClientProps = {
  initialUser: AuthUser | null
  initialPosts: NewsPost[]
  canCreateNews: boolean
}

function toDateLabel(isoDate: string): string {
  const d = new Date(isoDate)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

function estimateReadTime(content: string): string {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 180))} хв`
}

function NewsCard({ post, featured = false }: { post: NewsPost; featured?: boolean }) {
  const excerpt = post.excerpt || post.content.slice(0, featured ? 200 : 120)

  return (
    <Link href={`/news/${post.id}`} className={`nc-card${featured ? ' nc-card-featured' : ''}`}>
      {/* Media */}
      <div className="nc-media">
        {post.coverUrl ? (
          <div
            className="nc-img"
            style={{ backgroundImage: `url(${JSON.stringify(post.coverUrl).slice(1, -1)})` }}
          />
        ) : (
          <div className="nc-img nc-img-empty">
            <span style={{ opacity: 0.2 }}>{Icons.news}</span>
          </div>
        )}
        <span className="nc-category-badge">{post.category}</span>
      </div>

      {/* Body */}
      <div className="nc-body">
        <h3 className="nc-title">{post.title}</h3>
        <p className="nc-excerpt">{excerpt}</p>
        <div className="nc-footer">
          <span className="nc-author">{post.authorName}</span>
          <span className="nc-date">{toDateLabel(post.createdAt)}</span>
          <span className="nc-read">{estimateReadTime(post.content)} читання</span>
        </div>
      </div>
    </Link>
  )
}

export function NewsPageClient({ initialUser, initialPosts, canCreateNews }: NewsPageClientProps) {
  const [searchValue, setSearchValue] = useState('')
  const [activeCategory, setActiveCategory] = useState('Всі')

  const categories = useMemo(() => {
    const unique = new Set<string>()
    initialPosts.forEach((p) => unique.add(p.category || 'Новини'))
    return ['Всі', ...Array.from(unique)]
  }, [initialPosts])

  const filteredPosts = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    return initialPosts.filter((p) => {
      const catOk = activeCategory === 'Всі' || p.category === activeCategory
      const qOk =
        q.length === 0 ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      return catOk && qOk
    })
  }, [activeCategory, initialPosts, searchValue])

  return (
    <PageShell active="news" initialUser={initialUser}>
      <div className="page-main">

        {/* ── Topbar ── */}
        <div className="page-topbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <Breadcrumbs items={[{ label: 'Простір', href: '/' }, { label: 'Новини' }]} />
            <h1 className="page-title">Новини</h1>
          </div>
          <div className="page-search">
            {Icons.search}
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Пошук..."
              aria-label="Пошук новин"
            />
          </div>
          {canCreateNews && (
            <Link href="/news/new" className="btn btn-primary">
              {Icons.plus} Нова публікація
            </Link>
          )}
        </div>

        {/* ── Category tabs ── */}
        <div className="nc-tabs">
          {categories.map((cat) => (
            <Toggle
              key={cat}
              type="button"
              variant="outline"
              size="sm"
              className="nc-tab"
              pressed={activeCategory === cat}
              onPressedChange={() => setActiveCategory(cat)}
            >
              {cat}
            </Toggle>
          ))}
        </div>

        {/* ── Empty ── */}
        {filteredPosts.length === 0 && (
          <div className="set-card" style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '48px 20px' }}>
            Новини не знайдено
          </div>
        )}

        {/* ── Grid ── */}
        {filteredPosts.length > 0 && (
          <div className="nc-grid">
            {filteredPosts.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        )}

      </div>
    </PageShell>
  )
}
