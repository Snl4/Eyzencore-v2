import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AddServerClient } from '@/app/add-server/AddServerClient'
import { getServerById } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'

interface Props {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const server = getServerById(Number(params.id))
  if (!server) return { title: 'Server not found' }
  return { title: `Edit ${server.name} - Eyzencore`, description: `Edit server ${server.name}` }
}

export default function EditServerPage({ params }: Props) {
  const user = getCurrentUser()
  if (!user) redirect('/auth/login')
  const server = getServerById(Number(params.id))
  if (!server) notFound()
  if (server.ownerId !== user.id) {
    redirect(`/servers/${server.seed}`)
  }
  return (
    <>
      <div className="bg-aurora" />
      <AddServerClient initialServer={server} initialUser={user} />
    </>
  )
}
