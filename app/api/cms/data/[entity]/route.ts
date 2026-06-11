import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import { createCmsEntity, isCmsEntity, listCmsEntity } from '@/lib/cms-db'

export async function GET(
  _request: Request,
  context: { params: { entity: string } }
) {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isCmsEntity(context.params.entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 })
  }

  try {
    return NextResponse.json(await listCmsEntity(context.params.entity))
  } catch (error) {
    console.error(`CMS list failed for ${context.params.entity}:`, error)
    return NextResponse.json(
      { error: 'Не вдалося завантажити дані CMS' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: { entity: string } }
) {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isCmsEntity(context.params.entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const result = await createCmsEntity(context.params.entity, body)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create failed' },
      { status: 400 }
    )
  }
}
