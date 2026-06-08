import { Icons } from '@/components/ui/Icons';
import { formatPlural } from '@/lib/format-plural';

export interface UserForumThread {
  title: string;
  category: string;
  replies: number;
  views: number;
  date: string;
  pinned?: boolean;
}

export function UserForumTab({ threads }: { threads: UserForumThread[] }) {
  return (
    <div className="pforum-list">
      {threads.map((th) => (
        <div className="pforum-item" key={th.title}>
          <div className="pforum-ico">{Icons.forum}</div>
          <div className="pforum-body">
            <div className="pforum-title">
              {th.pinned && <span className="tag tag-accent">Закріплено</span>}
              <span className="t">{th.title}</span>
            </div>
            <div className="pforum-meta">
              {th.category} · {formatPlural(th.replies, ['відповідь', 'відповіді', 'відповідей'])} · {formatPlural(th.views, ['перегляд', 'перегляди', 'переглядів'])} · {th.date}
            </div>
          </div>
          <div className="pforum-arrow">{Icons.arrow}</div>
        </div>
      ))}
    </div>
  );
}
