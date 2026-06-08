import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationTestResponse } from '@/lib/integrations-api'

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const body = (await request.json().catch(() => ({}))) as { channel?: string }
  const payload = getIntegrationTestResponse({
    serverIdentifier: context.params.id,
    channel: String(body.channel || ''),
  })
  if (!payload) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }
  return NextResponse.json(payload)
}
