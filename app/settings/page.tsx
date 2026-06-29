import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-server';
import { SettingsClient } from './SettingsClient';

import { PRIVATE_PAGE_ROBOTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Налаштування - Eyzencore',
  description: 'Керуйте обліковим записом Eyzencore та параметрами безпеки',
  robots: PRIVATE_PAGE_ROBOTS,
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <>
      <div className="bg-aurora" />
      <SettingsClient user={user} />
    </>
  );
}
