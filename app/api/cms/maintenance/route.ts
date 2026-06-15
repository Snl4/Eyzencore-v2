import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import { getMaintenanceSettings, updateMaintenanceSettings } from '@/lib/maintenance'

export async function GET() {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await getMaintenanceSettings())
}

export async function PATCH(request: Request) {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json() as {
    enabled?: boolean
    title?: string
    message?: string
  }
  return NextResponse.json(await updateMaintenanceSettings({
    enabled: Boolean(body.enabled),
    title: body.title,
    message: body.message,
  }))
}
