import type { UserRole } from '@/lib/auth-db'
import { getServerById, listServers, listServersByOwner } from '@/lib/auth-db'
import type { Server } from '@/lib/types'
import { isMatchingServerSlug } from '@/lib/server-slug'

export async function findServerForDashboardRoute(input: {
  routeId: string
  userId?: string
  isAdmin?: boolean
}): Promise<Server | null> {
  const raw = String(input.routeId || '').trim()
  if (!raw) return null
  if (/^\d+$/.test(raw)) {
    return getServerById(Number(raw))
  }
  if (input.userId) {
    const ownedServers = await listServersByOwner(input.userId)
    const ownedMatch = ownedServers.find((server) => isMatchingServerSlug({ name: server.name, slug: raw }))
    if (ownedMatch) return ownedMatch
  }
  if (input.isAdmin) {
    const allServers = await listServers()
    return allServers.find((server) => isMatchingServerSlug({ name: server.name, slug: raw })) || null
  }
  return null
}

export async function requireOwnedServerForDashboardRoute(input: {
  routeId: string
  userId: string
  role: UserRole
}): Promise<Server | null> {
  const server = await findServerForDashboardRoute({
    routeId: input.routeId,
    userId: input.userId,
    isAdmin: input.role === 'ADMIN',
  })
  if (!server) return null
  if (input.role !== 'ADMIN' && server.ownerId !== input.userId) return null
  return server
}
