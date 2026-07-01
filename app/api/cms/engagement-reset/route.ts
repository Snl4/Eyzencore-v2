import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import {
  executeEngagementReset,
  getEngagementResetPreview,
  listEngagementResetBatches,
} from '@/lib/engagement-reset'

const CONFIRM_PHRASE = 'СКИНУТИ'

export async function GET() {
  const user = await getCurrentCmsUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [preview, history] = await Promise.all([
    getEngagementResetPreview(),
    listEngagementResetBatches(),
  ])
  return NextResponse.json({ preview, history })
}

export async function POST(request: Request) {
  const user = await getCurrentCmsUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json() as { confirmPhrase?: string; label?: string }
  if (String(body.confirmPhrase || '').trim() !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Для підтвердження введіть ${CONFIRM_PHRASE}` },
      { status: 400 },
    )
  }
  try {
    const batch = await executeEngagementReset({
      performedByUserId: user.id,
      performedByEmail: user.email,
      label: body.label,
    })
    revalidatePath('/')
    revalidatePath('/servers/minecraft')
    revalidatePath('/servers/discord')
    const [preview, history] = await Promise.all([
      getEngagementResetPreview(),
      listEngagementResetBatches(),
    ])
    return NextResponse.json({ success: true, batch, preview, history })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося скинути статистику'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
