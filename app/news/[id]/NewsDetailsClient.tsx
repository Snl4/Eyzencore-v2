'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import type { AuthUser, NewsContentBlock, NewsPost } from '@/lib/auth-db'
import React from 'react'
import type { ReactNode } from 'react'

type NewsDetailsClientProps = {
  initialUser: AuthUser | null
  post: NewsPost
  canManage: boolean
}

function isVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
}

function toYoutubeEmbedUrl(url: string): string | null {
  const normalized = String(url || '').trim()
  const watchMatch = normalized.match(/(?:youtube\.com\/watch\?v=)([\w-]{6,})/i)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  const shortMatch = normalized.match(/(?:youtu\.be\/)([\w-]{6,})/i)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  return null
}

function parseInline(raw: string): React.ReactNode {
  const nodes: React.ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) nodes.push(raw.slice(last, m.index))
    if (m[1] != null) nodes.push(<strong key={key++}>{m[1]}</strong>)
    else if (m[2] != null) nodes.push(<em key={key++}>{m[2]}</em>)
    else if (m[3] != null) nodes.push(<s key={key++}>{m[3]}</s>)
    else if (m[4] != null) nodes.push(<code key={key++} className="na-code">{m[4]}</code>)
    else nodes.push(<a key={key++} href={m[6]} target="_blank" rel="noreferrer" className="na-link">{m[5]}</a>)
    last = re.lastIndex
  }
  if (last < raw.length) nodes.push(raw.slice(last))
  return nodes.length === 0 ? raw : nodes
}

function estimateReadTime(content: string): string {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 180))} хв`
}

function renderNewsBlock(block: NewsContentBlock): ReactNode {
  if (block.type === 'heading') {
    return (
      <h3 className="na-heading">{block.text}</h3>
    )
  }
  if (block.type === 'paragraph') {
    return (
      <p className="na-paragraph">{parseInline(block.text ?? '')}</p>
    )
  }
  if (block.type === 'quote') {
    return (
      <blockquote className="na-quote">{parseInline(block.text ?? '')}</blockquote>
    )
  }
  if (block.type === 'image' && block.url) {
    return (
      <figure className="na-figure">
        <div
          aria-hidden="true"
          className="news-media-content"
          style={{ backgroundImage: `url(${JSON.stringify(block.url).slice(1, -1)})` }}
        />
        {block.caption && <figcaption className="na-caption">{block.caption}</figcaption>}
      </figure>
    )
  }
  if (block.type === 'video' && block.url) {
    const youtubeEmbed = toYoutubeEmbedUrl(block.url)
    return (
      <figure className="na-figure">
        {isVideoFileUrl(block.url) ? (
          <video src={block.url} controls className="news-media-content" />
        ) : youtubeEmbed ? (
          <iframe
            src={youtubeEmbed}
            title={block.caption || 'news-video'}
            className="news-media-content"
            allowFullScreen
          />
        ) : (
          <a href={block.url} target="_blank" rel="noreferrer" className="btn btn-secondary">
            Відкрити відео
          </a>
        )}
        {block.caption && <figcaption className="na-caption">{block.caption}</figcaption>}
      </figure>
    )
  }
  return null
}

export function NewsDetailsClient({ initialUser, post, canManage }: NewsDetailsClientProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!window.confirm('Видалити цю новину? Дію неможливо скасувати.')) return
    try {
      const response = await fetch(`/api/news/${post.id}`, { method: 'DELETE' })
      if (!response.ok) return
      router.push('/news')
      router.refresh()
    } catch {}
  }

  return (
    <PageShell active="news" initialUser={initialUser}>
      <div className="page-main">

        {/* ── Topbar ── */}
        <div className="page-topbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="page-crumb">простір / новини / {post.id}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/news" className="btn btn-secondary">
              ← До новин
            </Link>
            {canManage && (
              <>
                <Link href={`/news/${post.id}/edit`} className="btn btn-secondary">
                  Редагувати
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleDelete()}
                >
                  Видалити
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Article ── */}
        <article className="na-article">

          {/* Hero cover */}
          {post.coverUrl && (
            <div className="na-cover">
              <img
                src={post.coverUrl}
                alt={post.title}
                className="na-cover-img"
                loading="eager"
              />
            </div>
          )}

          {/* Content column */}
          <div className="na-body">

            {/* Meta row */}
            <div className="na-meta">
              <span className="na-category">{post.category}</span>
              <span className="na-meta-sep" />
              <time>
                {new Date(post.createdAt).toLocaleDateString('uk-UA', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
              <span className="na-meta-sep" />
              <span>{estimateReadTime(post.content)} читання</span>
            </div>

            {/* Title */}
            <h1 className="na-title">{post.title}</h1>

            {/* Excerpt / lead */}
            {post.excerpt && (
              <p className="na-lead">{post.excerpt}</p>
            )}

            {/* Divider */}
            <div className="na-divider" />

            {/* Content blocks */}
            <div className="na-blocks">
              {post.blocks.map((block) => (
                <div key={block.id}>{renderNewsBlock(block)}</div>
              ))}
            </div>

            {/* Author footer */}
            <div className="na-author">
              {post.authorAvatarUrl && (
                <img
                  src={post.authorAvatarUrl}
                  alt={post.authorName}
                  className="na-author-avatar"
                />
              )}
              <div>
                <div className="na-author-label">Автор</div>
                <div className="na-author-name">
                  {post.authorSlug ? (
                    <Link href={`/profile/${post.authorSlug}`}>{post.authorName}</Link>
                  ) : (
                    post.authorName
                  )}
                </div>
              </div>
            </div>

          </div>
        </article>

      </div>
    </PageShell>
  )
}
