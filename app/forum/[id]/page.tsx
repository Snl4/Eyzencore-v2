import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getForumThread } from '@/lib/forum-db'
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, truncateSeo } from '@/lib/seo'
import { ForumThreadClient } from './ForumThreadClient'

type Props = { params: { id: string } }

function forumThreadJsonLd(thread: NonNullable<Awaited<ReturnType<typeof getForumThread>>>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: thread.title,
    text: truncateSeo(thread.content, 500),
    url: absoluteUrl(`/forum/${thread.id}`),
    datePublished: thread.createdAt,
    dateModified: thread.updatedAt,
    author: {
      '@type': 'Person',
      name: thread.author.name,
      url: thread.author.slug ? absoluteUrl(`/profile/${thread.author.slug}`) : undefined,
    },
    discussionUrl: absoluteUrl(`/forum/${thread.id}`),
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: thread.replyCount,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: thread.views,
      },
    ],
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const thread = await getForumThread(Number(params.id))
  if (!thread) {
    return buildPageMetadata({
      title: 'Тему не знайдено',
      description: 'Форумна тема не знайдена або була видалена.',
      path: `/forum/${params.id}`,
    })
  }
  return buildPageMetadata({
    title: `${thread.title} — Форум Eyzencore`,
    description: thread.content,
    path: `/forum/${thread.id}`,
    keywords: [thread.title, thread.category.name, 'Minecraft форум', 'Discord форум', 'Eyzencore форум'],
    type: 'article',
    publishedTime: thread.createdAt,
    modifiedTime: thread.updatedAt,
  })
}

export default async function ForumThreadPage({ params }: Props) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const user = await getCurrentUser()
  const thread = await getForumThread(id, user?.id, user?.user_metadata.role, true)
  if (!thread) notFound()
  const jsonLd = [
    forumThreadJsonLd(thread),
    breadcrumbJsonLd([
      { name: 'Eyzencore', path: '/' },
      { name: 'Форум', path: '/forum' },
      { name: thread.title, path: `/forum/${thread.id}` },
    ]),
  ]

  return (
    <>
      {jsonLd.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
      <div className="bg-aurora" />
      <ForumThreadClient initialUser={user} initialThread={thread} />
    </>
  )
}
