import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getNewsPostById, resolveUserRole } from '@/lib/auth-db'
import { NewsDetailsClient } from './NewsDetailsClient'

type NewsDetailsPageProps = {
  params: {
    id: string
  }
}

function parseNewsId(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

export async function generateMetadata({ params }: NewsDetailsPageProps) {
  const newsId = parseNewsId(params.id)
  if (!newsId) {
    return { title: 'Новину не знайдено' }
  }
  const post = await getNewsPostById(newsId)
  if (!post) {
    return { title: 'Новину не знайдено' }
  }
  return {
    title: `${post.title} — Новини Eyzencore`,
    description: post.excerpt || post.content.slice(0, 160),
  }
}

export default async function NewsDetailsPage({ params }: NewsDetailsPageProps) {
  const newsId = parseNewsId(params.id)
  if (!newsId) {
    notFound()
  }
  const post = await getNewsPostById(newsId)
  if (!post) {
    notFound()
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
      <div className="bg-aurora" />
      <NewsDetailsClient
        initialUser={currentUser}
        post={post}
        canManage={canManage}
      />
    </>
  )
}
