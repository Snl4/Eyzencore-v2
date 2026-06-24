import { notFound, redirect } from 'next/navigation'
import { DashboardClient } from '@/app/servers/[id]/dashboard/DashboardClient'
import type { UserRole } from '@/lib/auth-db'
import { getServerDashboardSnapshot, listServers, listServersByOwner, resolveUserRole } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { isMatchingServerSlug } from '@/lib/server-slug'

interface DashboardBySlugPageProps {
  params: { serverSlug: string }
}

export const dynamic = 'force-dynamic'

async function findServerForUser(input: { userId: string; role: UserRole; serverSlug: string }) {
  const ownedServers = await listServersByOwner(input.userId)
  const fromOwned = ownedServers.find((server) => isMatchingServerSlug({ name: server.name, slug: input.serverSlug }))
  if (fromOwned) {
    return fromOwned
  }
  if (input.role === 'ADMIN') {
    const allServers = await listServers()
    return allServers.find((server) => isMatchingServerSlug({ name: server.name, slug: input.serverSlug })) || null
  }
  return null
}

export async function generateMetadata({ params }: DashboardBySlugPageProps) {
  const user = await getCurrentUser()
  if (!user) return { title: 'Дашборд серверу' }
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = await findServerForUser({ userId: user.id, role, serverSlug: params.serverSlug })
  if (!server) return { title: 'Дашборд серверу' }
  return { title: `Дашборд ${server.name} — Eyzencore` }
}

export default async function DashboardBySlugPage({ params }: DashboardBySlugPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = await findServerForUser({ userId: user.id, role, serverSlug: params.serverSlug })
  if (!server) notFound()
  const snapshot = await getServerDashboardSnapshot({ serverId: server.seed, userId: user.id, isAdmin: role === 'ADMIN', range: '7d' })
  return (
    <>
      <div className="bg-aurora" />
      <DashboardClient
        initialUser={user}
        server={{
          seed: server.seed,
          name: server.name,
          addr: server.addr,
          ic: server.ic,
          avatarUrl: server.avatarUrl,
        }}
        initialSnapshot={snapshot}
      />
    </>
  )
}
