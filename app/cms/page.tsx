import { redirect } from 'next/navigation'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import { getCmsStats } from '@/lib/cms-db'
import { CmsClient } from './CmsClient'
import { getMaintenanceSettings } from '@/lib/maintenance'

export default async function CmsPage() {
  const user = await getCurrentCmsUser()
  if (!user) {
    redirect('/cms/login')
  }

  const [initialStats, initialMaintenance] = await Promise.all([
    getCmsStats(),
    getMaintenanceSettings(),
  ])

  return (
    <>
      <div className="bg-aurora" />
      <CmsClient
        admin={{
          email: user.email,
          name: user.user_metadata.full_name || user.email,
        }}
        initialStats={initialStats}
        initialMaintenance={initialMaintenance}
      />
    </>
  )
}
