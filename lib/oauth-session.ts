import { NextResponse } from 'next/server'
import { persistSessionToken } from '@/lib/auth-server'

export function buildOAuthSuccessResponse(input: {
  redirectOrigin: string
  token: string
  path?: string
}): NextResponse {
  const target = new URL(input.path || '/settings', input.redirectOrigin).toString()
  persistSessionToken(input.token)
  const response = new NextResponse(
    [
      '<!DOCTYPE html>',
      '<html lang="uk">',
      '<head>',
      '<meta charset="utf-8">',
      `<meta http-equiv="refresh" content="0;url=${target}">`,
      '<title>Вхід...</title>',
      '</head>',
      '<body>',
      '<p>Вхід успішний. Перенаправлення…</p>',
      `<script>window.location.replace(${JSON.stringify(target)})</script>`,
      '</body>',
      '</html>',
    ].join(''),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  )
  persistSessionToken(input.token, response)
  return response
}
