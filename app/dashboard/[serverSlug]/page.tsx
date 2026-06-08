import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { DashboardClient } from '@/app/servers/[id]/dashboard/DashboardClient'
import { getServerDashboardSnapshot, listServers, listServersByOwner, resolveUserRole } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'
import { isMatchingServerSlug } from '@/lib/server-slug'

interface DashboardBySlugPageProps {
  params: { serverSlug: string }
}

export const dynamic = 'force-dynamic'

function findServerForUser(input: { userId: string; role: 'USER' | 'OWNER' | 'ADMIN'; serverSlug: string }) {
  const ownedServers = listServersByOwner(input.userId)
  const fromOwned = ownedServers.find((server) => isMatchingServerSlug({ name: server.name, slug: input.serverSlug }))
  if (fromOwned) {
    return fromOwned
  }
  if (input.role === 'ADMIN') {
    const allServers = listServers()
    return allServers.find((server) => isMatchingServerSlug({ name: server.name, slug: input.serverSlug })) || null
  }
  return null
}

export async function generateMetadata({ params }: DashboardBySlugPageProps): Promise<Metadata> {
  const user = getCurrentUser()
  if (!user) return { title: 'Дашборд серверу' }
  const role = resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = findServerForUser({ userId: user.id, role, serverSlug: params.serverSlug })
  if (!server) return { title: 'Дашборд серверу' }
  return { title: `Дашборд ${server.name} — Eyzencore` }
}

export default function DashboardBySlugPage({ params }: DashboardBySlugPageProps) {
  const user = getCurrentUser()
  if (!user) redirect('/auth/login')
  const role = resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = findServerForUser({ userId: user.id, role, serverSlug: params.serverSlug })
  if (!server) notFound()
  const snapshot = getServerDashboardSnapshot({ serverId: server.seed, userId: user.id, isAdmin: role === 'ADMIN', range: '7d' })
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
