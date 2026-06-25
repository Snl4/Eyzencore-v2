import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getOrCreateVerificationToken, resolveUserRole } from '@/lib/auth-db'
import { buildServerDashboardSlug } from '@/lib/server-slug'
import { requireOwnedServerForDashboardRoute } from '@/lib/server-dashboard-access'
import { VerifyServerClient } from './VerifyServerClient'

interface VerifyServerPageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: VerifyServerPageProps) {
  const user = await getCurrentUser()
  if (!user) return { title: 'Верифікація сервера' }
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = await requireOwnedServerForDashboardRoute({
    routeId: params.id,
    userId: user.id,
    role,
  })
  if (!server) return { title: 'Сервер не знайдено' }
  return { title: `Верифікація - ${server.name}` }
}

export default async function VerifyServerPage({ params }: VerifyServerPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const server = await requireOwnedServerForDashboardRoute({
    routeId: params.id,
    userId: user.id,
    role,
  })
  if (!server) notFound()
  const slug = buildServerDashboardSlug(server.name)
  if (/^\d+$/.test(params.id)) {
    redirect(`/dashboard/servers/${slug}/verify`)
  }
  const verification = await getOrCreateVerificationToken(server.seed, user.id)
  return (
    <>
      <div className="bg-aurora" />
      <VerifyServerClient
        initialUser={user}
        role={role}
        dashboardSlug={slug}
        server={{
          id: server.seed,
          name: server.name,
          addr: server.addr,
          verified: Boolean(server.verified),
          platform: server.platform === 'discord' || server.core === 'discord' ? 'discord' : 'minecraft',
          discordVerifyCode: server.discordVerifyCode ?? null,
        }}
        initialToken={verification.token}
        initialVerifiedAt={verification.verifiedAt}
      />
    </>
  )
}
