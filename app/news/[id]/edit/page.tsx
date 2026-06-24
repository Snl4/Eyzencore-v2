import { notFound, redirect } from 'next/navigation'
import { NewsEditorPage } from '@/components/news/NewsEditorPage'
import { getCurrentUser } from '@/lib/auth-server'
import { getNewsPostById, resolveUserRole } from '@/lib/auth-db'
import { buildNewsPath, parseNewsIdFromSlug } from '@/lib/news-slug'

type NewsEditPageProps = {
  params: {
    id: string
  }
}

export const dynamic = 'force-dynamic'

export default async function NewsEditPage({ params }: NewsEditPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  const newsId = parseNewsIdFromSlug(params.id)
  if (!newsId) {
    notFound()
  }
  const post = await getNewsPostById(newsId)
  if (!post) {
    notFound()
  }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  const canManage = user.id === post.authorUserId || role === 'ADMIN'
  if (!canManage) {
    redirect(buildNewsPath(post))
  }
  return (
    <>
      <div className="bg-aurora" />
      <NewsEditorPage mode="edit" initialUser={user} initialPost={post} />
    </>
  )
}
