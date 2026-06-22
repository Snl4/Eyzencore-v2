import { notFound, redirect } from 'next/navigation'
import { AddServerClient } from '@/app/add-server/AddServerClient'
import { getServerById } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { buildServerPublicPath } from '@/lib/server-slug'

interface Props {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props) {
  const server = await getServerById(Number(params.id))
  if (!server) return { title: 'Server not found' }
  return { title: `Edit ${server.name} - Eyzencore`, description: `Edit server ${server.name}` }
}

export default async function EditServerPage({ params }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  const server = await getServerById(Number(params.id))
  if (!server) notFound()
  if (server.ownerId !== user.id) {
    redirect(buildServerPublicPath(server))
  }
  return (
    <>
      <div className="bg-aurora" />
      <AddServerClient initialServer={server} initialUser={user} />
    </>
  )
}
