'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faCheckCircle,
  faComment,
  faEllipsis,
  faEye,
  faHeart,
  faLock,
  faPen,
  faReply,
  faThumbtack,
  faTrash,
  faUnlock,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { PageShell } from '@/components/layout/PageShell'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import {
  ForumMediaGallery,
  ForumMediaUploader,
  type ForumAttachment,
} from '@/components/forum/ForumMedia'
import type { AuthUser } from '@/lib/auth-db'
import type { getForumThread } from '@/lib/forum-db'

type ForumThread = NonNullable<Awaited<ReturnType<typeof getForumThread>>>
type ForumReply = ForumThread['replies'][number]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function UserAvatar({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl: string | null
}) {
  return (
    <div
      className="forum-post-avatar"
      style={
        avatarUrl
          ? {
              backgroundImage: `url(${JSON.stringify(avatarUrl).slice(1, -1)})`,
            }
          : undefined
      }
    >
      {!avatarUrl ? name.slice(0, 1).toUpperCase() : null}
    </div>
  )
}

export function ForumThreadClient({
  initialUser,
  initialThread,
}: {
  initialUser: AuthUser | null
  initialThread: ForumThread
}) {
  const router = useRouter()
  const [thread, setThread] = useState(initialThread)
  const [reply, setReply] = useState('')
  const [replyAttachments, setReplyAttachments] = useState<ForumAttachment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editingThread, setEditingThread] = useState(false)
  const [threadDraft, setThreadDraft] = useState({
    title: thread.title,
    content: thread.content,
    attachments: thread.attachments,
  })
  const [editingReply, setEditingReply] = useState<ForumReply | null>(null)

  const isAdmin = initialUser?.user_metadata.role === 'ADMIN'
  const ownsThread = initialUser?.id === thread.author.id
  const canManageThread = Boolean(ownsThread || isAdmin)

  async function reload() {
    const response = await fetch(`/api/forum/threads/${thread.id}`, {
      cache: 'no-store',
    })
    const result = await response.json()
    if (response.ok) setThread(result.thread)
  }

  function requireLogin() {
    if (initialUser) return true
    router.push(`/login?next=/forum/${thread.id}`)
    return false
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requireLogin()) return
    setSubmitting(true)
    setError('')
    const response = await fetch(`/api/forum/threads/${thread.id}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: reply, attachments: replyAttachments }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося опублікувати відповідь')
      setSubmitting(false)
      return
    }
    setReply('')
    setReplyAttachments([])
    await reload()
    setSubmitting(false)
  }

  async function toggleThreadLike() {
    if (!requireLogin()) return
    const response = await fetch(`/api/forum/threads/${thread.id}/like`, {
      method: 'POST',
    })
    const result = await response.json().catch(() => ({}))
    if (response.ok) {
      setThread({
        ...thread,
        likedByMe: result.liked,
        likes: result.likes,
      })
    }
  }

  async function toggleReplyLike(postId: number) {
    if (!requireLogin()) return
    const response = await fetch(`/api/forum/replies/${postId}/like`, {
      method: 'POST',
    })
    const result = await response.json().catch(() => ({}))
    if (response.ok) {
      setThread({
        ...thread,
        replies: thread.replies.map((item) =>
          item.id === postId
            ? { ...item, likedByMe: result.liked, likes: result.likes }
            : item
        ),
      })
    }
  }

  async function saveThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    const response = await fetch(`/api/forum/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(threadDraft),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося зберегти тему')
      setSubmitting(false)
      return
    }
    setEditingThread(false)
    await reload()
    setSubmitting(false)
  }

  async function removeThread() {
    if (!confirm('Видалити тему разом з усіма відповідями?')) return
    const response = await fetch(`/api/forum/threads/${thread.id}`, {
      method: 'DELETE',
    })
    if (response.ok) {
      router.replace('/forum')
      router.refresh()
    }
  }

  async function saveReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingReply) return
    setSubmitting(true)
    const response = await fetch(`/api/forum/replies/${editingReply.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editingReply.content,
        attachments: editingReply.attachments,
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося зберегти відповідь')
      setSubmitting(false)
      return
    }
    setEditingReply(null)
    await reload()
    setSubmitting(false)
  }

  async function removeReply(postId: number) {
    if (!confirm('Видалити цю відповідь?')) return
    const response = await fetch(`/api/forum/replies/${postId}`, {
      method: 'DELETE',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося видалити відповідь')
      return
    }
    await reload()
  }

  async function moderate(action: 'pin' | 'lock' | 'solve') {
    const response = await fetch(`/api/forum/threads/${thread.id}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося виконати дію')
      return
    }
    await reload()
  }

  function renderPost(
    item: {
      id?: number
      content: string
      attachments: ForumAttachment[]
      author: ForumThread['author']
      likes: number
      likedByMe: boolean
      createdAt: string
      updatedAt: string
    },
    original = false
  ) {
    const canManage =
      initialUser?.id === item.author.id || initialUser?.user_metadata.role === 'ADMIN'
    return (
      <article className={`forum-post ${original ? 'original' : ''}`} key={item.id || 'topic'}>
        <aside>
          <UserAvatar name={item.author.name} avatarUrl={item.author.avatarUrl} />
          <Link href={`/profile/${item.author.slug || item.author.id}`}>
            {item.author.name}
          </Link>
          <span className={`forum-role role-${item.author.role.toLowerCase()}`}>
            {item.author.role}
          </span>
          <small>З нами з {formatDate(item.author.joinedAt)}</small>
        </aside>
        <div className="forum-post-content">
          <header>
            <span>{formatDate(item.createdAt)}</span>
            {item.updatedAt !== item.createdAt ? <em>редаговано</em> : null}
            {original ? <b>Тема</b> : null}
          </header>
          <div className="forum-post-text">{item.content}</div>
          <ForumMediaGallery attachments={item.attachments} />
          <footer>
            <button
              className={item.likedByMe ? 'active' : ''}
              onClick={() =>
                original ? toggleThreadLike() : toggleReplyLike(item.id as number)
              }
              type="button"
            >
              <FontAwesomeIcon icon={faHeart} />
              {item.likes || 'Подобається'}
            </button>
            {!original && !thread.isLocked ? (
              <button
                onClick={() => {
                  if (!requireLogin()) return
                  setReply(`@${item.author.slug || item.author.name} `)
                  document
                    .querySelector<HTMLTextAreaElement>('#forum-reply-editor')
                    ?.focus()
                }}
                type="button"
              >
                <FontAwesomeIcon icon={faReply} />
                Відповісти
              </button>
            ) : null}
            {canManage ? (
              <div className="forum-post-manage">
                <button
                  onClick={() =>
                    original
                      ? setEditingThread(true)
                      : setEditingReply(item as ForumReply)
                  }
                  type="button"
                >
                  <FontAwesomeIcon icon={faPen} />
                  Редагувати
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    original ? removeThread() : removeReply(item.id as number)
                  }
                  type="button"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  Видалити
                </button>
              </div>
            ) : null}
          </footer>
        </div>
      </article>
    )
  }

  return (
    <PageShell active="forum" initialUser={initialUser}>
      <div className="page-main forum-topic-page">
        <Link className="forum-back-link" href="/forum">
          <FontAwesomeIcon icon={faArrowLeft} />
          До всіх тем
        </Link>

        <section className="forum-topic-head">
          <div>
            <div className="forum-topic-badges">
              <span style={{ '--topic-color': thread.category.color } as React.CSSProperties}>
                {thread.category.name}
              </span>
              {thread.isPinned ? (
                <span><FontAwesomeIcon icon={faThumbtack} /> Закріплено</span>
              ) : null}
              {thread.isSolved ? (
                <span className="solved">
                  <FontAwesomeIcon icon={faCheckCircle} /> Вирішено
                </span>
              ) : null}
              {thread.isLocked ? (
                <span><FontAwesomeIcon icon={faLock} /> Закрито</span>
              ) : null}
            </div>
            <h1>{thread.title}</h1>
            <div className="forum-topic-stats">
              <span><FontAwesomeIcon icon={faComment} /> {thread.replyCount} відповідей</span>
              <span><FontAwesomeIcon icon={faEye} /> {thread.views} переглядів</span>
              <span><FontAwesomeIcon icon={faHeart} /> {thread.likes} вподобань</span>
            </div>
          </div>
          {canManageThread ? (
            <DropdownMenu
              className="forum-topic-menu"
              label="Керування темою"
              trigger={() => <span className="forum-topic-menu-trigger"><FontAwesomeIcon icon={faEllipsis} /></span>}
              items={[
                {
                  label: thread.isSolved ? 'Зняти вирішення' : 'Позначити вирішеною',
                  icon: <FontAwesomeIcon icon={faCheckCircle} />,
                  onSelect: () => void moderate('solve'),
                },
                ...(isAdmin ? [
                  {
                    label: thread.isPinned ? 'Відкріпити' : 'Закріпити',
                    icon: <FontAwesomeIcon icon={faThumbtack} />,
                    onSelect: () => void moderate('pin'),
                  },
                  {
                    label: thread.isLocked ? 'Розблокувати' : 'Заблокувати',
                    icon: <FontAwesomeIcon icon={thread.isLocked ? faUnlock : faLock} />,
                    onSelect: () => void moderate('lock'),
                  },
                ] : []),
              ]}
            />
          ) : null}
        </section>

        {error ? <div className="forum-alert">{error}</div> : null}

        <section className="forum-post-list">
          {renderPost(
            {
              content: thread.content,
              attachments: thread.attachments,
              author: thread.author,
              likes: thread.likes,
              likedByMe: thread.likedByMe,
              createdAt: thread.createdAt,
              updatedAt: thread.updatedAt,
            },
            true
          )}
          {thread.replies.map((item) => renderPost(item))}
        </section>

        {thread.isLocked ? (
          <div className="forum-locked-notice">
            <FontAwesomeIcon icon={faLock} />
            Тему заблоковано. Нові відповіді тимчасово недоступні.
          </div>
        ) : (
          <form className="forum-reply-box" onSubmit={submitReply}>
            <header>
              <div>
                <FontAwesomeIcon icon={faReply} />
                <strong>Ваша відповідь</strong>
              </div>
              <span>{reply.length}/12000</span>
            </header>
            <textarea
              id="forum-reply-editor"
              maxLength={12000}
              placeholder={
                initialUser
                  ? 'Напишіть відповідь по суті обговорення...'
                  : 'Увійдіть, щоб відповісти'
              }
              rows={7}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onFocus={requireLogin}
            />
            <ForumMediaUploader
              attachments={replyAttachments}
              onChange={setReplyAttachments}
              onError={setError}
            />
            <footer>
              <small>Поважайте інших учасників і дотримуйтеся теми.</small>
              <button
                className="btn btn-primary"
                disabled={submitting || reply.trim().length < 2}
                type="submit"
              >
                {submitting ? 'Публікуємо...' : 'Опублікувати відповідь'}
              </button>
            </footer>
          </form>
        )}
      </div>

      {editingThread ? (
        <div className="forum-modal-backdrop" onMouseDown={() => setEditingThread(false)}>
          <form
            className="forum-compose-modal"
            onSubmit={saveThread}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Редагувати тему</h2>
              <button onClick={() => setEditingThread(false)} type="button">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>
            <label>
              <span>Заголовок</span>
              <input
                maxLength={160}
                minLength={6}
                required
                value={threadDraft.title}
                onChange={(event) =>
                  setThreadDraft({ ...threadDraft, title: event.target.value })
                }
              />
            </label>
            <ForumMediaUploader
              attachments={threadDraft.attachments}
              onChange={(attachments) =>
                setThreadDraft({ ...threadDraft, attachments })
              }
              onError={setError}
            />
            <label>
              <span>Текст теми</span>
              <textarea
                maxLength={12000}
                minLength={15}
                required
                rows={12}
                value={threadDraft.content}
                onChange={(event) =>
                  setThreadDraft({ ...threadDraft, content: event.target.value })
                }
              />
            </label>
            <footer>
              <button className="btn btn-ghost" onClick={() => setEditingThread(false)} type="button">
                Скасувати
              </button>
              <button className="btn btn-primary" disabled={submitting} type="submit">
                Зберегти
              </button>
            </footer>
          </form>
        </div>
      ) : null}

      {editingReply ? (
        <div className="forum-modal-backdrop" onMouseDown={() => setEditingReply(null)}>
          <form
            className="forum-compose-modal"
            onSubmit={saveReply}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Редагувати відповідь</h2>
              <button onClick={() => setEditingReply(null)} type="button">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>
            <label>
              <span>Текст відповіді</span>
              <textarea
                maxLength={12000}
                minLength={2}
                required
                rows={10}
                value={editingReply.content}
                onChange={(event) =>
                  setEditingReply({ ...editingReply, content: event.target.value })
                }
              />
            </label>
            <ForumMediaUploader
              attachments={editingReply.attachments}
              onChange={(attachments) =>
                setEditingReply({ ...editingReply, attachments })
              }
              onError={setError}
            />
            <footer>
              <button className="btn btn-ghost" onClick={() => setEditingReply(null)} type="button">
                Скасувати
              </button>
              <button className="btn btn-primary" disabled={submitting} type="submit">
                Зберегти
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </PageShell>
  )
}
