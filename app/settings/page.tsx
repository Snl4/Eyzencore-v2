import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-server';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = {
  title: 'Налаштування - Eyzencore',
  description: 'Керуйте обліковим записом Eyzencore та параметрами безпеки',
};

export default function SettingsPage() {
  const user = getCurrentUser();

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
