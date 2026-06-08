import type { ReactNode } from 'react';

export interface UserActivityEntry {
  icon: ReactNode;
  body: ReactNode;
  meta: string;
}

export function UserActivityTab({ entries }: { entries: UserActivityEntry[] }) {
  return (
    <div className="activity-list">
      {entries.map((a, i) => (
        <div className="activity" key={i}>
          <div className="activity-ico">{a.icon}</div>
          <div className="activity-body">
            <div className="head">{a.body}</div>
            <div className="meta">{a.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
