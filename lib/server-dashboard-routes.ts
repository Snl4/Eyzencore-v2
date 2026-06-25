import type { Server } from '@/lib/types'
import { buildServerDashboardSlug } from '@/lib/server-slug'

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
