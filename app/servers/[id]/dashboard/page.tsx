import { notFound, redirect } from 'next/navigation'
import { getServerById, resolveUserRole } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { buildServerDashboardSlug, buildServerPublicPath } from '@/lib/server-slug'

interface Props {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props) {
  const server = await getServerById(Number(params.id))
  if (!server) return { title: 'Дашборд серверу' }
  return { title: `Дашборд ${server.name} — Eyzencore` }
}

export default async function ServerDashboardPage({ params }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  const server = await getServerById(Number(params.id))
  if (!server) notFound()
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const isAdmin = role === 'ADMIN'
  if (!isAdmin && server.ownerId !== user.id) {
    redirect(buildServerPublicPath(server))
  }
  redirect(`/dashboard/${buildServerDashboardSlug(server.name)}`)
}
