import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { parseResourceIdFromSlug } from '@/lib/resource-slug'
import { getCommunityResourceById, getCommunityResourceBySlug, listCommunityResources } from '@/lib/resources-db'
import { ResourceEditorClient } from '../../new/ResourceEditorClient'

export const dynamic = 'force-dynamic'

type EditResourcePageProps = {
  params: {
    slug: string
  }
}

async function getResourceFromParam(value: string) {
  const byId = parseResourceIdFromSlug(value)
  if (byId) return getCommunityResourceById(byId, true)
  const bySlug = await getCommunityResourceBySlug(value, true)
  if (bySlug) return bySlug
  const resources = await listCommunityResources({ includeDrafts: true, limit: 200 })
  return resources.find((resource) => resource.slug === value) || null
}

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const [user, resource] = await Promise.all([
    getCurrentUser(),
    getResourceFromParam(params.slug),
  ])
  if (!user) redirect('/login')
  if (!resource) notFound()
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  if (role !== 'ADMIN' && user.email !== ADMIN_EMAIL) redirect('/resources')
  return (
    <>
      <div className="bg-aurora" />
      <ResourceEditorClient initialUser={user} initialResource={resource} />
    </>
  )
}
