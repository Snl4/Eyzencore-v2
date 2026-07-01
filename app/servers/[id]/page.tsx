import { notFound, permanentRedirect } from 'next/navigation';
import { getServerById, listServers } from '@/lib/auth-db';
import { getCurrentUser } from '@/lib/auth-server';
import { getClusterForServer } from '@/lib/cluster-db';
import { breadcrumbJsonLd, buildServerMetadata, serverJsonLd } from '@/lib/seo';
import { buildServerPublicPath, buildServerPublicSlug, isMatchingServerSlug, parseServerIdFromPublicSlug } from '@/lib/server-slug';
import { ServerOverviewClient } from './ServerOverviewClient';

interface Props {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

async function getServerFromParam(value: string) {
  const serverId = parseServerIdFromPublicSlug(value);
  if (serverId) {
    return await getServerById(serverId);
  }
  const servers = await listServers();
  return servers.find((server) => isMatchingServerSlug({ name: server.name, slug: value })) || null;
}

export async function generateMetadata({ params }: Props) {
  const server = await getServerFromParam(params.id);
  if (!server) return { title: 'Server not found' };
  return buildServerMetadata(server);
}

export default async function ServerPage({ params }: Props) {
  const server = await getServerFromParam(params.id);
  if (!server) notFound();
  const canonicalSlug = buildServerPublicSlug(server);
  if (params.id !== canonicalSlug) {
    permanentRedirect(buildServerPublicPath(server));
  }
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
      { name: server.name, path: buildServerPublicPath(server) },
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
