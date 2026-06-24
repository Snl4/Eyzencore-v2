'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { AuthUser, NewsContentBlock, NewsPost } from '@/lib/auth-db'
import { buildNewsPath } from '@/lib/news-slug'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'
import { toYoutubeEmbedUrl } from '@/lib/youtube'

type NewsDetailsClientProps = {
  initialUser: AuthUser | null
  post: NewsPost
  canManage: boolean
}

type NewsEngagementComment = {
  id: number
  text: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    slug: string | null
    avatarUrl: string | null
  }
}

type NewsEngagement = {
  likes: number
  views: number
  commentsCount: number
  likedByMe: boolean
  userComment: NewsEngagementComment | null
  comments: NewsEngagementComment[]
}

const emptyEngagement: NewsEngagement = {
  likes: 0,
  views: 0,
  commentsCount: 0,
  likedByMe: false,
  userComment: null,
  comments: [],
}

function isVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
}

function parseInline(raw: string): ReactNode {
  const nodes: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) nodes.push(raw.slice(last, match.index))
    if (match[1] != null) nodes.push(<strong key={key++}>{match[1]}</strong>)
    else if (match[2] != null) nodes.push(<em key={key++}>{match[2]}</em>)
    else if (match[3] != null) nodes.push(<s key={key++}>{match[3]}</s>)
    else if (match[4] != null) nodes.push(<code key={key++} className="na-code">{match[4]}</code>)
    else {
      nodes.push(
        <a key={key++} href={match[6]} target="_blank" rel="noreferrer" className="na-link">
          {match[5]}
          <span aria-hidden="true"> ↗</span>
        </a>
      )
    }
    last = re.lastIndex
  }

  if (last < raw.length) nodes.push(raw.slice(last))
  return nodes.length === 0 ? raw : nodes
}

function estimateReadTime(content: string): number {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 180))
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function renderNewsBlock(block: NewsContentBlock): ReactNode {
  if (block.type === 'heading') {
    return <h2 className="na-heading">{block.text}</h2>
  }
  if (block.type === 'paragraph') {
    return <p className="na-paragraph">{parseInline(block.text ?? '')}</p>
  }
  if (block.type === 'quote') {
    return <blockquote className="na-quote">{parseInline(block.text ?? '')}</blockquote>
  }
  if (block.type === 'image' && block.url) {
    return (
      <figure className="na-figure">
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="na-media-link"
          aria-label={block.caption ? `Відкрити зображення: ${block.caption}` : 'Відкрити зображення'}
        >
          <img src={block.url} alt={block.caption || ''} className="news-media-content" loading="lazy" />
          <span className="na-media-hint">Відкрити у повному розмірі ↗</span>
        </a>
        {block.caption && <figcaption className="na-caption">{block.caption}</figcaption>}
      </figure>
    )
  }
  if (block.type === 'video' && block.url) {
    const youtubeEmbed = toYoutubeEmbedUrl(block.url)
    return (
      <figure className="na-figure">
        {youtubeEmbed ? (
          <iframe
            src={youtubeEmbed}
            title={block.caption || 'Відео до новини'}
            className="news-media-content"
            allowFullScreen
          />
        ) : isVideoFileUrl(block.url) ? (
          <video src={block.url} controls preload="metadata" className="news-media-content" />
        ) : (
          <a href={block.url} target="_blank" rel="noreferrer" className="na-external-media">
            Відкрити відео <span aria-hidden="true">↗</span>
          </a>
        )}
        {block.caption && <figcaption className="na-caption">{block.caption}</figcaption>}
      </figure>
    )
  }
  if (block.type === 'gallery' && block.urls?.length) {
    return <NewsGallery urls={block.urls} caption={block.caption || ''} />
  }
  return null
}

function NewsGallery({ urls, caption }: { urls: string[]; caption: string }) {
  const [active, setActive] = useState(0)
  const current = urls[active] || urls[0]
  return (
    <figure className="na-gallery">
      {caption && <h3>{caption}</h3>}
      <a href={current} target="_blank" rel="noreferrer" className="na-gallery-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={caption || `Зображення ${active + 1}`} loading="lazy" />
        <span>{active + 1} / {urls.length}</span>
      </a>
      {urls.length > 1 && (
        <div className="na-gallery-controls">
          <button type="button" onClick={() => setActive((active - 1 + urls.length) % urls.length)}>←</button>
          <div className="na-gallery-thumbs">
            {urls.map((url, index) => (
              <button
                type="button"
                className={index === active ? 'active' : ''}
                onClick={() => setActive(index)}
                key={`${url}-${index}`}
                aria-label={`Зображення ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setActive((active + 1) % urls.length)}>→</button>
        </div>
      )}
    </figure>
  )
}

export function NewsDetailsClient({ initialUser, post, canManage }: NewsDetailsClientProps) {
  const router = useRouter()
  const confirmAction = useConfirm()
  const [isCopied, setIsCopied] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [engagement, setEngagement] = useState<NewsEngagement>(emptyEngagement)
  const [isLikeBusy, setIsLikeBusy] = useState(false)
  const [isCommentBusy, setIsCommentBusy] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const readTime = estimateReadTime(post.content)
  const postPath = buildNewsPath(post)

  useEffect(() => {
    let isActive = true
    fetch(`/api/news/${post.id}/engagement`, { method: 'POST' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { engagement?: NewsEngagement } | null) => {
        if (!isActive || !data?.engagement) return
        setEngagement(data.engagement)
        setCommentText(data.engagement.userComment?.text || '')
      })
      .catch(() => undefined)
    return () => {
      isActive = false
    }
  }, [post.id])

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), 1800)
    } catch {
      setIsCopied(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!await confirmAction({
      title: 'Видалити новину?',
      description: 'Новина та весь її медіаконтент зникнуть зі сторінки. Цю дію неможливо скасувати.',
      confirmLabel: 'Видалити новину',
    })) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/news/${post.id}`, { method: 'DELETE' })
      if (!response.ok) {
        setIsDeleting(false)
        return
      }
      router.push('/news')
      router.refresh()
    } catch {
      setIsDeleting(false)
    }
  }

  const handleToggleLike = async (): Promise<void> => {
    if (!initialUser) {
      router.push(`/login?next=${encodeURIComponent(postPath)}`)
      return
    }
    setIsLikeBusy(true)
    try {
      const response = await fetch(`/api/news/${post.id}/like`, { method: 'POST' })
      const data = await response.json().catch(() => null) as { engagement?: NewsEngagement } | null
      if (response.ok && data?.engagement) {
        setEngagement(data.engagement)
      }
    } finally {
      setIsLikeBusy(false)
    }
  }

  const handleSaveComment = async (): Promise<void> => {
    if (!initialUser) {
      router.push(`/login?next=${encodeURIComponent(postPath)}`)
      return
    }
    const text = commentText.trim()
    if (!text) {
      setCommentError('Напишіть коротке повідомлення.')
      return
    }
    setCommentError('')
    setIsCommentBusy(true)
    try {
      const response = await fetch(`/api/news/${post.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await response.json().catch(() => null) as { engagement?: NewsEngagement; error?: string } | null
      if (!response.ok) {
        setCommentError(data?.error || 'Не вдалося зберегти повідомлення.')
        return
      }
      if (data?.engagement) {
        setEngagement(data.engagement)
        setCommentText(data.engagement.userComment?.text || text)
      }
    } finally {
      setIsCommentBusy(false)
    }
  }

  return (
    <PageShell active="news" initialUser={initialUser}>
      <main className="page-main na-page">
        <div className="na-topline">
          <nav className="na-breadcrumbs" aria-label="Навігація">
            <Link href="/">Головна</Link>
            <span aria-hidden="true">/</span>
            <Link href="/news">Новини</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{post.category}</span>
          </nav>
          <div className="na-top-actions" aria-label="Дії з новиною">
            <button type="button" className="na-action" onClick={() => void handleCopyLink()}>
              <span aria-hidden="true">{isCopied ? '✓' : '⧉'}</span>
              <span>{isCopied ? 'Скопійовано' : 'Копіювати'}</span>
            </button>
            {canManage && (
              <>
                <Link href={`${postPath}/edit`} className="na-action">
                  <span aria-hidden="true">✎</span>
                  <span>Редагувати</span>
                </Link>
                <button
                  type="button"
                  className="na-action na-action-danger"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                >
                  <span aria-hidden="true">×</span>
                  <span>{isDeleting ? 'Видалення…' : 'Видалити'}</span>
                </button>
              </>
            )}
            <Link href="/news" className="na-back-link">
              <span aria-hidden="true">←</span>
              До новин
            </Link>
          </div>
        </div>

        <article className="na-article">
          <header className="na-header">
            <div className="na-meta">
              <span className="na-category">{post.category}</span>
              <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
              <span className="na-meta-item">{readTime} хв читання</span>
            </div>

            <h1 className="na-title">{post.title}</h1>
            {post.excerpt && <p className="na-lead">{post.excerpt}</p>}

            <div className="na-author-row">
              <img src={post.authorAvatarUrl || IMAGE_PLACEHOLDER} alt="" className="na-author-avatar" />
              <div className="na-author-copy">
                <span>Автор</span>
                {post.authorSlug ? (
                  <Link href={`/profile/${post.authorSlug}`}>{post.authorName}</Link>
                ) : (
                  <strong>{post.authorName}</strong>
                )}
              </div>
              <div className="na-author-stats" aria-label="Статистика новини">
                <span><strong>{engagement.views}</strong> переглядів</span>
                <span><strong>{engagement.likes}</strong> лайків</span>
              </div>
            </div>
          </header>

          {(
            <a
              href={post.coverUrl || IMAGE_PLACEHOLDER}
              target="_blank"
              rel="noreferrer"
              className="na-cover"
              aria-label="Відкрити обкладинку у повному розмірі"
            >
              <img src={post.coverUrl || IMAGE_PLACEHOLDER} alt={post.title} className="na-cover-img" loading="eager" />
              <span className="na-cover-hint">Переглянути повністю ↗</span>
            </a>
          )}

          <div className="na-reading-layout">
            <div className="na-body">
              <div className="na-blocks">
                {post.blocks.map((block) => (
                  <section key={block.id} className={`na-block na-block-${block.type}`}>
                    {renderNewsBlock(block)}
                  </section>
                ))}
              </div>

              <footer className="na-footer">
                <div>
                  <span>Опубліковано</span>
                  <strong>{formatDate(post.createdAt)}</strong>
                </div>
                <button type="button" className="na-footer-share" onClick={() => void handleCopyLink()}>
                  {isCopied ? 'Посилання скопійовано ✓' : 'Поділитися новиною'}
                </button>
              </footer>

              <section className="news-engagement" aria-label="Взаємодія з новиною">
                <div className="news-engagement-head">
                  <div>
                    <span className="news-engagement-kicker">Активність</span>
                    <h2>Обговорення новини</h2>
                    <p>Можна залишити одне повідомлення під новиною. Якщо зміните думку, просто оновіть його.</p>
                  </div>
                  <div className="news-engagement-stats" aria-label="Статистика новини">
                    <span><strong>{engagement.commentsCount}</strong> повідомлень</span>
                  </div>
                </div>

                <div className="news-engagement-actions">
                  <button
                    type="button"
                    className={`news-like-button${engagement.likedByMe ? ' active' : ''}`}
                    onClick={() => void handleToggleLike()}
                    disabled={isLikeBusy}
                  >
                    <span aria-hidden="true">{engagement.likedByMe ? '♥' : '♡'}</span>
                    {engagement.likedByMe ? 'Лайк поставлено' : 'Поставити лайк'}
                  </button>
                  {!initialUser && (
                    <Link href={`/login?next=${encodeURIComponent(postPath)}`} className="news-login-note">
                      Увійдіть, щоб лайкати і писати.
                    </Link>
                  )}
                </div>

                {initialUser ? (
                  <div className="news-comment-box">
                    <label htmlFor="news-comment-text">
                      Ваше повідомлення
                      <span>{commentText.trim().length}/900</span>
                    </label>
                    <textarea
                      id="news-comment-text"
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value.slice(0, 900))}
                      placeholder="Напишіть думку про новину..."
                      rows={4}
                    />
                    {commentError && <p className="news-comment-error">{commentError}</p>}
                    <div className="news-comment-actions">
                      <span>{engagement.userComment ? 'У вас уже є повідомлення. Новий текст оновить його.' : 'Доступне 1 повідомлення на новину.'}</span>
                      <button type="button" onClick={() => void handleSaveComment()} disabled={isCommentBusy}>
                        {isCommentBusy ? 'Збереження...' : engagement.userComment ? 'Оновити повідомлення' : 'Опублікувати'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="news-comment-guest">
                    Щоб залишити повідомлення під новиною, потрібно увійти в акаунт.
                  </div>
                )}

                <div className="news-comments-list">
                  {engagement.comments.length > 0 ? engagement.comments.map((comment) => (
                    <article className="news-comment" key={comment.id}>
                      <img src={comment.author.avatarUrl || IMAGE_PLACEHOLDER} alt="" loading="lazy" />
                      <div>
                        <header>
                          {comment.author.slug ? (
                            <Link href={`/profile/${comment.author.slug}`}>{comment.author.name}</Link>
                          ) : (
                            <strong>{comment.author.name}</strong>
                          )}
                          <time dateTime={comment.updatedAt}>{formatDate(comment.updatedAt)}</time>
                        </header>
                        <p>{comment.text}</p>
                      </div>
                    </article>
                  )) : (
                    <div className="news-comments-empty">Поки немає повідомлень. Будьте першим, хто відреагує.</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </article>
      </main>
    </PageShell>
  )
}
