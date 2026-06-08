export interface ProfileStat {
  label: string;
  value: string;
  trend: string;
}

export function ProfileStats({ stats }: { stats: ProfileStat[] }) {
  return (
    <div className="profile-stats">
      {stats.map((s) => (
        <div className="stat" key={s.label}>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value">{s.value}</div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-3)',
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {s.trend}
          </div>
        </div>
      ))}
    </div>
  );
}
