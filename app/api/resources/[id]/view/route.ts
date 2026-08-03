import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { buildActorFingerprint } from '@/lib/auth-db'
import { recordCommunityResourceView } from '@/lib/resources-db'
import { revalidatePublicResources } from '@/lib/public-cache'

type ResourceViewParams = {
  params: {
    id: string
  }
}

function parseResourceId(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || null
}

export async function POST(request: NextRequest, { params }: ResourceViewParams) {
  const resourceId = parseResourceId(params.id)
  if (!resourceId) {
    return NextResponse.json({ error: 'Некоректний ID ресурсу' }, { status: 400 })
  }

  try {
    const user = await getCurrentUser().catch(() => null)
    const ipAddress = getRequestIp(request)
    const userAgent = request.headers.get('user-agent') || null
    const result = await recordCommunityResourceView({
      resourceId,
      userId: user?.id || null,
      fingerprint: buildActorFingerprint({ ip: ipAddress, userAgent }),
      ipAddress,
      userAgent,
    })
    if (result.counted) {
      revalidatePublicResources('/resources')
    }
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося записати перегляд'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
