'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faCheckCircle,
  faComment,
  faEye,
  faHeart,
  faLock,
  faMagnifyingGlass,
  faPlus,
  faThumbtack,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { PageShell } from '@/components/layout/PageShell'
import { Select } from '@/components/ui/Select'
import { SidebarIcon } from '@/components/layout/SidebarIcon'
import {
  ForumMediaUploader,
  type ForumAttachment,
} from '@/components/forum/ForumMedia'
import type { AuthUser } from '@/lib/auth-db'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'
import type { getForumHome } from '@/lib/forum-db'

type ForumHome = Awaited<ReturnType<typeof getForumHome>>

function formatDate(value: string | null) {
  if (!value) return 'Ще немає тем'
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ForumPageClient({
  initialUser,
  initialData,
}: {
  initialUser: AuthUser | null
  initialData: ForumHome
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'popular'>('recent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({
    categoryId: initialData.categories[0]?.id || 0,
    title: '',
    content: '',
    attachments: [] as ForumAttachment[],
  })

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (query.trim()) params.set('query', query.trim())
      params.set('sort', sort)
      const response = await fetch(`/api/forum?${params}`, {
        signal: controller.signal,
        cache: 'no-store',
      }).catch(() => null)
      if (!response || controller.signal.aborted) return
      const result = await response.json().catch(() => ({}))
      if (response.ok) {
        setData(result)
        setError('')
      } else {
        setError(result.error || 'Не вдалося оновити форум')
      }
      setLoading(false)
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [category, query, sort])

  function openCreate() {
    if (!initialUser) {
      router.push('/login?next=/forum')
      return
    }
    setShowCreate(true)
  }

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError('')
    const response = await fetch('/api/forum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося створити тему')
      setCreating(false)
      return
    }
    router.push(`/forum/${result.thread.id}`)
  }

  return (
    <PageShell active="forum" initialUser={initialUser}>
      <div className="page-main forum-page">
        <section className="forum-page-hero">
          <div>
            <p className="forum-kicker">Спільнота Eyzencore</p>
            <h1>Форум спільноти</h1>
            <p>
              Ставте питання, публікуйте гайди, презентуйте сервери та
              знаходьте рішення разом.
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreate} type="button">
            <FontAwesomeIcon icon={faPlus} />
            Нова тема
          </button>
        </section>

        <div className="forum-toolbar">
          <label className="forum-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              placeholder="Пошук за темою, текстом або автором"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button onClick={() => setQuery('')} type="button" aria-label="Очистити">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            ) : null}
          </label>
          <div className="forum-sort">
            <button
              className={sort === 'recent' ? 'active' : ''}
              onClick={() => setSort('recent')}
              type="button"
            >
              Остання активність
            </button>
            <button
              className={sort === 'popular' ? 'active' : ''}
              onClick={() => setSort('popular')}
              type="button"
            >
              Популярні
            </button>
          </div>
        </div>

        <section className="forum-category-grid">
          <button
            className={`forum-category-card ${category === '' ? 'active' : ''}`}
            onClick={() => setCategory('')}
            type="button"
          >
            <span className="forum-category-icon">
              <SidebarIcon name="forum" />
            </span>
            <span>
              <strong>Усі теми</strong>
              <small>Повна стрічка спільноти</small>
            </span>
            <b>{data.categories.reduce((sum, item) => sum + item.threads, 0)}</b>
          </button>
          {data.categories.map((item) => (
            <button
              className={`forum-category-card ${
                category === item.slug ? 'active' : ''
              }`}
              key={item.id}
              onClick={() => setCategory(item.slug)}
              style={{ '--forum-category': item.color } as React.CSSProperties}
              type="button"
            >
              <span className="forum-category-icon">
                <SidebarIcon name={item.icon} />
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
                <em>{formatDate(item.lastActivityAt)}</em>
              </span>
              <b>{item.threads}</b>
            </button>
          ))}
        </section>

        {error ? <div className="forum-alert">{error}</div> : null}

        <section className={`forum-thread-list ${loading ? 'loading' : ''}`}>
          <header>
            <div>
              <strong>
                {category
                  ? data.categories.find((item) => item.slug === category)?.name
                  : 'Усі обговорення'}
              </strong>
              <span>{data.threads.length} тем</span>
            </div>
            {loading ? <small>Оновлення...</small> : null}
          </header>
          {data.threads.length === 0 ? (
            <div className="forum-empty">
              <FontAwesomeIcon icon={faComment} />
              <strong>Тем не знайдено</strong>
              <p>Змініть фільтр або створіть перше обговорення.</p>
              <button className="btn btn-primary" onClick={openCreate} type="button">
                Створити тему
              </button>
            </div>
          ) : (
            data.threads.map((thread) => (
              <Link
                className="forum-thread-row"
                href={`/forum/${thread.id}`}
                key={thread.id}
              >
                <div className="forum-thread-avatar">
                  <span
                    style={{
                      backgroundImage: `url(${JSON.stringify(
                        thread.author.avatarUrl || IMAGE_PLACEHOLDER
                      ).slice(1, -1)})`,
                    }}
                  />
                </div>
                <div className="forum-thread-main">
                  <div className="forum-thread-title">
                    {thread.isPinned ? (
                      <span title="Закріплено">
                        <FontAwesomeIcon icon={faThumbtack} />
                      </span>
                    ) : null}
                    {thread.isSolved ? (
                      <span className="solved" title="Вирішено">
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </span>
                    ) : null}
                    {thread.isLocked ? (
                      <span title="Заблоковано">
                        <FontAwesomeIcon icon={faLock} />
                      </span>
                    ) : null}
                    <strong>{thread.title}</strong>
                  </div>
                  <p>{thread.excerpt}</p>
                  <div className="forum-thread-meta">
                    <span style={{ color: thread.category.color }}>
                      {thread.category.name}
                    </span>
                    <span>{thread.author.name}</span>
                    <span>{formatDate(thread.lastActivityAt)}</span>
                  </div>
                </div>
                <div className="forum-thread-stats">
                  <span title="Відповіді">
                    <FontAwesomeIcon icon={faComment} />
                    {thread.replies}
                  </span>
                  <span title="Перегляди">
                    <FontAwesomeIcon icon={faEye} />
                    {thread.views}
                  </span>
                  <span title="Вподобання">
                    <FontAwesomeIcon icon={faHeart} />
                    {thread.likes}
                  </span>
                  <FontAwesomeIcon className="forum-thread-arrow" icon={faArrowRight} />
                </div>
              </Link>
            ))
          )}
        </section>
      </div>

      {showCreate ? (
        <div className="forum-modal-backdrop" onMouseDown={() => setShowCreate(false)}>
          <form
            className="forum-compose-modal"
            onSubmit={createThread}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="forum-kicker">Нове обговорення</p>
                <h2>Створити тему</h2>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                type="button"
                aria-label="Закрити"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>
            <label>
              <span>Категорія</span>
              <Select
                value={String(draft.categoryId)}
                onChange={(value) => setDraft({ ...draft, categoryId: Number(value) })}
                options={data.categories.map((item) => ({ value: String(item.id), label: item.name }))}
                ariaLabel="Категорія форуму"
              />
            </label>
            <label>
              <span>Заголовок</span>
              <input
                maxLength={160}
                minLength={6}
                placeholder="Коротко опишіть тему"
                required
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
              <small>{draft.title.length}/160</small>
            </label>
            <label>
              <span>Текст теми</span>
              <textarea
                maxLength={12000}
                minLength={15}
                placeholder="Додайте деталі, контекст і запитання..."
                required
                rows={10}
                value={draft.content}
                onChange={(event) =>
                  setDraft({ ...draft, content: event.target.value })
                }
              />
              <small>{draft.content.length}/12000</small>
            </label>
            <ForumMediaUploader
              attachments={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
              onError={setError}
            />
            {error ? <div className="forum-alert">{error}</div> : null}
            <footer>
              <button
                className="btn btn-ghost"
                onClick={() => setShowCreate(false)}
                type="button"
              >
                Скасувати
              </button>
              <button className="btn btn-primary" disabled={creating} type="submit">
                {creating ? 'Публікуємо...' : 'Опублікувати тему'}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </PageShell>
  )
}
