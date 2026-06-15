const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')

const root = path.resolve(__dirname, '..')
const sqlitePath = path.resolve(root, process.env.EYZENCORE_SQLITE || 'data/eyzencore-auth.sqlite')
const psql = process.env.PSQL_PATH || 'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe'
const pgHost = process.env.NEBULA_PG_HOST || 'localhost'
const pgPort = process.env.NEBULA_PG_PORT || '5433'
const pgUser = process.env.NEBULA_PG_USER || 'postgres'
const pgDatabase = process.env.NEBULA_PG_DATABASE || 'nebula_import'
const legacyRoot = path.resolve(root, 'public/uploads/legacy-nebula')

if (!fs.existsSync(sqlitePath)) throw new Error(`SQLite database not found: ${sqlitePath}`)
if (!fs.existsSync(psql)) throw new Error(`psql not found: ${psql}`)

function pgRows(sql) {
  const output = execFileSync(psql, [
    '-h', pgHost,
    '-p', pgPort,
    '-U', pgUser,
    '-d', pgDatabase,
    '-v', 'ON_ERROR_STOP=1',
    '-At',
    '-c', `SELECT row_to_json(source_row) FROM (${sql}) source_row`,
  ], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 128 * 1024 * 1024,
  })
  return output.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
}

function iso(value, fallback = new Date().toISOString()) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function json(value, fallback = []) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

function text(value, max = 50000) {
  return String(value ?? '').trim().slice(0, max)
}

function slugify(value) {
  const transliteration = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye',
    ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'i', к: 'k', л: 'l',
    м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '',
    ю: 'yu', я: 'ya', ы: 'y', э: 'e', ё: 'yo', ъ: '',
  }
  return text(value, 120)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('')
    .map((character) => transliteration[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'user'
}

function legacyAchievementName(slug) {
  const names = {
    discord_linked: 'Discord підключено',
    email_verified: 'Email підтверджено',
    first_follow: 'Перша підписка',
    first_like_given: 'Перша вподобайка',
    first_news: 'Перша новина',
    first_review_written: 'Перший відгук',
    first_server: 'Перший сервер',
    first_vote: 'Перший голос',
    forum_posts_10: '10 дописів на форумі',
    giveaway_entered: 'Учасник розіграшу',
    profile_complete: 'Профіль заповнено',
    telegram_linked: 'Telegram підключено',
    vote_10: '10 голосів',
    vote_50: '50 голосів',
  }
  return names[slug] || slug.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function mediaUrl(value) {
  const raw = text(value, 2_000)
  if (!raw) return null
  if (raw.startsWith('data:')) return raw
  let filename = null
  try {
    const parsed = new URL(raw, 'https://legacy.local')
    const match = parsed.pathname.match(/\/uploads\/([^/?#]+)$/)
    filename = match?.[1] || null
  } catch {}
  if (!filename) return raw

  const serverFile = path.join(legacyRoot, 'server', 'uploads', filename)
  const rootFile = path.join(legacyRoot, 'uploads', filename)
  if (fs.existsSync(serverFile)) return `/uploads/legacy-nebula/server/uploads/${filename}`
  if (fs.existsSync(rootFile)) return `/uploads/legacy-nebula/uploads/${filename}`
  return raw
}

function saveDataUrl(value, group, key) {
  const raw = text(value, 20_000_000)
  const match = raw.match(/^data:([^;,]+);base64,(.+)$/s)
  if (!match) return mediaUrl(raw)
  const extByMime = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  }
  const ext = extByMime[match[1]] || 'bin'
  const dir = path.join(legacyRoot, 'embedded', group)
  fs.mkdirSync(dir, { recursive: true })
  const filename = `${String(key).replace(/[^a-z0-9_-]/gi, '_')}.${ext}`
  fs.writeFileSync(path.join(dir, filename), Buffer.from(match[2], 'base64'))
  return `/uploads/legacy-nebula/embedded/${group}/${filename}`
}

const db = new Database(sqlitePath)
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')

const report = {
  users: 0,
  projects: 0,
  servers: 0,
  applications: 0,
  news: 0,
  forumCategories: 0,
  forumThreads: 0,
  forumPosts: 0,
  votes: 0,
  likes: 0,
  reviews: 0,
  views: 0,
  notifications: 0,
  achievements: 0,
}

const users = pgRows(`SELECT * FROM app_users WHERE deleted_at IS NULL ORDER BY created_at`)
const projects = pgRows(`SELECT * FROM server_projects ORDER BY created_at`)
const submissions = pgRows(`SELECT * FROM server_submissions ORDER BY created_at`)
const news = pgRows(`SELECT * FROM news WHERE status = 'approved' ORDER BY created_at`)
const categories = pgRows(`SELECT * FROM forum_categories ORDER BY sort_order, created_at`)
const topics = pgRows(`SELECT * FROM forum_topics ORDER BY created_at`)
const posts = pgRows(`SELECT * FROM forum_posts ORDER BY created_at`)
const topicLikes = pgRows(`SELECT * FROM forum_topic_likes ORDER BY created_at`)
const postLikes = pgRows(`SELECT * FROM forum_post_likes ORDER BY created_at`)
const votes = pgRows(`SELECT * FROM server_votes ORDER BY created_at`)
const likes = pgRows(`SELECT * FROM server_likes ORDER BY created_at`)
const reviews = pgRows(`SELECT * FROM server_reviews ORDER BY created_at`)
const views = pgRows(`SELECT * FROM server_page_views ORDER BY viewed_at`)
const notifications = pgRows(`SELECT * FROM user_notifications ORDER BY created_at`)
const oldAchievements = pgRows(`SELECT * FROM user_achievements ORDER BY unlocked_at`)

const userMap = new Map()
const projectMap = new Map()
const serverMap = new Map()
const categoryMap = new Map()
const topicMap = new Map()
const postMap = new Map()

function uniqueSlug(base, userId) {
  let candidate = slugify(base)
  let suffix = 2
  while (true) {
    const row = db.prepare('SELECT id FROM app_users WHERE profile_slug = ? LIMIT 1').get(candidate)
    if (!row || row.id === userId) return candidate
    candidate = `${slugify(base).slice(0, 90)}-${suffix++}`
  }
}

const run = db.transaction(() => {
  for (const user of users) {
    const existing = db.prepare(
      'SELECT id FROM app_users WHERE id = ? OR lower(email) = lower(?) ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END LIMIT 1'
    ).get(user.id, user.email, user.id)
    const id = existing?.id || user.id
    userMap.set(user.id, id)
    const profileSlug = uniqueSlug(user.full_name || user.email.split('@')[0], id)
    if (existing) {
      db.prepare(
        `UPDATE app_users SET
          full_name = CASE WHEN full_name = '' THEN ? ELSE full_name END,
          profile_slug = ?,
          is_legacy = 1,
          bio = CASE WHEN COALESCE(bio, '') = '' THEN ? ELSE bio END,
          location = CASE WHEN COALESCE(location, '') = '' THEN ? ELSE location END,
          website = COALESCE(website, ?),
          telegram = COALESCE(telegram, ?),
          discord = COALESCE(discord, ?),
          avatar_url = COALESCE(avatar_url, ?),
          banner_url = COALESCE(banner_url, ?),
          discord_user_id = COALESCE(discord_user_id, ?),
          updated_at = ?
         WHERE id = ?`
      ).run(
        text(user.full_name, 120),
        profileSlug,
        text(user.bio, 2000),
        text(user.location, 160),
        text(user.website, 500) || null,
        text(user.social_telegram || user.telegram_username, 160) || null,
        text(user.social_discord, 160) || null,
        mediaUrl(user.avatar_url),
        mediaUrl(user.banner_url),
        text(user.discord_id, 160) || null,
        iso(user.updated_at),
        id
      )
    } else {
      db.prepare(
        `INSERT INTO app_users (
          id, email, password_hash, full_name, profile_slug, bio, location, website,
          telegram, discord, avatar_url, banner_url, role, is_legacy, created_at, updated_at, discord_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      ).run(
        id,
        text(user.email, 320).toLowerCase(),
        user.password_hash,
        text(user.full_name, 120) || 'Користувач',
        profileSlug,
        text(user.bio, 2000),
        text(user.location, 160),
        text(user.website, 500) || null,
        text(user.social_telegram || user.telegram_username, 160) || null,
        text(user.social_discord, 160) || null,
        mediaUrl(user.avatar_url),
        mediaUrl(user.banner_url),
        ['ADMIN', 'OWNER'].includes(String(user.role).toUpperCase()) ? String(user.role).toUpperCase() : 'USER',
        iso(user.created_at),
        iso(user.updated_at),
        text(user.discord_id, 160) || null
      )
      report.users += 1
    }
  }

  for (const project of projects) {
    const ownerId = userMap.get(project.user_id)
    if (!ownerId) continue
    let existing = db.prepare(
      'SELECT id FROM app_projects WHERE owner_id = ? AND lower(name) = lower(?) LIMIT 1'
    ).get(ownerId, project.name)
    if (!existing) {
      const result = db.prepare(
        `INSERT INTO app_projects (
          owner_id, name, description, logo_url, website, discord, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`
      ).run(
        ownerId,
        text(project.name, 160),
        text(project.description, 6000),
        mediaUrl(project.avatar_url || project.banner_url),
        text(project.discord, 500) || null,
        iso(project.created_at),
        iso(project.updated_at)
      )
      existing = { id: Number(result.lastInsertRowid) }
      report.projects += 1
    }
    projectMap.set(project.id, Number(existing.id))
  }

  const usedAddresses = new Set(
    db.prepare('SELECT lower(addr) AS addr FROM app_servers').all().map((row) => row.addr)
  )

  for (const server of submissions) {
    const ownerId = userMap.get(server.user_id)
    if (!ownerId) continue
    const isBedrock = /\bbedrock\b/i.test(server.name) || String(server.core_version || '').toLowerCase() === 'bedrock'
    const isDiscord = String(server.address_for_users || '').includes('discord.gg/')
    let addr = text(server.address_for_users, 255)
    if (!addr) addr = `legacy-${server.id}`
    if (isBedrock && !/:\d+$/.test(addr)) addr = `${addr}:19132`
    const addrKey = addr.toLowerCase()
    let existing = db.prepare('SELECT id FROM app_servers WHERE lower(addr) = lower(?) LIMIT 1').get(addr)
    if (!existing && usedAddresses.has(addrKey)) {
      addr = `${addr}-${String(server.id).slice(-6)}`
    }

    const gallery = json(server.screenshots).map(mediaUrl).filter(Boolean).slice(0, 6)
    const avatarUrl = saveDataUrl(server.icon_url, 'servers', `${server.id}-avatar`)
    const bannerUrl = saveDataUrl(server.banner_url, 'servers', `${server.id}-banner`)
    const projectId = server.project_id ? projectMap.get(server.project_id) || null : null
    const now = iso(server.created_at)
    const data = [
      ownerId,
      text(server.name, 160),
      addr,
      isDiscord ? 'discord' : 'minecraft',
      text(json(server.tags)[0] || (isDiscord ? 'Community' : 'Survival'), 120),
      text(server.core_version || server.max_version || server.min_version || (isDiscord ? 'Discord' : '1.21'), 120),
      isDiscord ? 'discord' : (isBedrock ? 'bedrock' : (server.cross_platform ? 'java_bedrock' : 'java')),
      text(server.country, 120) || null,
      text(server.short_description, 500),
      text(server.full_description, 12000),
      text(server.full_description || server.short_description, 12000),
      text(server.website, 500) || null,
      text(server.discord, 500) || null,
      text(server.telegram, 500) || null,
      text(server.donation_page, 500) || null,
      text(server.tiktok, 500) || null,
      text(server.launcher_link, 500) || null,
      avatarUrl,
      bannerUrl,
      JSON.stringify(gallery),
      JSON.stringify([server.youtube_url, server.youtube_url_2].filter(Boolean)),
      JSON.stringify(json(server.tags)),
      Number(server.online_players || 0),
      Number(server.max_players || 0),
      server.ownership_verified ? 1 : 0,
      server.sponsored ? 1 : 0,
      now,
      now,
      projectId,
    ]

    if (server.status === 'approved') {
      if (existing) {
        serverMap.set(server.id, Number(existing.id))
        continue
      }
      const result = db.prepare(
        `INSERT INTO app_servers (
          owner_id, name, addr, platform, mode, ver, core, country, short_desc, full_desc, desc,
          website, discord, telegram, donate, tiktok, launcher_url, avatar_url, banner_url,
          gallery_json, videos_json, tags, online, players, max, uptime, verified, boosted,
          created_at, updated_at, project_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'legacy', ?, ?, ?, ?, ?)`
      ).run(...data)
      const id = Number(result.lastInsertRowid)
      serverMap.set(server.id, id)
      usedAddresses.add(addr.toLowerCase())
      report.servers += 1
    } else {
      const duplicate = db.prepare(
        'SELECT id FROM app_server_applications WHERE owner_id = ? AND addr = ? AND name = ? LIMIT 1'
      ).get(ownerId, addr, server.name)
      if (!duplicate) {
        db.prepare(
          `INSERT INTO app_server_applications (
            owner_id, status, rejection_reason, name, addr, platform, mode, ver, core, country,
            short_desc, full_desc, desc, website, discord, telegram, donate, tiktok, launcher_url,
            avatar_url, banner_url, gallery_json, videos_json, tags, owner_name, owner_avatar,
            created_at, reviewed_at, project_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`
        ).run(
          ownerId, server.status, text(server.rejection_reason, 2000) || null,
          ...data.slice(1, 22),
          now, server.reviewed_at ? iso(server.reviewed_at) : null, projectId
        )
        report.applications += 1
      }
    }
  }

  const fallbackAuthor = db.prepare('SELECT id FROM app_users ORDER BY created_at LIMIT 1').get()?.id
  for (const item of news) {
    const authorId = userMap.get(item.author_id) || fallbackAuthor
    if (!authorId) continue
    const exists = db.prepare(
      'SELECT id FROM app_news_posts WHERE title = ? AND created_at = ? LIMIT 1'
    ).get(item.title, iso(item.created_at))
    if (exists) continue
    db.prepare(
      `INSERT INTO app_news_posts (
        author_user_id, title, excerpt, content, content_json, category, cover_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '[]', ?, ?, ?, ?)`
    ).run(
      authorId,
      text(item.title, 240),
      text(item.excerpt, 1000),
      text(item.content, 50000),
      text(item.category, 100) || 'Новини',
      mediaUrl(item.image),
      iso(item.created_at),
      iso(item.created_at)
    )
    report.news += 1
  }

  for (const category of categories) {
    let existing = db.prepare('SELECT id FROM forum_categories WHERE slug = ? LIMIT 1').get(category.slug)
    if (!existing) {
      const result = db.prepare(
        `INSERT INTO forum_categories (slug, name, description, icon, color, position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        text(category.slug, 80),
        text(category.name, 120),
        text(category.description, 500),
        text(category.icon, 80) || 'comments',
        '#7b8cff',
        Number(category.sort_order || 0),
        iso(category.created_at)
      )
      existing = { id: Number(result.lastInsertRowid) }
      report.forumCategories += 1
    }
    categoryMap.set(category.id, Number(existing.id))
  }

  const postsByTopic = new Map()
  for (const post of posts) {
    if (!postsByTopic.has(post.topic_id)) postsByTopic.set(post.topic_id, [])
    postsByTopic.get(post.topic_id).push(post)
  }

  for (const topic of topics) {
    const categoryId = categoryMap.get(topic.category_id)
    const authorId = userMap.get(topic.author_id)
    if (!categoryId || !authorId) continue
    const topicPosts = postsByTopic.get(topic.id) || []
    const original = topicPosts.find((post) => post.author_id === topic.author_id) || topicPosts[0]
    const exists = db.prepare(
      'SELECT id FROM forum_threads WHERE title = ? AND author_user_id = ? AND created_at = ? LIMIT 1'
    ).get(topic.title, authorId, iso(topic.created_at))
    let threadId = exists?.id
    if (!threadId) {
      const result = db.prepare(
        `INSERT INTO forum_threads (
          category_id, author_user_id, title, content, attachments_json, is_pinned, is_locked,
          is_solved, views, created_at, updated_at, last_activity_at
        ) VALUES (?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        categoryId,
        authorId,
        text(topic.title, 240),
        text(original?.content, 12000) || 'Тему перенесено зі старої версії сайту.',
        topic.pinned ? 1 : 0,
        topic.locked ? 1 : 0,
        topic.solved ? 1 : 0,
        Number(topic.view_count || 0),
        iso(topic.created_at),
        iso(topic.updated_at),
        iso(topic.last_post_at || topic.updated_at)
      )
      threadId = Number(result.lastInsertRowid)
      report.forumThreads += 1
    }
    topicMap.set(topic.id, Number(threadId))

    for (const post of topicPosts) {
      if (post.id === original?.id) {
        postMap.set(post.id, Number(threadId))
        continue
      }
      const postAuthor = userMap.get(post.author_id)
      if (!postAuthor) continue
      const duplicate = db.prepare(
        'SELECT id FROM forum_posts WHERE thread_id = ? AND author_user_id = ? AND created_at = ? LIMIT 1'
      ).get(threadId, postAuthor, iso(post.created_at))
      let postId = duplicate?.id
      if (!postId) {
        const result = db.prepare(
          `INSERT INTO forum_posts (
            thread_id, author_user_id, content, attachments_json, created_at, updated_at
          ) VALUES (?, ?, ?, '[]', ?, ?)`
        ).run(threadId, postAuthor, text(post.content, 12000), iso(post.created_at), iso(post.updated_at))
        postId = Number(result.lastInsertRowid)
        report.forumPosts += 1
      }
      postMap.set(post.id, Number(postId))
    }
  }

  for (const like of topicLikes) {
    const threadId = topicMap.get(like.topic_id)
    const userId = userMap.get(like.user_id)
    if (!threadId || !userId) continue
    db.prepare(
      `INSERT OR IGNORE INTO forum_thread_likes (thread_id, user_id, created_at) VALUES (?, ?, ?)`
    ).run(threadId, userId, iso(like.created_at))
  }
  for (const like of postLikes) {
    const postId = postMap.get(like.post_id)
    const userId = userMap.get(like.user_id)
    if (!postId || !userId || !db.prepare('SELECT id FROM forum_posts WHERE id = ?').get(postId)) continue
    db.prepare(
      `INSERT OR IGNORE INTO forum_post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)`
    ).run(postId, userId, iso(like.created_at))
  }

  for (const vote of votes) {
    const serverId = serverMap.get(vote.server_id)
    if (!serverId) continue
    const userId = userMap.get(vote.user_id) || null
    const fingerprint = `legacy-vote:${vote.id}`
    const voteExists = db.prepare(
      'SELECT id FROM app_server_nickname_votes WHERE server_id = ? AND ip_address = ? LIMIT 1'
    ).get(serverId, fingerprint)
    if (!voteExists) {
      db.prepare(
        `INSERT INTO app_server_nickname_votes (
          server_id, nickname, ip_address, created_at
        ) VALUES (?, ?, ?, ?)`
      ).run(serverId, text(vote.nickname, 120) || 'Гравець', fingerprint, iso(vote.created_at))
    }
    if (userId) {
      db.prepare(
        `INSERT INTO app_server_votes (
          server_id, user_id, fingerprint, author_name, value, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(server_id, user_id) WHERE user_id IS NOT NULL DO UPDATE SET
          author_name = excluded.author_name,
          updated_at = CASE WHEN excluded.updated_at > updated_at THEN excluded.updated_at ELSE updated_at END`
      ).run(serverId, userId, fingerprint, text(vote.nickname, 120), iso(vote.created_at), iso(vote.created_at))
    }
    report.votes += 1
  }

  for (const like of likes) {
    const serverId = serverMap.get(like.server_id)
    const userId = userMap.get(like.user_id)
    if (!serverId || !userId) continue
    db.prepare(
      `INSERT OR IGNORE INTO app_server_likes (
        server_id, user_id, fingerprint, author_name, created_at
      ) VALUES (?, ?, ?, NULL, ?)`
    ).run(serverId, userId, `legacy-like:${like.server_id}:${like.user_id}`, iso(like.created_at))
    report.likes += 1
  }

  for (const review of reviews) {
    const serverId = serverMap.get(review.server_id)
    const userId = userMap.get(review.user_id) || null
    if (!serverId) continue
    db.prepare(
      `INSERT OR IGNORE INTO app_server_reviews (
        server_id, user_id, fingerprint, author_name, text, rating, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, 5, ?, ?)`
    ).run(
      serverId,
      userId,
      `legacy-review:${review.id}`,
      text(review.message, 5000),
      iso(review.created_at),
      iso(review.created_at)
    )
    report.reviews += 1
  }

  for (const view of views) {
    const serverId = serverMap.get(view.server_id)
    if (!serverId) continue
    const fingerprint = text(view.viewer_key, 255) || `legacy-view:${view.id}`
    const createdAt = iso(view.viewed_at)
    const viewExists = db.prepare(
      'SELECT id FROM app_server_views WHERE server_id = ? AND fingerprint = ? AND created_at = ? LIMIT 1'
    ).get(serverId, fingerprint, createdAt)
    if (!viewExists) {
      db.prepare(
        `INSERT INTO app_server_views (
          server_id, user_id, fingerprint, ip_address, country_code, referrer, traffic_source, created_at
        ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)`
      ).run(
        serverId,
        userMap.get(view.user_id) || null,
        fingerprint,
        text(view.referrer, 1000) || null,
        view.referrer ? 'referral' : 'direct',
        createdAt
      )
    }
    report.views += 1
  }

  for (const notification of notifications) {
    const userId = userMap.get(notification.user_id)
    if (!userId) continue
    const duplicate = db.prepare(
      'SELECT id FROM app_notifications WHERE user_id = ? AND title = ? AND created_at = ? LIMIT 1'
    ).get(userId, notification.title, iso(notification.created_at))
    if (duplicate) {
      db.prepare('UPDATE app_notifications SET is_read = 1 WHERE id = ?').run(duplicate.id)
      continue
    }
    let serverId = null
    const match = text(notification.link, 500).match(/server(?:s)?\/([^/?#]+)/i)
    if (match) serverId = serverMap.get(match[1]) || null
    db.prepare(
      `INSERT INTO app_notifications (
        user_id, server_id, type, title, body, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      serverId,
      text(notification.type, 80) || 'system',
      text(notification.title, 240),
      text(notification.body, 4000),
      1,
      iso(notification.created_at)
    )
    report.notifications += 1
  }

  for (const achievement of oldAchievements) {
    const userId = userMap.get(achievement.user_id)
    if (!userId) continue
    let current = db.prepare('SELECT id FROM app_achievements WHERE slug = ? LIMIT 1').get(achievement.achievement_key)
    if (!current) {
      const createdAt = iso(achievement.unlocked_at)
      const result = db.prepare(
        `INSERT INTO app_achievements (
          slug, name, description, emblem, trigger_type, trigger_value, is_active, sort_order, created_at, updated_at
        ) VALUES (?, ?, 'Перенесено зі старої версії Eyzencore.', '★', 'manual', 0, 1, 100, ?, ?)`
      ).run(achievement.achievement_key, legacyAchievementName(achievement.achievement_key), createdAt, createdAt)
      current = { id: Number(result.lastInsertRowid) }
    }
    db.prepare(
      `INSERT OR IGNORE INTO app_user_achievements (
        achievement_id, user_id, granted_by, earned_at
      ) VALUES (?, ?, 'legacy-import', ?)`
    ).run(current.id, userId, iso(achievement.unlocked_at))
    report.achievements += 1
  }
})

run()

const reportPath = path.resolve(root, 'backups', `nebula-import-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, JSON.stringify({
  importedAt: new Date().toISOString(),
  source: { host: pgHost, port: pgPort, database: pgDatabase },
  report,
  totals: {
    users: db.prepare('SELECT COUNT(*) AS count FROM app_users').get().count,
    servers: db.prepare('SELECT COUNT(*) AS count FROM app_servers').get().count,
    news: db.prepare('SELECT COUNT(*) AS count FROM app_news_posts').get().count,
    forumThreads: db.prepare('SELECT COUNT(*) AS count FROM forum_threads').get().count,
    forumPosts: db.prepare('SELECT COUNT(*) AS count FROM forum_posts').get().count,
    votes: db.prepare('SELECT COUNT(*) AS count FROM app_server_nickname_votes').get().count,
    notifications: db.prepare('SELECT COUNT(*) AS count FROM app_notifications').get().count,
  },
}, null, 2))

console.log(JSON.stringify({ report, reportPath }, null, 2))
db.close()
