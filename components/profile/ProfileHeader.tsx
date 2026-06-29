import { Icons } from '@/components/ui/Icons';
import { SidebarIcon } from '@/components/layout/SidebarIcon';
import { formatJoinedAt, formatNumberUA } from './format';
import { buildBannerSurfaceStyle } from '@/lib/banner-display';
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders';

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
  hasOwnedServer?: boolean;
}

function getProfileTags(data: ProfileHeaderData) {
  const role = String(data.role || '').toUpperCase();
  const roleTags = role === 'ADMIN'
    ? ['ADMIN']
    : role === 'DESIGNER'
        ? ['DESIGNER']
        : [];

  const ownerTags = data.hasOwnedServer ? ['Власник серверу'] : [];
  return Array.from(new Set([...ownerTags, ...roleTags, ...data.tags.map((tag) => String(tag).toUpperCase())]));
}

export function ProfileHeader({ data }: { data: ProfileHeaderData }) {
  const tags = getProfileTags(data);
  const coverStyle = buildBannerSurfaceStyle(data.bannerUrl || IMAGE_PLACEHOLDER);

  return (
    <>
      <div className="profile-cover banner-surface" style={coverStyle} />
      <div className="profile-card">
        <div
          className="profile-avatar"
          style={{
            backgroundImage: `url(${JSON.stringify(data.avatarUrl || IMAGE_PLACEHOLDER).slice(1, -1)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'transparent',
          }}
        />
        <div className="profile-info">
          <h2 className="profile-name">
            <span className="profile-name-text">{data.fullName || 'Без імені'}</span>
            {tags.length > 0 && (
              <span className="profile-name-tags" aria-label="Теги користувача">
                {tags.map((tag) => (
                  <span key={tag} className={`tag ${tag === 'OLD' ? 'tag-old' : 'tag-accent'}`}>
                    {tag}
                  </span>
                ))}
              </span>
            )}
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
                <span className="profile-meta-fa-icon" aria-hidden="true">
                  <SidebarIcon name="discord" />
                </span>
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
