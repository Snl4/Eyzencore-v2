import { notFound, permanentRedirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getNewsPostById, listNewsPosts, resolveUserRole } from '@/lib/auth-db'
import { buildNewsPath, buildNewsSlug, parseNewsIdFromSlug } from '@/lib/news-slug'
import { buildNewsMetadata, newsJsonLd } from '@/lib/seo'
import { NewsDetailsClient } from './NewsDetailsClient'

type NewsDetailsPageProps = {
  params: {
    id: string
  }
}

const LEGACY_NEWS_SLUG_IDS: Record<string, number> = {
  'minecraft-261-release-candidate-2-vzhe-vyishov': 8,
  'novyi-kontent-v-minecraft-marketplace': 14,
  'boatview360': 15,
  'minecraft-twitch-drops': 7,
}

async function getNewsPostFromParam(value: string) {
  const newsId = parseNewsIdFromSlug(value) || LEGACY_NEWS_SLUG_IDS[value]
  if (newsId) {
    return getNewsPostById(newsId)
  }
  const posts = await listNewsPosts(100)
  return posts.find((post) => buildNewsSlug({ title: post.title }) === value) || null
}

export async function generateMetadata({ params }: NewsDetailsPageProps) {
  const post = await getNewsPostFromParam(params.id)
  if (!post) {
    return { title: 'Новину не знайдено' }
  }
  return buildNewsMetadata(post)
}

export default async function NewsDetailsPage({ params }: NewsDetailsPageProps) {
  const post = await getNewsPostFromParam(params.id)
  if (!post) {
    notFound()
  }
  const canonicalPath = buildNewsPath(post)
  if (params.id !== canonicalPath.split('/').pop()) {
    permanentRedirect(canonicalPath)
  }
  const currentUser = await getCurrentUser()
  const role = currentUser
    ? await resolveUserRole({
        userId: currentUser.id,
        role: currentUser.user_metadata.role,
      })
    : null
  const canManage = Boolean(currentUser && (currentUser.id === post.authorUserId || role === 'ADMIN'))
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd(post)) }}
      />
      <div className="bg-aurora" />
      <NewsDetailsClient
        initialUser={currentUser}
        post={post}
        canManage={canManage}
      />
    </>
  )
}
