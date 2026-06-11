import { prisma } from '@/lib/prisma'

export type ClusterServer = {
  id: number
  name: string
  platform: 'minecraft' | 'discord'
  addr: string
  avatarUrl: string | null
  online: boolean
  players: number
  max: number
}

export type Cluster = {
  id: number
  ownerId: string
  name: string
  slug: string
  description: string
  logoUrl: string | null
  bannerUrl: string | null
  website: string | null
  discord: string | null
  createdAt: string
  updatedAt: string
  servers: ClusterServer[]
  serverCount: number
}

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'cluster'

async function uniqueClusterSlug(name: string, excludedId?: number) {
  const base = normalizeSlug(name)
  let slug = base
  let suffix = 2
  while (
    await prisma.app_clusters.findFirst({
      where: { slug, ...(excludedId ? { NOT: { id: excludedId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix++}`
  }
  return slug
}

function mapCluster(row: {
  id: number
  owner_id: string
  name: string
  slug: string
  description: string
  logo_url: string | null
  banner_url: string | null
  website: string | null
  discord: string | null
  created_at: string
  updated_at: string
  app_servers: Array<{
    id: number
    name: string
    platform: string
    addr: string
    avatar_url: string | null
    online: number
    players: number
    max: number
  }>
}): Cluster {
  const servers = row.app_servers.map((server) => ({
    id: server.id,
    name: server.name,
    platform: server.platform === 'discord' ? 'discord' as const : 'minecraft' as const,
    addr: server.addr,
    avatarUrl: server.avatar_url,
    online: Boolean(server.online),
    players: Number(server.players || 0),
    max: Number(server.max || 0),
  }))
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    website: row.website,
    discord: row.discord,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    servers,
    serverCount: servers.length,
  }
}

const clusterInclude = {
  app_servers: {
    orderBy: { id: 'asc' as const },
    select: {
      id: true,
      name: true,
      platform: true,
      addr: true,
      avatar_url: true,
      online: true,
      players: true,
      max: true,
    },
  },
}

export async function listClustersByOwner(ownerId: string) {
  const rows = await prisma.app_clusters.findMany({
    where: { owner_id: ownerId },
    include: clusterInclude,
    orderBy: { created_at: 'desc' },
  })
  return rows.map(mapCluster)
}

export async function getClusterById(id: number) {
  const row = await prisma.app_clusters.findUnique({ where: { id }, include: clusterInclude })
  return row ? mapCluster(row) : null
}

export async function getClusterForServer(serverId: number) {
  const server = await prisma.app_servers.findUnique({
    where: { id: serverId },
    select: { cluster_id: true },
  })
  if (!server?.cluster_id) return null
  return getClusterById(server.cluster_id)
}

async function validateOwnedServers(ownerId: string, serverIds: number[]) {
  const ids = Array.from(new Set(serverIds.filter(Number.isInteger)))
  const count = await prisma.app_servers.count({ where: { id: { in: ids }, owner_id: ownerId } })
  if (count !== ids.length) throw new Error('Один або кілька серверів не належать вам')
  return ids
}

export async function createCluster(input: {
  ownerId: string
  name: string
  description?: string
  logoUrl?: string | null
  bannerUrl?: string | null
  website?: string | null
  discord?: string | null
  serverIds?: number[]
}) {
  const serverIds = await validateOwnedServers(input.ownerId, input.serverIds || [])
  const now = new Date().toISOString()
  const slug = await uniqueClusterSlug(input.name)
  const row = await prisma.$transaction(async (tx) => {
    const cluster = await tx.app_clusters.create({
      data: {
        owner_id: input.ownerId,
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || '',
        logo_url: input.logoUrl || null,
        banner_url: input.bannerUrl || null,
        website: input.website || null,
        discord: input.discord || null,
        created_at: now,
        updated_at: now,
      },
    })
    if (serverIds.length) {
      await tx.app_servers.updateMany({
        where: { id: { in: serverIds }, owner_id: input.ownerId },
        data: { cluster_id: cluster.id },
      })
    }
    return tx.app_clusters.findUniqueOrThrow({ where: { id: cluster.id }, include: clusterInclude })
  })
  return mapCluster(row)
}

export async function updateCluster(input: {
  id: number
  ownerId: string
  name: string
  description?: string
  logoUrl?: string | null
  bannerUrl?: string | null
  website?: string | null
  discord?: string | null
  serverIds?: number[]
}) {
  const existing = await prisma.app_clusters.findFirst({ where: { id: input.id, owner_id: input.ownerId } })
  if (!existing) throw new Error('Кластер не знайдено')
  const serverIds = await validateOwnedServers(input.ownerId, input.serverIds || [])
  const slug = existing.name === input.name.trim() ? existing.slug : await uniqueClusterSlug(input.name, input.id)
  const row = await prisma.$transaction(async (tx) => {
    await tx.app_servers.updateMany({
      where: { cluster_id: input.id, owner_id: input.ownerId },
      data: { cluster_id: null },
    })
    if (serverIds.length) {
      await tx.app_servers.updateMany({
        where: { id: { in: serverIds }, owner_id: input.ownerId },
        data: { cluster_id: input.id },
      })
    }
    return tx.app_clusters.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || '',
        logo_url: input.logoUrl || null,
        banner_url: input.bannerUrl || null,
        website: input.website || null,
        discord: input.discord || null,
        updated_at: new Date().toISOString(),
      },
      include: clusterInclude,
    })
  })
  return mapCluster(row)
}

export async function deleteCluster(id: number, ownerId: string) {
  const result = await prisma.app_clusters.deleteMany({ where: { id, owner_id: ownerId } })
  if (!result.count) throw new Error('Кластер не знайдено')
}
