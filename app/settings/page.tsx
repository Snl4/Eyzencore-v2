import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-server';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = {
  title: 'Налаштування - Eyzencore',
  description: 'Керуйте обліковим записом Eyzencore та параметрами безпеки',
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
