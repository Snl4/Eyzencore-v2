import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationEventsResponse } from '@/lib/integrations-api'

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const limit = Number(request.nextUrl.searchParams.get('limit') || 20)
  const payload = getIntegrationEventsResponse({
    serverIdentifier: context.params.id,
    limit,
  })
  if (!payload) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }
  return NextResponse.json(payload)
}
