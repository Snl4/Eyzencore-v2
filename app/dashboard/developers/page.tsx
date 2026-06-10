import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { listServers, listServersByOwner, resolveUserRole, listApiTokens } from '@/lib/auth-db'
import { getIntegrationEventsResponse, getIntegrationServerResponse } from '@/lib/integrations-api'
import { DeveloperHubClient } from './DeveloperHubClient'

interface DevelopersPageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Для розробників — Eyzencore',
  description: 'API інтеграції для Discord, Telegram, плагінів та власних серверів',
}

function resolveSelectedServerId(input: { availableIds: number[]; queryValue?: string | string[] }): number | null {
  const rawValue = Array.isArray(input.queryValue) ? input.queryValue[0] : input.queryValue
  const numericValue = Number(rawValue || '')
  if (Number.isFinite(numericValue) && input.availableIds.includes(numericValue)) {
    return numericValue
  }
  return input.availableIds[0] || null
}

export default async function DevelopersPage({ searchParams }: DevelopersPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  if (role !== 'OWNER' && role !== 'ADMIN') {
    redirect('/dashboard')
  }
  const servers = role === 'ADMIN' ? await listServers() : await listServersByOwner(user.id)
  const selectedServerId = resolveSelectedServerId({
    availableIds: servers.map((server) => server.seed),
    queryValue: searchParams?.serverId,
  })
  const initialTokens = await listApiTokens(user.id)

  if (!selectedServerId) {
    return (
      <>
        <div className="bg-aurora" />
        <DeveloperHubClient
          initialUser={user}
          role={role}
          serverOptions={[]}
          selectedServerId={null}
          serverPayload={null}
          eventsPayload={null}
          initialTokens={initialTokens}
        />
      </>
    )
  }
  const serverPayload = await getIntegrationServerResponse(String(selectedServerId))
  const eventsPayload = await getIntegrationEventsResponse({
    serverIdentifier: String(selectedServerId),
    limit: 20,
  })
  return (
    <>
      <div className="bg-aurora" />
      <DeveloperHubClient
        initialUser={user}
        role={role}
        serverOptions={servers.map((server) => ({
          id: server.seed,
          name: server.name,
          addr: server.addr,
        }))}
        selectedServerId={selectedServerId}
        serverPayload={serverPayload}
        eventsPayload={eventsPayload}
        initialTokens={initialTokens}
      />
    </>
  )
}
