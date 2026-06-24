import { notFound, permanentRedirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getNewsPostById, resolveUserRole } from '@/lib/auth-db'
import { buildNewsPath, parseNewsIdFromSlug } from '@/lib/news-slug'
import { buildNewsMetadata, newsJsonLd } from '@/lib/seo'
import { NewsDetailsClient } from './NewsDetailsClient'

type NewsDetailsPageProps = {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: NewsDetailsPageProps) {
  const newsId = parseNewsIdFromSlug(params.id)
  if (!newsId) {
    return { title: 'Новину не знайдено' }
  }
  const post = await getNewsPostById(newsId)
  if (!post) {
    return { title: 'Новину не знайдено' }
  }
  return buildNewsMetadata(post)
}

export default async function NewsDetailsPage({ params }: NewsDetailsPageProps) {
  const newsId = parseNewsIdFromSlug(params.id)
  if (!newsId) {
    notFound()
  }
  const post = await getNewsPostById(newsId)
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
