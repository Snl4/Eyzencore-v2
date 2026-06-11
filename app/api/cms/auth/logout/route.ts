import { NextResponse } from 'next/server'
import { clearCmsSession } from '@/lib/cms-auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  await clearCmsSession(response)
  return response
}
