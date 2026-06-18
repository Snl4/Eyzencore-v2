import { notFound } from 'next/navigation';
import { getServerById } from '@/lib/auth-db';
import { getCurrentUser } from '@/lib/auth-server';
import { getClusterForServer } from '@/lib/cluster-db';
import { buildServerMetadata, serverJsonLd } from '@/lib/seo';
import { ServerOverviewClient } from './ServerOverviewClient';

interface Props {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const server = await getServerById(Number(params.id));
  if (!server) return { title: 'Server not found' };
  return buildServerMetadata(server);
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serverJsonLd(server)) }}
      />
      <div className="bg-aurora" />
      <ServerOverviewClient server={server} cluster={cluster} canEdit={user?.id === server.ownerId} initialUser={user} />
    </>
  );
}
