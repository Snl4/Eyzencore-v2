import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getServerById, listServers, listServersByOwner, resolveUserRole } from '@/lib/auth-db'
import { buildServerDashboardSlug, isMatchingServerSlug } from '@/lib/server-slug'
import { OwnerServerManageClient } from './OwnerServerManageClient'

interface OwnerServerManagePageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

async function findManageServer(input: { value: string; userId?: string; isAdmin?: boolean }) {
  const raw = String(input.value || '').trim()
  if (/^\d+$/.test(raw)) {
    return getServerById(Number(raw))
  }
  if (input.userId) {
    const owned = await listServersByOwner(input.userId)
    const match = owned.find((server) => isMatchingServerSlug({ name: server.name, slug: raw }))
    if (match) return match
  }
  if (input.isAdmin) {
    const all = await listServers()
    return all.find((server) => isMatchingServerSlug({ name: server.name, slug: raw })) || null
  }
  return null
}

export async function generateMetadata({ params }: OwnerServerManagePageProps) {
  const server = await findManageServer({ value: params.id, isAdmin: true })
  if (!server) {
    return { title: 'Server not found' }
  }
  return {
    title: `${server.name} Dashboard`,
    description: `Manage ${server.name} from the owner dashboard`,
  }
}

export default async function OwnerServerManagePage({ params }: OwnerServerManagePageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = await findManageServer({ value: params.id, userId: user.id, isAdmin: role === 'ADMIN' })
  if (!server) {
    notFound()
  }
  const canManage = role === 'ADMIN' || server.ownerId === user.id
  if (!canManage) {
    redirect('/dashboard')
  }
  if (/^\d+$/.test(params.id)) {
    redirect(`/dashboard/servers/${buildServerDashboardSlug(server.name)}`)
  }
  return (
    <>
      <div className="bg-aurora" />
      <OwnerServerManageClient initialUser={user} role={role} serverId={server.seed} />
    </>
  )
}
