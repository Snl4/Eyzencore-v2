import type { UserRole } from '@/lib/auth-db'
import { getServerById, listServers, listServersByOwner } from '@/lib/auth-db'
import type { Server } from '@/lib/types'
import { buildServerDashboardSlug, isMatchingServerSlug } from '@/lib/server-slug'

export type ServerDashboardTab = 'analytics' | 'manage' | 'verify' | 'edit'

export function buildServerDashboardTabPath(slug: string, tab: ServerDashboardTab): string {
  const normalizedSlug = buildServerDashboardSlug(slug)
  if (tab === 'analytics') return `/dashboard/${normalizedSlug}`
  if (tab === 'manage') return `/dashboard/servers/${normalizedSlug}`
  if (tab === 'verify') return `/dashboard/servers/${normalizedSlug}/verify`
  return `/dashboard/servers/${normalizedSlug}/edit`
}

export function buildServerAnalyticsPath(server: Pick<Server, 'name'>): string {
  return buildServerDashboardTabPath(server.name, 'analytics')
}
export function buildServerManagePath(server: Pick<Server, 'name'>): string {
  return buildServerDashboardTabPath(server.name, 'manage')
}

export function buildServerVerifyPath(server: Pick<Server, 'name'>): string {
  return buildServerDashboardTabPath(server.name, 'verify')
}

export function buildServerEditPath(server: Pick<Server, 'name'>): string {
  return buildServerDashboardTabPath(server.name, 'edit')
}
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
