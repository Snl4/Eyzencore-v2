import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-server';
import { AddServerClient } from './AddServerClient';

export const metadata: Metadata = {
  title: 'Add server - Eyzencore',
  description: 'Submit your Minecraft server to Eyzencore',
};

export default async function AddServerPage({
  searchParams,
}: {
  searchParams?: { platform?: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  const defaultPlatform = searchParams?.platform === 'discord' ? 'discord' : 'minecraft';

  return (
    <>
      <div className="bg-aurora" />
      <AddServerClient initialUser={user} defaultPlatform={defaultPlatform} />
    </>
  );
}
