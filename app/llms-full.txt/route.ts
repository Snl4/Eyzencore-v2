import { NextRequest, NextResponse } from 'next/server'

export function GET(request: NextRequest): NextResponse {
  const url = new URL(request.url)
  url.pathname = '/catalog-full.txt'
  return NextResponse.redirect(url, 308)
}
