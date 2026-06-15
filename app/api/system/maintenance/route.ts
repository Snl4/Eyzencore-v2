import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import { getCurrentUser } from '@/lib/auth-server'
import { getMaintenanceSettings } from '@/lib/maintenance'

export async function GET() {
  const [settings, cmsUser, user] = await Promise.all([
    getMaintenanceSettings(),
    getCurrentCmsUser(),
    getCurrentUser(),
  ])
  return NextResponse.json({
    ...settings,
    adminAccess: Boolean(
      cmsUser ||
      user?.user_metadata.role === 'ADMIN'
    ),
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}
