import { buildSiteCatalog } from '@/lib/site-catalog'

export const revalidate = 3600

export async function GET(): Promise<Response> {
  const body = await buildSiteCatalog({ full: false })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
