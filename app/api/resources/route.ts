import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { buildResourcePath } from '@/lib/resource-slug'
import { createCommunityResource, listCommunityResources, type CommunityResourceInput } from '@/lib/resources-db'
import { revalidatePublicResources } from '@/lib/public-cache'
import { searchModrinth, mapModrinthHitToCommunityResource } from '@/lib/modrinth'

type CreateResourceRequestBody = Omit<CommunityResourceInput, 'authorUserId'>

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 }) }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  if (role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
    return { user: null, error: NextResponse.json({ error: 'Додавати ресурси може тільки адміністратор' }, { status: 403 }) }
  }
  return { user, error: null }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim()
  const type = url.searchParams.get('type') || 'all'
  const loader = url.searchParams.get('loader') || 'all'
  const gameVersion = url.searchParams.get('version') || 'all'
  const category = url.searchParams.get('category') || 'all'
  const sort = (url.searchParams.get('sort') || (search ? 'relevance' : 'downloads')) as
    | 'relevance'
    | 'downloads'
    | 'follows'
    | 'newest'
    | 'updated'

  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 24), 1), 60)
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1)
  const offset = (page - 1) * limit

  try {
    const modrinthResult = await searchModrinth({
      query: search,
      projectType: type,
      loader,
      gameVersion,
      category,
      sort,
      offset,
      limit,
    })

    const modrinthResources = modrinthResult.hits.map(mapModrinthHitToCommunityResource)

    // For page 1 with no specific search or matching types, check if any local pinned/featured resources exist
    let localResources: typeof modrinthResources = []
    if (page === 1 && !search && loader === 'all' && gameVersion === 'all' && category === 'all') {
      try {
        const localList = await listCommunityResources({
          limit: 10,
          type: type === 'all' ? undefined : type,
        })
        localResources = localList.filter((r) => r.featured)
      } catch {
        // Ignore local db errors if any
      }
    }

    // Combine local featured and Modrinth results, eliminating duplicates by slug
    const seenSlugs = new Set<string>()
    const combinedResources = [...localResources, ...modrinthResources].filter((r) => {
      if (seenSlugs.has(r.slug)) return false
      seenSlugs.add(r.slug)
      return true
    })

    const totalHits = modrinthResult.total_hits + localResources.length
    const totalPages = Math.ceil(totalHits / limit)

    return NextResponse.json(
      {
        resources: combinedResources,
        totalHits,
        page,
        totalPages,
        limit,
        offset,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      },
    )
  } catch (error) {
    console.error('[API Resources] GET failed:', error)
    return NextResponse.json({ error: 'Не вдалося завантажити ресурси' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return auth.error
  try {
    const body = (await request.json()) as CreateResourceRequestBody
    const resource = await createCommunityResource({
      ...body,
      authorUserId: auth.user.id,
      status: body.status || 'published',
      verified: body.verified !== false,
    })
    revalidatePublicResources(buildResourcePath(resource))
    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося створити ресурс'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
