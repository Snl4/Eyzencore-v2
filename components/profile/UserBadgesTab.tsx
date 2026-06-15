export interface UserBadge {
  name: string;
  description: string;
  emblem: string;
  imageUrl?: string | null;
  earned: boolean;
}

export function UserBadgesTab({ badges }: { badges: UserBadge[] }) {
  if (badges.length === 0) {
    return (
      <div className="cms-empty" style={{ padding: '40px 20px' }}>
        Досягнення ще не налаштовані або немає активних бейджів.
      </div>
    )
  }
  return (
    <div className="pbadges">
      {badges.map((b) => (
        <div className={`pbadge${b.earned ? '' : ' locked'}`} key={b.name}>
          <div className="pbadge-medal">
            {b.imageUrl ? <img src={b.imageUrl} alt="" /> : b.emblem}
          </div>
          <div className="pbadge-name">{b.name}</div>
          <div className="pbadge-desc">{b.description}</div>
        </div>
      ))}
    </div>
  );
}
