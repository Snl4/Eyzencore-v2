import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import { moderateCmsApplication } from '@/lib/cms-db'

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  try {
    return NextResponse.json(
      await moderateCmsApplication(
        context.params.id,
        action,
        String(body.reason || '')
      )
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 400 }
    )
  }
}
