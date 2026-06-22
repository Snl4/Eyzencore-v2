import { prisma } from '@/lib/prisma'

const MAX_TITLE_LENGTH = 160
const MAX_CONTENT_LENGTH = 12000
const MAX_ATTACHMENTS = 6

export type ForumAttachment = {
  url: string
  kind: 'image' | 'video'
  mime: string
  size: number
  name: string
}

function cleanText(value: unknown, max: number) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, max)
}

function requireText(value: unknown, label: string, min: number, max: number) {
  const result = cleanText(value, max)
  if (result.length < min) {
    throw new Error(`${label}: мінімум ${min} символів`)
  }
  return result
}

function isAdmin(role?: string | null) {
  return String(role || '').toUpperCase() === 'ADMIN'
}

function normalizeAttachments(value: unknown): ForumAttachment[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_ATTACHMENTS).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const input = item as Record<string, unknown>
    const url = cleanText(input.url, 1000)
    const mime = cleanText(input.mime, 120).toLowerCase()
    const kind = input.kind === 'video' ? 'video' : 'image'
    if (!url.startsWith('/uploads/forum/') && !url.startsWith('/api/uploads/forum/')) return []
    if (kind === 'image' && !mime.startsWith('image/')) return []
    if (kind === 'video' && !mime.startsWith('video/')) return []
    return [{
      url,
      kind,
      mime,
      size: Math.max(0, Number(input.size) || 0),
      name: cleanText(input.name, 255) || (kind === 'video' ? 'video' : 'image'),
    }]
  })
}

function parseAttachments(raw: string): ForumAttachment[] {
  try {
    return normalizeAttachments(JSON.parse(raw || '[]'))
  } catch {
    return []
  }
}

function mapAuthor(user: {
  id: string
  full_name: string
  profile_slug: string | null
  avatar_url: string | null
  role: string
}) {
  return {
    id: user.id,
    name: user.full_name,
    slug: user.profile_slug,
    avatarUrl: user.avatar_url,
    role: user.role,
  }
}

export async function listForumCategories() {
  const [categories, categoryCounts] = await Promise.all([
    prisma.forum_categories.findMany({
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      include: {
        forum_threads: {
          where: { is_deleted: 0 },
          orderBy: { last_activity_at: 'desc' },
          take: 1,
          select: { last_activity_at: true },
        },
      },
    }),
    prisma.forum_threads.groupBy({
      by: ['category_id'],
      where: { is_deleted: 0 },
      _count: { _all: true },
    }),
  ])

  const countsByCategory = categoryCounts.reduce<Record<number, number>>(
    (acc, item) => {
      acc[item.category_id] = item._count._all
      return acc
    },
    {}
  )

  return categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    icon: category.icon,
    color: category.color,
    threads: countsByCategory[category.id] || 0,
    lastActivityAt: category.forum_threads[0]?.last_activity_at ?? null,
  }))
}

export async function listForumThreads(input?: {
  category?: string
  query?: string
  sort?: string
  limit?: number
}) {
  const category = cleanText(input?.category, 80)
  const query = cleanText(input?.query, 160)
  const limit = Math.min(100, Math.max(1, Number(input?.limit || 50)))
  const sort = input?.sort === 'popular' ? 'popular' : 'recent'

  const threads = await prisma.forum_threads.findMany({
    where: {
      is_deleted: 0,
      ...(category ? { forum_categories: { slug: category } } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { content: { contains: query } },
              { app_users: { full_name: { contains: query } } },
            ],
          }
        : {}),
    },
    orderBy:
      sort === 'popular'
        ? [{ is_pinned: 'desc' }, { views: 'desc' }, { last_activity_at: 'desc' }]
        : [{ is_pinned: 'desc' }, { last_activity_at: 'desc' }],
    take: limit,
    include: {
      app_users: {
        select: {
          id: true,
          full_name: true,
          profile_slug: true,
          avatar_url: true,
          role: true,
        },
      },
      forum_categories: true,
      _count: {
        select: { forum_posts: true, forum_thread_likes: true },
      },
    },
  })

  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    excerpt:
      thread.content.length > 180
        ? `${thread.content.slice(0, 180)}…`
        : thread.content,
    author: mapAuthor(thread.app_users),
    category: {
      id: thread.forum_categories.id,
      slug: thread.forum_categories.slug,
      name: thread.forum_categories.name,
      color: thread.forum_categories.color,
    },
    replies: thread._count.forum_posts,
    likes: thread._count.forum_thread_likes,
    views: thread.views,
    isPinned: Boolean(thread.is_pinned),
    isLocked: Boolean(thread.is_locked),
    isSolved: Boolean(thread.is_solved),
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    lastActivityAt: thread.last_activity_at,
  }))
}

export async function getForumHome(input?: {
  category?: string
  query?: string
  sort?: string
}) {
  const [categories, threads] = await Promise.all([
    listForumCategories(),
    listForumThreads(input),
  ])
  return { categories, threads }
}

export async function listForumThreadsByUser(userId: string, limit = 20) {
  const threads = await prisma.forum_threads.findMany({
    where: { author_user_id: userId, is_deleted: 0 },
    orderBy: { last_activity_at: 'desc' },
    take: Math.min(50, Math.max(1, limit)),
    include: {
      forum_categories: { select: { name: true } },
      _count: { select: { forum_posts: true } },
    },
  })
  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    category: thread.forum_categories.name,
    replies: thread._count.forum_posts,
    views: thread.views,
    date: thread.last_activity_at,
    pinned: Boolean(thread.is_pinned),
  }))
}

export async function createForumThread(input: {
  userId: string
  categoryId: number
  title: string
  content: string
  attachments?: ForumAttachment[]
}) {
  const title = requireText(input.title, 'Заголовок', 6, MAX_TITLE_LENGTH)
  const content = requireText(input.content, 'Текст теми', 15, MAX_CONTENT_LENGTH)
  const category = await prisma.forum_categories.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  })
  if (!category) throw new Error('Категорію не знайдено')

  const now = new Date().toISOString()
  return prisma.forum_threads.create({
    data: {
      category_id: category.id,
      author_user_id: input.userId,
      title,
      content,
      attachments_json: JSON.stringify(normalizeAttachments(input.attachments)),
      created_at: now,
      updated_at: now,
      last_activity_at: now,
    },
    select: { id: true },
  })
}

export async function getForumThread(
  threadId: number,
  currentUserId?: string | null,
  currentUserRole?: string | null,
  incrementView = false
) {
  const thread = await prisma.forum_threads.findUnique({
    where: { id: threadId },
    include: {
      app_users: {
        select: {
          id: true,
          full_name: true,
          profile_slug: true,
          avatar_url: true,
          role: true,
          created_at: true,
        },
      },
      forum_categories: true,
      forum_thread_likes: currentUserId
        ? { where: { user_id: currentUserId }, select: { id: true } }
        : false,
      forum_posts: {
        orderBy: { created_at: 'asc' },
        include: {
          app_users: {
            select: {
              id: true,
              full_name: true,
              profile_slug: true,
              avatar_url: true,
              role: true,
              created_at: true,
            },
          },
          forum_post_likes: currentUserId
            ? { where: { user_id: currentUserId }, select: { id: true } }
            : false,
          _count: { select: { forum_post_likes: true } },
        },
      },
      _count: {
        select: { forum_posts: true, forum_thread_likes: true },
      },
    },
  })

  if (!thread) return null
  if (
    thread.is_deleted &&
    thread.author_user_id !== currentUserId &&
    !isAdmin(currentUserRole)
  ) {
    return null
  }

  if (incrementView && !thread.is_deleted) {
    await prisma.forum_threads
      .update({
        where: { id: threadId },
        data: { views: { increment: 1 } },
        select: { id: true },
      })
      .catch(() => null)
    thread.views += 1
  }

  return {
    id: thread.id,
    title: thread.title,
    content: thread.content,
    attachments: parseAttachments(thread.attachments_json),
    author: {
      ...mapAuthor(thread.app_users),
      joinedAt: thread.app_users.created_at,
    },
    category: {
      id: thread.forum_categories.id,
      slug: thread.forum_categories.slug,
      name: thread.forum_categories.name,
      color: thread.forum_categories.color,
    },
    replies: thread.forum_posts.map((post) => ({
      id: post.id,
      content: post.content,
      attachments: parseAttachments(post.attachments_json),
      author: {
        ...mapAuthor(post.app_users),
        joinedAt: post.app_users.created_at,
      },
      likes: post._count.forum_post_likes,
      likedByMe: Array.isArray(post.forum_post_likes)
        ? post.forum_post_likes.length > 0
        : false,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    })),
    replyCount: thread._count.forum_posts,
    likes: thread._count.forum_thread_likes,
    likedByMe: Array.isArray(thread.forum_thread_likes)
      ? thread.forum_thread_likes.length > 0
      : false,
    views: thread.views,
    isPinned: Boolean(thread.is_pinned),
    isLocked: Boolean(thread.is_locked),
    isSolved: Boolean(thread.is_solved),
    isDeleted: Boolean(thread.is_deleted),
    deletedAt: thread.deleted_at,
    deletedByUserId: thread.deleted_by_user_id,
    deletedReason: thread.deleted_reason,
    moderationReason: thread.moderation_reason,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    lastActivityAt: thread.last_activity_at,
  }
}

export async function updateForumThread(input: {
  threadId: number
  userId: string
  role?: string | null
  categoryId?: number
  title: string
  content: string
  attachments?: ForumAttachment[]
}) {
  const existing = await prisma.forum_threads.findUnique({
    where: { id: input.threadId },
    select: { author_user_id: true },
  })
  if (!existing) throw new Error('Тему не знайдено')
  if (existing.author_user_id !== input.userId && !isAdmin(input.role)) {
    throw new Error('Недостатньо прав')
  }

  const title = requireText(input.title, 'Заголовок', 6, MAX_TITLE_LENGTH)
  const content = requireText(input.content, 'Текст теми', 15, MAX_CONTENT_LENGTH)
  return prisma.forum_threads.update({
    where: { id: input.threadId },
    data: {
      title,
      content,
      attachments_json: JSON.stringify(normalizeAttachments(input.attachments)),
      ...(input.categoryId ? { category_id: input.categoryId } : {}),
      updated_at: new Date().toISOString(),
    },
    select: { id: true },
  })
}

export async function deleteForumThread(input: {
  threadId: number
  userId: string
  role?: string | null
  reason?: string
}) {
  const existing = await prisma.forum_threads.findUnique({
    where: { id: input.threadId },
    select: { author_user_id: true },
  })
  if (!existing) throw new Error('Тему не знайдено')
  if (existing.author_user_id !== input.userId && !isAdmin(input.role)) {
    throw new Error('Недостатньо прав')
  }
  await prisma.forum_threads.update({
    where: { id: input.threadId },
    data: {
      is_deleted: 1,
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: input.userId,
      deleted_reason: input.reason || '',
    },
    select: { id: true },
  })
}

export async function createForumReply(input: {
  threadId: number
  userId: string
  content: string
  attachments?: ForumAttachment[]
}) {
  const content = requireText(input.content, 'Відповідь', 2, MAX_CONTENT_LENGTH)
  const thread = await prisma.forum_threads.findUnique({
    where: { id: input.threadId },
    select: { id: true, is_locked: true },
  })
  if (!thread) throw new Error('Тему не знайдено')
  if (thread.is_locked) throw new Error('Тему заблоковано')

  const now = new Date().toISOString()
  return prisma.$transaction(async (tx) => {
    const post = await tx.forum_posts.create({
      data: {
        thread_id: input.threadId,
        author_user_id: input.userId,
        content,
        attachments_json: JSON.stringify(normalizeAttachments(input.attachments)),
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    })
    await tx.forum_threads.update({
      where: { id: input.threadId },
      data: { last_activity_at: now },
      select: { id: true },
    })
    return post
  })
}

export async function updateForumReply(input: {
  postId: number
  userId: string
  role?: string | null
  content: string
  attachments?: ForumAttachment[]
}) {
  const post = await prisma.forum_posts.findUnique({
    where: { id: input.postId },
    select: { author_user_id: true },
  })
  if (!post) throw new Error('Відповідь не знайдено')
  if (post.author_user_id !== input.userId && !isAdmin(input.role)) {
    throw new Error('Недостатньо прав')
  }
  return prisma.forum_posts.update({
    where: { id: input.postId },
    data: {
      content: requireText(input.content, 'Відповідь', 2, MAX_CONTENT_LENGTH),
      attachments_json: JSON.stringify(normalizeAttachments(input.attachments)),
      updated_at: new Date().toISOString(),
    },
    select: { id: true },
  })
}

export async function deleteForumReply(input: {
  postId: number
  userId: string
  role?: string | null
}) {
  const post = await prisma.forum_posts.findUnique({
    where: { id: input.postId },
    select: { author_user_id: true, thread_id: true },
  })
  if (!post) throw new Error('Відповідь не знайдено')
  if (post.author_user_id !== input.userId && !isAdmin(input.role)) {
    throw new Error('Недостатньо прав')
  }
  await prisma.forum_posts.delete({ where: { id: input.postId } })
  const latest = await prisma.forum_posts.findFirst({
    where: { thread_id: post.thread_id },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  })
  const thread = await prisma.forum_threads.findUnique({
    where: { id: post.thread_id },
    select: { created_at: true },
  })
  await prisma.forum_threads.update({
    where: { id: post.thread_id },
    data: { last_activity_at: latest?.created_at || thread?.created_at },
    select: { id: true },
  })
}

export async function toggleForumThreadLike(threadId: number, userId: string) {
  const existing = await prisma.forum_thread_likes.findUnique({
    where: { thread_id_user_id: { thread_id: threadId, user_id: userId } },
  })
  if (existing) {
    await prisma.forum_thread_likes.delete({ where: { id: existing.id } })
  } else {
    await prisma.forum_thread_likes.create({
      data: {
        thread_id: threadId,
        user_id: userId,
        created_at: new Date().toISOString(),
      },
    })
  }
  return {
    liked: !existing,
    likes: await prisma.forum_thread_likes.count({ where: { thread_id: threadId } }),
  }
}

export async function toggleForumPostLike(postId: number, userId: string) {
  const existing = await prisma.forum_post_likes.findUnique({
    where: { post_id_user_id: { post_id: postId, user_id: userId } },
  })
  if (existing) {
    await prisma.forum_post_likes.delete({ where: { id: existing.id } })
  } else {
    await prisma.forum_post_likes.create({
      data: {
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString(),
      },
    })
  }
  return {
    liked: !existing,
    likes: await prisma.forum_post_likes.count({ where: { post_id: postId } }),
  }
}

export async function moderateForumThread(input: {
  threadId: number
  userId: string
  role?: string | null
  action: 'pin' | 'lock' | 'solve' | 'delete'
  reason?: string
}) {
  const thread = await prisma.forum_threads.findUnique({
    where: { id: input.threadId },
    select: {
      author_user_id: true,
      is_pinned: true,
      is_locked: true,
      is_solved: true,
      moderation_reason: true,
    },
  })
  if (!thread) throw new Error('Тему не знайдено')

  if (input.action === 'solve') {
    if (thread.author_user_id !== input.userId && !isAdmin(input.role)) {
      throw new Error('Недостатньо прав')
    }
    return prisma.forum_threads.update({
      where: { id: input.threadId },
      data: { is_solved: thread.is_solved ? 0 : 1 },
      select: { is_solved: true },
    })
  }

  if (input.action === 'delete') {
    if (!isAdmin(input.role)) throw new Error('Потрібні права адміністратора')
    return prisma.forum_threads.update({
      where: { id: input.threadId },
      data: {
        is_deleted: 1,
        deleted_at: new Date().toISOString(),
        deleted_by_user_id: input.userId,
        deleted_reason: input.reason || '',
      },
      select: { is_deleted: true },
    })
  }

  if (!isAdmin(input.role)) throw new Error('Потрібні права адміністратора')
  return prisma.forum_threads.update({
    where: { id: input.threadId },
    data:
      input.action === 'pin'
        ? { is_pinned: thread.is_pinned ? 0 : 1 }
        : {
            is_locked: thread.is_locked ? 0 : 1,
            moderation_reason: input.reason || thread.moderation_reason,
          },
    select: { is_pinned: true, is_locked: true, moderation_reason: true },
  })
}
