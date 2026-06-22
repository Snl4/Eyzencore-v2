import { notFound } from 'next/navigation';
import { getServerById } from '@/lib/auth-db';
import { getCurrentUser } from '@/lib/auth-server';
import { getClusterForServer } from '@/lib/cluster-db';
import { breadcrumbJsonLd, buildServerMetadata, serverJsonLd } from '@/lib/seo';
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
  const platformName = server.platform === 'discord' || server.core === 'discord' ? 'Discord сервери' : 'Minecraft сервери';
  const platformPath = server.platform === 'discord' || server.core === 'discord' ? '/servers/discord' : '/servers/minecraft';
  const jsonLd = [
    serverJsonLd(server),
    breadcrumbJsonLd([
      { name: 'Eyzencore', path: '/' },
      { name: platformName, path: platformPath },
      { name: server.name, path: `/servers/${server.seed}` },
    ]),
  ];

  return (
    <>
      {jsonLd.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
      <div className="bg-aurora" />
      <ServerOverviewClient server={server} cluster={cluster} canEdit={user?.id === server.ownerId} initialUser={user} />
    </>
  );
}
