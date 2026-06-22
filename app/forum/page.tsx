import type { Metadata } from 'next'
import { ForumPageClient } from './ForumPageClient'
import { getCurrentUser } from '@/lib/auth-server'
import { getForumHome } from '@/lib/forum-db'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Форум Minecraft і Discord спільноти',
    description:
      'Форум Eyzencore для українських Minecraft-гравців і Discord спільнот: гайди, питання, оголошення серверів, ресурси та технічна підтримка.',
    path: '/forum',
    keywords: [
      'Minecraft форум',
      'форум майнкрафт',
      'Discord форум',
      'українська gaming спільнота',
      'гайди Minecraft',
    ],
  }),
}

export default async function ForumPage() {
  const [initialUser, initialData] = await Promise.all([
    getCurrentUser(),
    getForumHome(),
  ])
  return (
    <>
      <div className="bg-aurora" />
      <ForumPageClient initialUser={initialUser} initialData={initialData} />
    </>
  )
}
