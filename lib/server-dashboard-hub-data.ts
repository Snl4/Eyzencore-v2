import type { Server } from '@/lib/types'

export type DashboardHubOwnedServer = {
  seed: number
  name: string
  addr: string
  ic?: string
  avatarUrl?: string | null
}

export function buildDashboardHubOwnedServers(
  servers: Array<Pick<Server, 'seed' | 'name' | 'addr' | 'ic' | 'avatarUrl'>>,
): DashboardHubOwnedServer[] {
  return servers.map((server) => ({
    seed: server.seed,
    name: server.name,
    addr: server.addr,
    ic: server.ic,
    avatarUrl: server.avatarUrl ?? null,
  }))
}
