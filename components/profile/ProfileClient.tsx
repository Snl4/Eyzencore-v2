'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Icons } from '@/components/ui/Icons';
import type { AuthUser, UserProfileActivity, UserProfileSummary } from '@/lib/auth-db';
import { ProfileHeader, type ProfileHeaderData } from './ProfileHeader';
import { ProfileStats, type ProfileStat } from './ProfileStats';
import { ProfileTabs, type ProfileTabKey } from './ProfileTabs';
import { UserServersTab, type UserServerCard } from './UserServersTab';
import { UserForumTab, type UserForumThread } from './UserForumTab';
import { UserActivityTab, type UserActivityEntry } from './UserActivityTab';
import { UserBadgesTab, type UserBadge } from './UserBadgesTab';
import { ProfileEditModal } from './ProfileEditModal';
import { formatNumberUA } from './format';

interface Props {
  user: AuthUser;
  currentUser?: AuthUser | null;
  serverCount: number;
  totalOnline: number;
  ownedServers: UserServerCard[];
  forumThreads?: UserForumThread[];
  summary?: UserProfileSummary;
  badges?: UserBadge[];
  isPublicView?: boolean;
}

const RTF = new Intl.RelativeTimeFormat('uk', { numeric: 'auto' });
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} с тому`;
  const min = Math.floor(sec / 60);
  if (min < 60) return RTF.format(-min, 'minute');
  const hr = Math.floor(min / 60);
  if (hr < 24) return RTF.format(-hr, 'hour');
  const days = Math.floor(hr / 24);
  if (days < 30) return RTF.format(-days, 'day');
  const months = Math.floor(days / 30);
  if (months < 12) return RTF.format(-months, 'month');
  return RTF.format(-Math.floor(months / 12), 'year');
}

const ACTIVITY_ICONS: Record<UserProfileActivity['kind'], ReactNode> = {
  server_created: Icons.plus,
  server_verified: Icons.shield,
  vote_received: Icons.pulse,
  review_received: Icons.chart,
  profile_updated: Icons.users,
};

function buildActivityEntries(events: UserProfileActivity[]): UserActivityEntry[] {
  if (events.length === 0) {
    return [{
      icon: Icons.users,
      body: <>Поки що жодної активності — додайте сервер або отримайте перший голос.</>,
      meta: '',
    }];
  }
  return events.map((event) => {
    const serverLink = event.serverId && event.serverName
      ? <Link href={`/servers/${event.serverId}`} style={{ color: 'var(--accent)' }}>{event.serverName}</Link>
      : null;
    let body: React.ReactNode;
    switch (event.kind) {
      case 'server_created':
        body = <>Додав сервер {serverLink} у моніторинг</>;
        break;
      case 'server_verified':
        body = <>Сервер {serverLink} пройшов верифікацію</>;
        break;
      case 'vote_received':
        body = <>Отримав голос від <b>{event.actor}</b> на сервері {serverLink}</>;
        break;
      case 'review_received':
        body = <>Отримав відгук <b>{event.rating}★</b> від <b>{event.actor}</b> на сервері {serverLink}</>;
        break;
      case 'profile_updated':
      default:
        body = <>Оновив свій профіль</>;
    }
    return {
      icon: ACTIVITY_ICONS[event.kind],
      body,
      meta: timeAgo(event.createdAt),
    };
  });
}

function buildHeader(user: AuthUser): ProfileHeaderData {
  const meta = user.user_metadata;
  return {
    fullName: meta.full_name || user.email.split('@')[0] || 'Без імені',
    handle: meta.profile_slug || 'user',
    bio: meta.bio || '',
    website: meta.website,
    telegram: meta.telegram,
    discord: meta.discord,
    location: meta.location || '',
    followers: 0,
    joinedAtIso: user.created_at,
    avatarUrl: meta.avatar_url,
    bannerUrl: meta.banner_url,
    role: meta.role || 'user',
    tags: [
      ...(String(meta.role || '').toUpperCase() === 'DESIGNER' ? ['DESIGNER'] : []),
      ...(meta.is_legacy ? ['OLD'] : []),
    ],
  };
}

export function ProfileClient({ user: initialUser, currentUser = null, serverCount, totalOnline, ownedServers, forumThreads = [], summary, badges = [], isPublicView = false }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser>(initialUser);
  // For public profile views, show the *logged-in viewer* in the sidebar (or null = guest).
  // For the personal profile (/profile), the profile owner IS the current user.
  const sidebarUser = isPublicView ? currentUser : user;
  const [tab, setTab] = useState<ProfileTabKey>('servers');
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const headerData = useMemo(() => buildHeader(user), [user]);
  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const karma = summary?.karma ?? 0;
  const votesReceived = summary?.votesReceived ?? 0;
  const reviewsReceived = summary?.reviewsReceived ?? 0;
  const activityEntries = useMemo(() => buildActivityEntries(summary?.activity ?? []), [summary?.activity]);

  const karmaTrend = karma > 0
    ? `${votesReceived} ${votesReceived === 1 ? 'голос' : votesReceived < 5 ? 'голоси' : 'голосів'} · ${reviewsReceived} ${reviewsReceived === 1 ? 'відгук' : reviewsReceived < 5 ? 'відгуки' : 'відгуків'}`
    : 'ще немає голосів';

  const stats: ProfileStat[] = [
    { label: 'Серверів',         value: String(serverCount),         trend: 'у моніторингу' },
    { label: 'Тем на форумі', value: String(forumThreads.length), trend: forumThreads.length ? 'активність спільноти' : 'почніть першу тему' },
    { label: 'Карма',            value: karma > 0 ? formatNumberUA(karma) : '—', trend: karmaTrend },
    { label: 'Загальний онлайн', value: formatNumberUA(totalOnline),  trend: 'на ваших серверах' },
  ];

  function handleSaved(updated: AuthUser) {
    setUser(updated);
    setToast({ type: 'success', message: 'Профіль збережено' });
    router.refresh();
  }

  return (
    <PageShell active={isPublicView ? '' : 'profile'} initialUser={sidebarUser}>
      <div className="page-main" style={{ padding: '24px 32px 60px' }}>
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={[
              { label: 'Акаунт', href: isPublicView ? '/' : '/dashboard' },
              { label: isPublicView ? headerData.fullName : 'Профіль' },
            ]} />
            <h1 className="page-title">{isPublicView ? 'Профіль користувача' : 'Мій профіль'}</h1>
          </div>
          <div className="profile-actions" style={{ marginLeft: 'auto' }}>
            {!isPublicView && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/profile/${headerData.handle}`
                    );
                  }
                }}
              >
                Поділитись
              </button>
            )}
            {!isPublicView && (
              <a className="btn btn-secondary" href={`/profile/${headerData.handle || 'user'}`} target="_blank" rel="noreferrer">
                Відкрити профіль
              </a>
            )}
            {!isPublicView && (
              <button className="btn btn-primary" type="button" onClick={() => setEditing(true)}>
                Редагувати
              </button>
            )}
          </div>
        </div>

        <ProfileHeader data={headerData} />

        <ProfileStats stats={stats} />

        <ProfileTabs
          tabs={[
            { key: 'servers',  label: 'Сервери',     count: serverCount },
            { key: 'forum', label: 'Форум', count: forumThreads.length },
            { key: 'activity', label: 'Активність',  count: summary?.activity.length ?? 0 },
            { key: 'badges',   label: 'Досягнення',  count: badges.filter((badge) => badge.earned).length },
          ]}
          active={tab}
          onChange={setTab}
        />

        <div key={tab} className="profile-tab-panel">
          {tab === 'servers' &&
            (ownedServers.length > 0 ? (
              <UserServersTab servers={ownedServers} isOwnerView={!isPublicView} />
            ) : (
              <EmptyState
                title="Ще немає серверів"
                hint="Додайте свій перший сервер у моніторинг — він зʼявиться тут."
              />
            ))}
          {tab === 'forum' && (
            <UserForumTab threads={forumThreads} />
          )}
          {tab === 'forum' === false && null}
          {tab === 'activity' && <UserActivityTab entries={activityEntries} />}
          {tab === 'badges' && <UserBadgesTab badges={badges} />}
        </div>
      </div>

      {!isPublicView && (
        <ProfileEditModal
          user={user}
          open={editing}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}
      {toast && (
        <div className={`site-toast site-toast-${toast.type}`} role="status" aria-live="polite">
          <span className="site-toast-icon" aria-hidden="true">
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          {toast.message}
        </div>
      )}
    </PageShell>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      style={{
        padding: '40px 24px',
        background: 'var(--bg-1)',
        border: '1px dashed var(--line-strong)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        color: 'var(--fg-2)',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{hint}</div>
    </div>
  );
}
