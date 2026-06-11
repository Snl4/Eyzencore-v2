import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/components/profile/ProfileClient';
import { listUserBadges } from '@/lib/achievements';
import { countServersByOwner, getUserProfileSummary, listServersByOwner } from '@/lib/auth-db';
import { getCurrentUser } from '@/lib/auth-server';
import { listForumThreadsByUser } from '@/lib/forum-db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Профіль',
  description: 'Особистий профіль користувача на платформі Eyzencore.',
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }

  const [serverCount, ownedServers, forumThreads, summary, badges] = await Promise.all([
    countServersByOwner(user.id),
    listServersByOwner(user.id),
    listForumThreadsByUser(user.id),
    getUserProfileSummary(user.id, 30),
    listUserBadges(user.id),
  ]);
  const totalOnline = ownedServers.reduce((sum, s) => sum + (s.on ? s.players : 0), 0);

  return (
    <>
      <div className="bg-aurora" />
      <ProfileClient
        user={user}
        serverCount={serverCount}
        totalOnline={totalOnline}
        summary={summary}
        forumThreads={forumThreads}
        badges={badges}
        ownedServers={ownedServers.map((s) => ({
          seed: s.seed,
          ic: s.ic,
          name: s.name,
          addr: s.addr,
          avatarUrl: s.avatarUrl,
          bannerUrl: s.bannerUrl,
          online: s.on,
          players: s.players,
          max: s.max,
          ver: s.ver,
          mode: s.mode,
          uptime: s.uptime,
        }))}
      />
    </>
  );
}
