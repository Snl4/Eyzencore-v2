import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import { getCmsStats } from '@/lib/cms-db'

export async function GET() {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await getCmsStats())
}
