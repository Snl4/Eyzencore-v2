import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getServerById, resolveUserRole } from '@/lib/auth-db'
import { OwnerServerManageClient } from './OwnerServerManageClient'

interface OwnerServerManagePageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: OwnerServerManagePageProps): Promise<Metadata> {
  const server = getServerById(Number(params.id))
  if (!server) {
    return { title: 'Server not found' }
  }
  return {
    title: `${server.name} Dashboard`,
    description: `Manage ${server.name} from the owner dashboard`,
  }
}

export default function OwnerServerManagePage({ params }: OwnerServerManagePageProps) {
  const user = getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  const server = getServerById(Number(params.id))
  if (!server) {
    notFound()
  }
  const role = resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const canManage = role === 'ADMIN' || server.ownerId === user.id
  if (!canManage) {
    redirect('/dashboard')
  }
  return (
    <>
      <div className="bg-aurora" />
      <OwnerServerManageClient initialUser={user} role={role} serverId={server.seed} />
    </>
  )
}
