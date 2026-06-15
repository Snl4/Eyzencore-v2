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
import { useConfirm } from '@/components/ui/ConfirmDialog'
import {
  ForumMediaGallery,
  ForumMediaUploader,
  type ForumAttachment,
} from '@/components/forum/ForumMedia'
import { ForumRichText } from '@/components/forum/ForumRichText'
import type { AuthUser } from '@/lib/auth-db'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'
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
  avatarUrl,
}: {
  avatarUrl: string | null
}) {
  return (
    <div
      className="forum-post-avatar"
      style={
        {
          backgroundImage: `url(${JSON.stringify(avatarUrl || IMAGE_PLACEHOLDER).slice(1, -1)})`,
        }
      }
    />
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
  const confirmAction = useConfirm()
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
  const [reasonModal, setReasonModal] = useState<{
    action: 'removeThread' | 'moderateLock' | 'moderateDelete'
    title: string
    description: string
    confirmLabel: string
    reason: string
  } | null>(null)

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

  function openReasonModal(action: 'removeThread' | 'moderateLock' | 'moderateDelete') {
    setError('')
    setReasonModal({
      action,
      reason: '',
      title:
        action === 'removeThread'
          ? 'Видалити тему'
          : action === 'moderateLock'
          ? 'Заблокувати тему'
          : 'Видалити тему',
      description:
        action === 'removeThread'
          ? 'Вкажіть причину видалення теми.'
          : action === 'moderateLock'
          ? 'Вкажіть причину блокування теми.'
          : 'Вкажіть причину видалення теми.',
      confirmLabel:
        action === 'removeThread'
          ? 'Видалити тему'
          : action === 'moderateLock'
          ? 'Заблокувати'
          : 'Видалити тему',
    })
  }

  async function performRemoveThread(reason = '') {
    const response = await fetch(`/api/forum/threads/${thread.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (response.ok) {
      router.replace('/forum')
      router.refresh()
    } else {
      const result = await response.json().catch(() => ({}))
      setError(result.error || 'Не вдалося видалити тему')
    }
  }

  async function performModeration(action: 'pin' | 'lock' | 'solve' | 'delete', reason?: string) {
    const body: Record<string, unknown> = { action }
    if (reason) body.reason = reason

    const response = await fetch(`/api/forum/threads/${thread.id}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося виконати дію')
      return
    }
    await reload()
  }

  async function removeThread() {
    if (!await confirmAction({
      title: 'Видалити тему?',
      description: 'Тема, усі відповіді та реакції будуть видалені без можливості відновлення.',
      confirmLabel: 'Видалити тему',
    })) return

    const isAdminDelete = isAdmin && thread.author.id !== initialUser?.id
    if (isAdminDelete) {
      openReasonModal('removeThread')
      return
    }

    await performRemoveThread()
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
    if (!await confirmAction({
      title: 'Видалити відповідь?',
      description: 'Відповідь і реакції на неї буде остаточно видалено.',
      confirmLabel: 'Видалити відповідь',
    })) return
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

  async function moderate(action: 'pin' | 'lock' | 'solve' | 'delete') {
    if (action === 'lock' && isAdmin && thread.author.id !== initialUser?.id) {
      openReasonModal('moderateLock')
      return
    }

    if (action === 'delete') {
      openReasonModal('moderateDelete')
      return
    }

    await performModeration(action)
  }

  async function confirmReasonAction() {
    if (!reasonModal) return

    const reason = reasonModal.reason.trim()
    if (!reason) {
      setError('Потрібно вказати причину')
      return
    }

    const action = reasonModal.action
    setReasonModal(null)
    setError('')

    if (action === 'removeThread') {
      await performRemoveThread(reason)
      return
    }

    if (action === 'moderateLock') {
      await performModeration('lock', reason)
      return
    }

    if (action === 'moderateDelete') {
      await performModeration('delete', reason)
      return
    }
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
    const authorRole = item.author.role.toUpperCase()
    const roleLabel =
      authorRole === 'ADMIN'
        ? 'Адміністратор'
        : authorRole === 'OWNER'
          ? 'Власник'
          : null

    return (
      <article className={`forum-post ${original ? 'original' : ''}`} key={item.id || 'topic'}>
        <aside>
          <UserAvatar avatarUrl={item.author.avatarUrl} />
          <Link href={`/profile/${item.author.slug || item.author.id}`}>
            {item.author.name}
          </Link>
          {roleLabel ? (
            <span className={`forum-role role-${authorRole.toLowerCase()}`}>
              {roleLabel}
            </span>
          ) : null}
          <small>З нами з {formatDate(item.author.joinedAt)}</small>
        </aside>
        <div className="forum-post-content">
          <header>
            <span>{formatDate(item.createdAt)}</span>
            {item.updatedAt !== item.createdAt ? <em>редаговано</em> : null}
            {original ? <b>Тема</b> : null}
          </header>
          <div className="forum-post-text">
            <ForumRichText content={item.content} />
          </div>
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
                  {
                    label: 'Видалити тему',
                    icon: <FontAwesomeIcon icon={faTrash} />,
                    onSelect: () => void moderate('delete'),
                    danger: true,
                  },
                ] : []),
              ]}
            />
          ) : null}
        </section>

        {error ? <div className="forum-alert">{error}</div> : null}
        {thread.isDeleted ? (
          <div className="forum-alert">
            Тему видалено.
            {thread.deletedReason ? <div>Причина: {thread.deletedReason}</div> : null}
          </div>
        ) : null}

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

        {thread.isDeleted ? (
          <div className="forum-alert">
            <FontAwesomeIcon icon={faTrash} />
            Тему видалено.
            {thread.deletedReason ? <div>Причина: {thread.deletedReason}</div> : null}
          </div>
        ) : thread.isLocked ? (
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

      {reasonModal ? (
        <div className="forum-modal-backdrop" onMouseDown={() => setReasonModal(null)}>
          <form
            className="forum-compose-modal"
            onSubmit={(event) => {
              event.preventDefault()
              void confirmReasonAction()
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <h2>{reasonModal.title}</h2>
              <button onClick={() => setReasonModal(null)} type="button">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>
            <p>{reasonModal.description}</p>
            <label>
              <span>Причина</span>
              <textarea
                maxLength={1000}
                minLength={5}
                required
                rows={7}
                value={reasonModal.reason}
                onChange={(event) =>
                  setReasonModal({ ...reasonModal, reason: event.target.value })
                }
              />
            </label>
            <footer>
              <button className="btn btn-ghost" onClick={() => setReasonModal(null)} type="button">
                Скасувати
              </button>
              <button className="btn btn-primary" type="submit">
                {reasonModal.confirmLabel}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </PageShell>
  )
}
