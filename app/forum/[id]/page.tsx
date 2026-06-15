import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getForumThread } from '@/lib/forum-db'
import { ForumThreadClient } from './ForumThreadClient'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const thread = await getForumThread(Number(params.id))
  return {
    title: thread ? `${thread.title} — Форум Eyzencore` : 'Тему не знайдено',
    description: thread?.content.slice(0, 160),
  }
}

export default async function ForumThreadPage({ params }: Props) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const user = await getCurrentUser()
  const thread = await getForumThread(id, user?.id, user?.user_metadata.role, true)
  if (!thread) notFound()

  return (
    <>
      <div className="bg-aurora" />
      <ForumThreadClient initialUser={user} initialThread={thread} />
    </>
  )
}
