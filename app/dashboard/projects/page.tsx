import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { listProjectsByOwner, resolveUserRole } from '@/lib/auth-db'
import { ProjectsClient } from './ProjectsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Мої проекти — Eyzencore',
  description: 'Керуйте своїми проектами та групуйте сервери',
}

export default function ProjectsPage() {
  const user = getCurrentUser()
  if (!user) redirect('/auth/login')
  const role = resolveUserRole({ userId: user.id, role: user.user_metadata.role })
  const initialProjects = listProjectsByOwner(user.id)
  return (
    <>
      <div className="bg-aurora" />
      <ProjectsClient initialUser={user} role={role} initialProjects={initialProjects} />
    </>
  )
}
