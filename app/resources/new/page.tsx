import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { ResourceEditorClient } from './ResourceEditorClient'

export const dynamic = 'force-dynamic'

export default async function NewResourcePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  if (role !== 'ADMIN' && user.email !== ADMIN_EMAIL) redirect('/resources')
  return (
    <>
      <div className="bg-aurora" />
      <ResourceEditorClient initialUser={user} />
    </>
  )
}
