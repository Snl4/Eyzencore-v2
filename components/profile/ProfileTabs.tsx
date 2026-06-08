export type ProfileTabKey = 'servers' | 'forum' | 'activity' | 'badges';

export interface ProfileTab {
  key: ProfileTabKey;
  label: string;
  count?: number;
}

interface Props {
  tabs: ProfileTab[];
  active: ProfileTabKey;
  onChange: (key: ProfileTabKey) => void;
}

export function ProfileTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="profile-tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`profile-tab${active === t.key ? ' active' : ''}`}
          onClick={() => onChange(t.key)}
          type="button"
        >
          {t.label}
          {t.count !== undefined && <span className="ct">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
