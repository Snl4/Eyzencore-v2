import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getServerById, resolveUserRole } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { buildServerDashboardSlug } from '@/lib/server-slug'

interface Props {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const server = getServerById(Number(params.id))
  if (!server) return { title: 'Дашборд серверу' }
  return { title: `Дашборд ${server.name} — Eyzencore` }
}

export default function ServerDashboardPage({ params }: Props) {
  const user = getCurrentUser()
  if (!user) redirect('/auth/login')
  const server = getServerById(Number(params.id))
  if (!server) notFound()
  const role = resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const isAdmin = role === 'ADMIN'
  if (!isAdmin && server.ownerId !== user.id) {
    redirect(`/servers/${server.seed}`)
  }
  redirect(`/dashboard/${buildServerDashboardSlug(server.name)}`)
}
