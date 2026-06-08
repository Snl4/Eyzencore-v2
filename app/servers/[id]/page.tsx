import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerById } from '@/lib/auth-db';
import { getCurrentUser } from '@/lib/auth-server';
import { ServerOverviewClient } from './ServerOverviewClient';

interface Props {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const server = getServerById(Number(params.id));
  if (!server) return { title: 'Server not found' };

  return {
    title: `${server.name} - Eyzencore`,
    description: server.desc,
  };
}

export default function ServerPage({ params }: Props) {
  const server = getServerById(Number(params.id));
  const user = getCurrentUser();
  if (!server) notFound();

  return (
    <>
      <div className="bg-aurora" />
      <ServerOverviewClient server={server} canEdit={user?.id === server.ownerId} initialUser={user} />
    </>
  );
}
