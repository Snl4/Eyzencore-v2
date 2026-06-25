import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { listProjectsByOwner, resolveUserRole } from '@/lib/auth-db'
import { ProjectsClient } from './ProjectsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Мої проекти - Eyzencore',
  description: 'Керуйте своїми проектами та групуйте сервери',
}

export default async function ProjectsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  const role = await resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const initialProjects = await listProjectsByOwner(user.id)
  return (
    <>
      <div className="bg-aurora" />
      <ProjectsClient initialUser={user} role={role} initialProjects={initialProjects} />
    </>
  )
}
