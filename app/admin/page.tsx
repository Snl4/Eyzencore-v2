import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, getAdminStats } from '@/lib/auth-db'
import { AdminClient } from './AdminClient'

export default function AdminPage() {
  const user = getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/')
  }
  const initialStats = getAdminStats()
  return (
    <>
      <div className="bg-aurora" />
      <AdminClient initialUser={user} initialStats={initialStats} />
    </>
  )
}
