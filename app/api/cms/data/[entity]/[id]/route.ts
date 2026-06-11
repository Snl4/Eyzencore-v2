import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import {
  deleteCmsEntity,
  isCmsEntity,
  updateCmsEntity,
} from '@/lib/cms-db'

type Context = { params: { entity: string; id: string } }

export async function PATCH(request: Request, context: Context) {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isCmsEntity(context.params.entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const result = await updateCmsEntity(
      context.params.entity,
      context.params.id,
      body
    )
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 400 }
    )
  }
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentCmsUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isCmsEntity(context.params.entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 })
  }

  try {
    const result = await deleteCmsEntity(
      context.params.entity,
      context.params.id,
      user.id
    )
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 400 }
    )
  }
}
