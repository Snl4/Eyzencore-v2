import { NextResponse } from 'next/server'
import { getCommunityPopupSettings } from '@/lib/community-popup'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await getCommunityPopupSettings()
  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
