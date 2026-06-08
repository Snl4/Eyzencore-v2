import { Icons } from '@/components/ui/Icons';
import { formatJoinedAt, formatNumberUA } from './format';

export interface ProfileHeaderData {
  fullName: string;
  handle: string;
  bio: string;
  website: string | null;
  telegram: string | null;
  discord: string | null;
  location: string;
  followers: number;
  joinedAtIso: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: string;
  tags: string[];
}

function avatarChar(name: string) {
  const trimmed = name.trim();
  return (trimmed[0] || 'U').toUpperCase();
}

export function ProfileHeader({ data }: { data: ProfileHeaderData }) {
  const normalizedRole = String(data.role || '').toUpperCase();
  const showOwner = normalizedRole === 'OWNER';
  const showAdmin = normalizedRole === 'ADMIN';

  const coverStyle = data.bannerUrl
    ? {
        backgroundImage: `url(${JSON.stringify(data.bannerUrl).slice(1, -1)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <>
      <div className="profile-cover" style={coverStyle} />
      <div className="profile-card">
        <div
          className="profile-avatar"
          style={
            data.avatarUrl
              ? {
                  backgroundImage: `url(${JSON.stringify(data.avatarUrl).slice(1, -1)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  color: 'transparent',
                }
              : undefined
          }
        >
          {!data.avatarUrl && avatarChar(data.fullName)}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">
            <span className="profile-name-tags">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className={tag.toLowerCase() === 'stuff' ? 'tag tag-stuff' : 'tag tag-old'}
                >
                  {tag}
                </span>
              ))}
            </span>
            {data.fullName || 'Без імені'}
            {showOwner && <span className="tag tag-accent">OWNER</span>}
            {showAdmin && <span className="tag tag-accent">ADMIN</span>}
          </h2>
          <div className="profile-handle-row">
            <a
              className="profile-handle profile-handle-link"
              href={`/profile/${data.handle || 'user'}`}
              target="_blank"
              rel="noreferrer"
            >
              @{data.handle || 'user'}
            </a>
          </div>
          {data.bio && <p className="profile-bio">{data.bio}</p>}
          <div className="profile-meta">
            {data.website && (
              <span>
                {Icons.globe}
                <a href={data.website} target="_blank" rel="noreferrer">{data.website}</a>
              </span>
            )}
            {data.telegram && (
              <span>
                {Icons.telegram}
                <a href={data.telegram} target="_blank" rel="noreferrer">Telegram</a>
              </span>
            )}
            {data.discord && (
              <span>
                {Icons.discord}
                <a href={data.discord} target="_blank" rel="noreferrer">Discord</a>
              </span>
            )}
            {data.location && (
              <span>
                {Icons.mapPin}
                {data.location}
              </span>
            )}
            <span>
              {Icons.users}
              {formatNumberUA(data.followers)} підписників
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              З нами з {formatJoinedAt(data.joinedAtIso)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
