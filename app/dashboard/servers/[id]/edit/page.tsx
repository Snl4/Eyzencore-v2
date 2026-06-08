import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AddServerClient } from '@/app/add-server/AddServerClient'
import { getServerById, resolveUserRole } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'

interface DashboardEditServerPageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: DashboardEditServerPageProps): Promise<Metadata> {
  const server = getServerById(Number(params.id))
  if (!server) return { title: 'Server not found' }
  return { title: `Edit ${server.name} - Dashboard`, description: `Edit server ${server.name} from dashboard` }
}

export default function DashboardEditServerPage({ params }: DashboardEditServerPageProps) {
  const user = getCurrentUser()
  if (!user) redirect('/auth/login')
  const server = getServerById(Number(params.id))
  if (!server) notFound()
  const role = resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  if (server.ownerId !== user.id && role !== 'ADMIN') {
    redirect(`/dashboard/servers/${server.seed}`)
  }
  return (
    <>
      <div className="bg-aurora" />
      <AddServerClient initialServer={server} initialUser={user} sidebarRole={role} activeSection="my-servers" />
    </>
  )
}
