import type { Metadata } from 'next'
import { NewsPageClient } from './NewsPageClient'
import { getCurrentUser } from '@/lib/auth-server'
import { listNewsPosts, resolveUserRole } from '@/lib/auth-db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Новини — Eyzencore',
  description: 'Офіційні новини, оновлення платформи та анонси серверів Eyzencore.',
}

export default function NewsPage() {
  const initialUser = getCurrentUser()
  const initialPosts = listNewsPosts(50)
  const role = initialUser
    ? resolveUserRole({
        userId: initialUser.id,
        role: initialUser.user_metadata.role,
      })
    : null
  const canCreateNews = role === 'OWNER' || role === 'ADMIN'
  return (
    <>
      <div className="bg-aurora" />
      <NewsPageClient initialUser={initialUser} initialPosts={initialPosts} canCreateNews={canCreateNews} />
    </>
  )
}
