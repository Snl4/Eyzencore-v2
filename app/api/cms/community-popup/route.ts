import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import { getCommunityPopupSettings, updateCommunityPopupSettings, type CommunityPopupFrequency, type CommunityPopupVariant } from '@/lib/community-popup'

export async function GET() {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await getCommunityPopupSettings())
}

export async function PATCH(request: Request) {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json() as {
    enabled?: boolean
    variant?: CommunityPopupVariant
    frequency?: CommunityPopupFrequency
    version?: string
    title?: string
    message?: string
    primaryLabel?: string
    primaryUrl?: string
    secondaryLabel?: string
    secondaryUrl?: string
  }
  return NextResponse.json(await updateCommunityPopupSettings(body))
}
