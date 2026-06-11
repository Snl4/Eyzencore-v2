import { notFound } from 'next/navigation';
import { getServerById } from '@/lib/auth-db';
import { getCurrentUser } from '@/lib/auth-server';
import { getClusterForServer } from '@/lib/cluster-db';
import { ServerOverviewClient } from './ServerOverviewClient';

interface Props {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const server = await getServerById(Number(params.id));
  if (!server) return { title: 'Server not found' };

  return {
    title: `${server.name} - Eyzencore`,
    description: server.desc,
  };
}

export default async function ServerPage({ params }: Props) {
  const server = await getServerById(Number(params.id));
  if (!server) notFound();
  const [user, cluster] = await Promise.all([
    getCurrentUser(),
    getClusterForServer(server.seed),
  ]);

  return (
    <>
      <div className="bg-aurora" />
      <ServerOverviewClient server={server} cluster={cluster} canEdit={user?.id === server.ownerId} initialUser={user} />
    </>
  );
}
