import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getOrCreateVerificationToken, getServerById, resolveUserRole } from '@/lib/auth-db'
import { VerifyServerClient } from './VerifyServerClient'

interface VerifyServerPageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: VerifyServerPageProps): Promise<Metadata> {
  const server = getServerById(Number(params.id))
  if (!server) return { title: 'Server not found' }
  return { title: `Верифікація — ${server.name}` }
}

export default function VerifyServerPage({ params }: VerifyServerPageProps) {
  const user = getCurrentUser()
  if (!user) redirect('/auth/login')
  const server = getServerById(Number(params.id))
  if (!server) notFound()
  const role = resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  if (server.ownerId !== user.id && role !== 'ADMIN') {
    redirect(`/dashboard/servers/${server.seed}`)
  }
  const verification = getOrCreateVerificationToken(server.seed, user.id)
  return (
    <>
      <div className="bg-aurora" />
      <VerifyServerClient
        initialUser={user}
        role={role}
        server={{ id: server.seed, name: server.name, addr: server.addr, verified: server.verified === 1 }}
        initialToken={verification.token}
        initialVerifiedAt={verification.verifiedAt}
      />
    </>
  )
}
