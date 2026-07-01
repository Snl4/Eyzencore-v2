import { prisma } from '@/lib/prisma'

export type EngagementResetPreview = {
  nicknameVotes: number
  accountVotes: number
  likes: number
  totalVotes: number
  serversCount: number
}

export type EngagementResetBatch = {
  id: number
  label: string
  performedByEmail: string | null
  performedAt: string
  serversCount: number
  nicknameVotesArchived: number
  accountVotesArchived: number
  likesArchived: number
}

type CountRow = {
  nickname_votes: number | bigint
  account_votes: number | bigint
  likes: number | bigint
  servers_count: number | bigint
}

type BatchRow = {
  id: number | bigint
  label: string
  performed_by_email: string | null
  performed_at: string
  servers_count: number | bigint
  nickname_votes_archived: number | bigint
  account_votes_archived: number | bigint
  likes_archived: number | bigint
}

function nowIso(): string {
  return new Date().toISOString()
}

function buildDefaultLabel(): string {
  const formatter = new Intl.DateTimeFormat('uk-UA', {
    month: 'long',
    year: 'numeric',
  })
  return `Сезон ${formatter.format(new Date())}`
}

function mapBatchRow(row: BatchRow): EngagementResetBatch {
  return {
    id: Number(row.id),
    label: row.label,
    performedByEmail: row.performed_by_email,
    performedAt: row.performed_at,
    serversCount: Number(row.servers_count || 0),
    nicknameVotesArchived: Number(row.nickname_votes_archived || 0),
    accountVotesArchived: Number(row.account_votes_archived || 0),
    likesArchived: Number(row.likes_archived || 0),
  }
}

export async function getEngagementResetPreview(): Promise<EngagementResetPreview> {
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT
      (SELECT COUNT(*) FROM app_server_nickname_votes) AS nickname_votes,
      (SELECT COUNT(*) FROM app_server_votes) AS account_votes,
      (SELECT COUNT(*) FROM app_server_likes) AS likes,
      (SELECT COUNT(*) FROM app_servers) AS servers_count
  `
  const row = rows[0]
  const nicknameVotes = Number(row?.nickname_votes || 0)
  const accountVotes = Number(row?.account_votes || 0)
  const likes = Number(row?.likes || 0)
  return {
    nicknameVotes,
    accountVotes,
    likes,
    totalVotes: nicknameVotes + accountVotes,
    serversCount: Number(row?.servers_count || 0),
  }
}

export async function listEngagementResetBatches(limit = 24): Promise<EngagementResetBatch[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100))
  const rows = await prisma.$queryRawUnsafe<BatchRow[]>(
    `SELECT id, label, performed_by_email, performed_at, servers_count,
            nickname_votes_archived, account_votes_archived, likes_archived
     FROM app_engagement_reset_batches
     ORDER BY datetime(performed_at) DESC
     LIMIT ?`,
    safeLimit,
  )
  return rows.map(mapBatchRow)
}

export async function executeEngagementReset(input: {
  performedByUserId: string
  performedByEmail: string
  label?: string
}): Promise<EngagementResetBatch> {
  const label = String(input.label || buildDefaultLabel()).trim().slice(0, 120) || buildDefaultLabel()
  const performedAt = nowIso()
  const preview = await getEngagementResetPreview()
  if (preview.totalVotes === 0 && preview.likes === 0) {
    throw new Error('Немає активних голосів або лайків для скидання')
  }
  const batchId = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO app_engagement_reset_batches (
         label, performed_by_user_id, performed_by_email, performed_at,
         servers_count, nickname_votes_archived, account_votes_archived, likes_archived
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      label,
      input.performedByUserId,
      input.performedByEmail,
      performedAt,
      preview.serversCount,
      preview.nicknameVotes,
      preview.accountVotes,
      preview.likes,
    )
    const batchRows = await tx.$queryRawUnsafe<Array<{ id: number | bigint }>>(
      'SELECT last_insert_rowid() AS id',
    )
    const createdBatchId = Number(batchRows[0]?.id || 0)
    if (!createdBatchId) {
      throw new Error('Не вдалося створити запис скидання')
    }
    await tx.$executeRawUnsafe(
      `INSERT INTO app_engagement_reset_server_snapshots (
         batch_id, server_id, server_name, nickname_votes, account_votes, likes
       )
       SELECT
         ?,
         s.id,
         s.name,
         COALESCE((SELECT COUNT(*) FROM app_server_nickname_votes nv WHERE nv.server_id = s.id), 0),
         COALESCE((SELECT COUNT(*) FROM app_server_votes av WHERE av.server_id = s.id), 0),
         COALESCE((SELECT COUNT(*) FROM app_server_likes lk WHERE lk.server_id = s.id), 0)
       FROM app_servers s`,
      createdBatchId,
    )
    await tx.$executeRawUnsafe(
      `INSERT INTO app_server_nickname_votes_archive (
         batch_id, original_id, server_id, nickname, ip_address, created_at, archived_at
       )
       SELECT ?, id, server_id, nickname, ip_address, created_at, ?
       FROM app_server_nickname_votes`,
      createdBatchId,
      performedAt,
    )
    await tx.$executeRawUnsafe(
      `INSERT INTO app_server_votes_archive (
         batch_id, original_id, server_id, user_id, fingerprint, author_name, value, created_at, updated_at, archived_at
       )
       SELECT ?, id, server_id, user_id, fingerprint, author_name, value, created_at, updated_at, ?
       FROM app_server_votes`,
      createdBatchId,
      performedAt,
    )
    await tx.$executeRawUnsafe(
      `INSERT INTO app_server_likes_archive (
         batch_id, original_id, server_id, user_id, fingerprint, author_name, created_at, archived_at
       )
       SELECT ?, id, server_id, user_id, fingerprint, author_name, created_at, ?
       FROM app_server_likes`,
      createdBatchId,
      performedAt,
    )
    await tx.$executeRawUnsafe('DELETE FROM app_server_nickname_votes')
    await tx.$executeRawUnsafe('DELETE FROM app_server_votes')
    await tx.$executeRawUnsafe('DELETE FROM app_server_likes')
    return createdBatchId
  })
  const rows = await prisma.$queryRawUnsafe<BatchRow[]>(
    `SELECT id, label, performed_by_email, performed_at, servers_count,
            nickname_votes_archived, account_votes_archived, likes_archived
     FROM app_engagement_reset_batches
     WHERE id = ?
     LIMIT 1`,
    batchId,
  )
  const batch = rows[0]
  if (!batch) {
    throw new Error('Скидання виконано, але запис історії не знайдено')
  }
  return mapBatchRow(batch)
}
