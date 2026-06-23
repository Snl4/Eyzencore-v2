import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { listApiTokens, listServersByOwner, resolveUserRole } from '@/lib/auth-db'
import { DeveloperHubClient } from './DeveloperHubClient'

interface DevelopersPageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Зовнішній API — Eyzencore',
  description: 'Захищений API рейтингу, голосів, вподобайок та відгуків сервера',
}

function resolveSelectedServerId(availableIds: number[], queryValue?: string | string[]) {
  const rawValue = Array.isArray(queryValue) ? queryValue[0] : queryValue
  const numericValue = Number(rawValue || '')
  return Number.isFinite(numericValue) && availableIds.includes(numericValue)
    ? numericValue
    : availableIds[0] || null
}

export default async function DevelopersPage({ searchParams }: DevelopersPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const servers = await listServersByOwner(user.id)
  const canUseDeveloperTools = role === 'OWNER' || role === 'ADMIN' || servers.length > 0
  if (!canUseDeveloperTools) redirect('/dashboard')
  const selectedServerId = resolveSelectedServerId(servers.map((server) => server.seed), searchParams?.serverId)
  const initialTokens = selectedServerId ? await listApiTokens(user.id, selectedServerId) : []

  return (
    <>
      <div className="bg-aurora" />
      <DeveloperHubClient
        initialUser={user}
        serverOptions={servers.map((server) => ({ id: server.seed, name: server.name, addr: server.addr }))}
        selectedServerId={selectedServerId}
        initialTokens={initialTokens}
      />
    </>
  )
}
