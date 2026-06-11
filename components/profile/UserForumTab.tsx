import Link from 'next/link'
import { Icons } from '@/components/ui/Icons'
import { formatPlural } from '@/lib/format-plural'

export interface UserForumThread {
  id?: number
  title: string
  category: string
  replies: number
  views: number
  date: string
  pinned?: boolean
}

export function UserForumTab({ threads }: { threads: UserForumThread[] }) {
  return (
    <div className="pforum-list">
      {threads.map((thread) => (
        <Link
          className="pforum-item"
          href={thread.id ? `/forum/${thread.id}` : '/forum'}
          key={thread.id || thread.title}
        >
          <div className="pforum-ico">{Icons.forum}</div>
          <div className="pforum-body">
            <div className="pforum-title">
              {thread.pinned ? (
                <span className="tag tag-accent">Закріплено</span>
              ) : null}
              <span className="t">{thread.title}</span>
            </div>
            <div className="pforum-meta">
              {thread.category} ·{' '}
              {formatPlural(thread.replies, [
                'відповідь',
                'відповіді',
                'відповідей',
              ])}{' '}
              ·{' '}
              {formatPlural(thread.views, [
                'перегляд',
                'перегляди',
                'переглядів',
              ])}{' '}
              · {new Date(thread.date).toLocaleDateString('uk-UA')}
            </div>
          </div>
          <div className="pforum-arrow">{Icons.arrow}</div>
        </Link>
      ))}
      {threads.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
          Користувач ще не створював тем на форумі.
        </div>
      ) : null}
    </div>
  )
}
