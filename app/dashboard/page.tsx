import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { listServersByOwner, resolveUserRole } from '@/lib/auth-db'
import { buildServerDashboardSlug } from '@/lib/server-slug'
import { DashboardClient } from './DashboardClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Дашборд — Eyzencore',
  description: 'Role-based dashboard for users and server owners',
}

export default async function DashboardPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  const owned = await listServersByOwner(user.id)
  const canUseOwnerDashboard = role === 'ADMIN' || owned.length > 0
  if (!canUseOwnerDashboard) {
    redirect('/')
  }
  // Owners and admins land on the per-server dashboard for their first server.
  // ?tab=servers escapes the redirect (used by sidebar "My Servers" link).
  if (canUseOwnerDashboard) {
    const escape = String(searchParams?.tab || '')
    if (escape !== 'servers' && owned.length > 0) {
      redirect(`/dashboard/${buildServerDashboardSlug(owned[0].name)}`)
    }
  }
  const dashboardRole = role === 'ADMIN' ? 'ADMIN' : 'OWNER'
  return (
    <>
      <div className="bg-aurora" />
      <DashboardClient initialUser={user} initialRole={dashboardRole} />
    </>
  )
}
