import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/components/profile/ProfileClient';
import { countServersByOwner, getUserProfileSummary, listServersByOwner } from '@/lib/auth-db';
import { getCurrentUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Профіль',
  description: 'Особистий профіль користувача на платформі Eyzencore.',
};

export default function ProfilePage() {
  const user = getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }

  const serverCount = countServersByOwner(user.id);
  const ownedServers = listServersByOwner(user.id);
  const totalOnline = ownedServers.reduce((sum, s) => sum + (s.on ? s.players : 0), 0);
  const summary = getUserProfileSummary(user.id, 30);

  return (
    <>
      <div className="bg-aurora" />
      <ProfileClient
        user={user}
        serverCount={serverCount}
        totalOnline={totalOnline}
        summary={summary}
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
