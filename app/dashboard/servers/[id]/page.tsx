import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { listServersByOwner, resolveUserRole } from '@/lib/auth-db'
import { buildServerDashboardSlug } from '@/lib/server-slug'
import { buildDashboardHubOwnedServers } from '@/lib/server-dashboard-hub-data'
import { requireOwnedServerForDashboardRoute } from '@/lib/server-dashboard-access'
import { OwnerServerManageClient } from './OwnerServerManageClient'

interface OwnerServerManagePageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: OwnerServerManagePageProps) {
  const user = await getCurrentUser()
  if (!user) return { title: 'Керування сервером' }
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = await requireOwnedServerForDashboardRoute({
    routeId: params.id,
    userId: user.id,
    role,
  })
  if (!server) return { title: 'Сервер не знайдено' }
  return {
    title: `Керування ${server.name}`,
    description: `Керування сервером ${server.name} у dashboard Eyzencore`,
  }
}

export default async function OwnerServerManagePage({ params }: OwnerServerManagePageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = await requireOwnedServerForDashboardRoute({
    routeId: params.id,
    userId: user.id,
    role,
  })
  if (!server) notFound()
  const slug = buildServerDashboardSlug(server.name)
  const ownedServers = buildDashboardHubOwnedServers(await listServersByOwner(user.id))
  if (/^\d+$/.test(params.id)) {
    redirect(`/dashboard/servers/${slug}`)
  }
  return (
    <>
      <div className="bg-aurora" />
      <OwnerServerManageClient
        initialUser={user}
        role={role}
        serverId={server.seed}
        dashboardSlug={slug}
        ownedServers={ownedServers}
      />
    </>
  )
}
