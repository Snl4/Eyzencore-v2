import { notFound, redirect } from 'next/navigation'
import { NewsEditorPage } from '@/components/news/NewsEditorPage'
import { getCurrentUser } from '@/lib/auth-server'
import { getNewsPostById, resolveUserRole } from '@/lib/auth-db'

type NewsEditPageProps = {
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

export const dynamic = 'force-dynamic'

export default function NewsEditPage({ params }: NewsEditPageProps) {
  const user = getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  const newsId = parseNewsId(params.id)
  if (!newsId) {
    notFound()
  }
  const post = getNewsPostById(newsId)
  if (!post) {
    notFound()
  }
  const role = resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  const canManage = user.id === post.authorUserId || role === 'ADMIN'
  if (!canManage) {
    redirect(`/news/${post.id}`)
  }
  return (
    <>
      <div className="bg-aurora" />
      <NewsEditorPage mode="edit" initialUser={user} initialPost={post} />
    </>
  )
}
