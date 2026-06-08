import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationServerResponse } from '@/lib/integrations-api'

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const payload = getIntegrationServerResponse(context.params.id)
  if (!payload) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }
  return NextResponse.json(payload)
}
