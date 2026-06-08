export interface UserBadge {
  name: string;
  description: string;
  emblem: string;
  earned: boolean;
}

export function UserBadgesTab({ badges }: { badges: UserBadge[] }) {
  return (
    <div className="pbadges">
      {badges.map((b) => (
        <div className={`pbadge${b.earned ? '' : ' locked'}`} key={b.name}>
          <div className="pbadge-medal">{b.emblem}</div>
          <div className="pbadge-name">{b.name}</div>
          <div className="pbadge-desc">{b.description}</div>
        </div>
      ))}
    </div>
  );
}
