import { notFound, redirect } from 'next/navigation'
import { AddServerClient } from '@/app/add-server/AddServerClient'
import { resolveUserRole } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { buildServerDashboardSlug } from '@/lib/server-slug'
import { requireOwnedServerForDashboardRoute } from '@/lib/server-dashboard-access'

interface DashboardEditServerPageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: DashboardEditServerPageProps) {
  const user = await getCurrentUser()
  if (!user) return { title: 'Редагування сервера' }
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = await requireOwnedServerForDashboardRoute({
    routeId: params.id,
    userId: user.id,
    role,
  })
  if (!server) return { title: 'Сервер не знайдено' }
  return { title: `Редагування ${server.name}`, description: `Редагування сервера ${server.name}` }
}

export default async function DashboardEditServerPage({ params }: DashboardEditServerPageProps) {
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
  if (/^\d+$/.test(params.id)) {
    redirect(`/dashboard/servers/${slug}/edit`)
  }
  return (
    <>
      <div className="bg-aurora" />
      <AddServerClient
        initialServer={server}
        initialUser={user}
        sidebarRole={role}
        activeSection="dashboard"
        dashboardSlug={slug}
      />
    </>
  )
}
