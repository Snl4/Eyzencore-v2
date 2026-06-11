import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { listServersByOwner, resolveUserRole } from '@/lib/auth-db'
import { listClustersByOwner } from '@/lib/cluster-db'
import { ClustersClient } from './ClustersClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Кластери серверів - Eyzencore',
  description: 'Об’єднуйте Minecraft і Discord сервери у спільні кластери',
}

export default async function ClustersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  const [clusters, servers, role] = await Promise.all([
    listClustersByOwner(user.id),
    listServersByOwner(user.id),
    resolveUserRole({ userId: user.id, role: user.user_metadata.role }),
  ])
  return (
    <>
      <div className="bg-aurora" />
      <ClustersClient initialUser={user} role={role} initialClusters={clusters} servers={servers} />
    </>
  )
}
