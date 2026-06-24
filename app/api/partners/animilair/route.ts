import { NextResponse } from 'next/server'
import { getAnimilairCatalog } from '@/lib/animilair-db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const catalog = await getAnimilairCatalog()
  return NextResponse.json(catalog)
}
