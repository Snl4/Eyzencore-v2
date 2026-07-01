import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { AddServerClient } from '@/app/add-server/AddServerClient'
import { getServerById, listServers } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { buildServerPublicPath, isMatchingServerSlug, parseServerIdFromPublicSlug } from '@/lib/server-slug'

interface Props {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

async function getServerFromParam(value: string) {
  const serverId = parseServerIdFromPublicSlug(value)
  if (serverId) {
    return await getServerById(serverId)
  }
  const servers = await listServers()
  return servers.find((server) => isMatchingServerSlug({ name: server.name, slug: value })) || null
}

export async function generateMetadata({ params }: Props) {
  const server = await getServerFromParam(params.id)
  if (!server) return { title: 'Server not found' }
  return { title: `Edit ${server.name} - Eyzencore`, description: `Edit server ${server.name}` }
}

export default async function EditServerPage({ params }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const server = await getServerFromParam(params.id)
  if (!server) notFound()
  if (server.ownerId !== user.id) {
    permanentRedirect(buildServerPublicPath(server))
  }
  return (
    <>
      <div className="bg-aurora" />
      <AddServerClient initialServer={server} initialUser={user} />
    </>
  )
}
