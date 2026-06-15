import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import { getMaintenanceSettings } from '@/lib/maintenance'

export async function GET() {
  const [settings, cmsUser] = await Promise.all([
    getMaintenanceSettings(),
    getCurrentCmsUser(),
  ])
  return NextResponse.json({
    ...settings,
    adminAccess: Boolean(cmsUser),
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}
