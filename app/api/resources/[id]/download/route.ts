import { NextResponse } from 'next/server'
import { incrementCommunityResourceDownloads } from '@/lib/resources-db'
import { revalidatePublicResources } from '@/lib/public-cache'

type ResourceDownloadParams = {
  params: {
    id: string
  }
}

function parseResourceId(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function POST(_request: Request, { params }: ResourceDownloadParams) {
  const resourceId = parseResourceId(params.id)
  if (!resourceId) {
    return NextResponse.json({ error: 'Некоректний ID ресурсу' }, { status: 400 })
  }

  try {
    const result = await incrementCommunityResourceDownloads(resourceId)
    revalidatePublicResources('/resources')
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося записати завантаження'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
