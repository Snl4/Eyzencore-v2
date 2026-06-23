import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { normalizeServerAddress, type ServerPlatform } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { buildServerDashboardSlug, buildServerPublicPath } from '@/lib/server-slug';
import type { Server } from '@/lib/types';
import { ADMIN_EMAIL } from '@/lib/constants';

export const AUTH_COOKIE_NAME = 'eyzencore_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_RESET_TOKEN_TTL_SECONDS = 60 * 30;
const DEFAULT_VOTE_COOLDOWN_HOURS = 24;

export type UserRole = 'USER' | 'OWNER' | 'ADMIN';

type DbUserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  profile_slug: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  telegram: string | null;
  telegram_user_id?: string | null;
  telegram_username?: string | null;
  discord: string | null;
  discord_user_id?: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  role: string;
  is_legacy?: number | null;
  theme?: string | null;
  created_at: string;
  updated_at: string;
};

type DbSessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  created_at: string;
  revoked_at: string | null;
};

type DbPasswordResetTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  email?: string;
  full_name?: string;
};

type DbServerRow = {
  id: number;
  owner_id: string;
  owner_name: string;
  owner_avatar?: string | null;
  owner_slug?: string | null;
  name: string;
  addr: string;
  platform?: string | null;
  mode: string;
  ver: string;
  core: string;
  country: string | null;
  motd: string | null;
  short_desc: string | null;
  full_desc: string | null;
  desc: string | null;
  website: string | null;
  discord: string | null;
  telegram: string | null;
  donate: string | null;
  tiktok: string | null;
  launcher_url: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  gallery_json: string | null;
  videos_json: string | null;
  tags: string | null;
  online: number;
  players: number;
  max: number;
  uptime: string;
  verified: number;
  boosted: number;
  votes_count?: number | null;
  likes_count?: number | null;
  reviews_count?: number | null;
  average_rating?: number | null;
  cluster: number | null;
  cluster_id: number | null;
  cluster_name: string | null;
  cluster_slug: string | null;
  project_id: number | null;
  project_name: string | null;
  project_count: number | null;
  discord_guild_id?: string | null;
  discord_bot_verified?: number | null;
  discord_verify_code?: string | null;
  created_at: string;
  updated_at: string;
};

type DbServerOnlineSampleRow = {
  server_id: number;
  online: number;
  players: number;
  max: number;
  votes: number;
  views: number;
  recorded_at: string;
};

type DbServerReviewRow = {
  id: number;
  server_id: number;
  user_id: string | null;
  author_name: string | null;
  text: string;
  rating: number;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  avatar_url: string | null;
};

type DbNewsRow = {
  id: number;
  author_user_id: string;
  title: string;
  excerpt: string;
  content: string;
  content_json: string | null;
  category: string;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  profile_slug: string | null;
  avatar_url: string | null;
};


type DbServerVoteRow = {
  id: number;
  server_id: number;
  nickname: string;
  ip_address: string;
  vote_count?: number | null;
  created_at: string;
};

export type ServerReview = {
  id: number;
  serverId: number;
  userId: string | null;
  authorName: string;
  avatarUrl: string | null;
  text: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
};


export type ServerVoteEntry = {
  id: number;
  serverId: number;
  nickname: string;
  ipAddress: string;
  voteCount: number;
  createdAt: string;
};

export type NewsPost = {
  id: number;
  authorUserId: string;
  title: string;
  excerpt: string;
  content: string;
  blocks: NewsContentBlock[];
  category: string;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorSlug: string | null;
  authorAvatarUrl: string | null;
};

export type NewsBlockType = 'heading' | 'paragraph' | 'quote' | 'image' | 'video' | 'gallery';

export type NewsContentBlock = {
  id: string;
  type: NewsBlockType;
  text?: string;
  url?: string;
  urls?: string[];
  caption?: string;
};

type UpdateNewsPostInput = {
  newsId: number;
  actorUserId: string;
  isAdmin?: boolean;
  title: string;
  excerpt?: string;
  content?: string;
  blocks?: NewsContentBlock[];
  category?: string;
  coverUrl?: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  created_at: string;
  user_metadata: {
    full_name: string;
    profile_slug: string | null;
    bio: string;
    location: string;
    website: string | null;
    telegram: string | null;
    telegram_user_id: string | null;
    telegram_username: string | null;
    discord: string | null;
    discord_user_id: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    role: UserRole;
    is_legacy: boolean;
    theme: 'dark' | 'light';
  };
};

export type AuthSession = {
  id: string;
  created_at: string;
  current: boolean;
  user_agent: string | null;
};

export type PasswordResetRequest = {
  userId: string;
  email: string;
  fullName: string;
  token: string;
  expiresAt: string;
};

type PrismaRunResult = {
  changes: number;
  lastInsertRowid: number;
};

type PrismaStatement = {
  get: (...params: unknown[]) => Promise<unknown>;
  all: (...params: unknown[]) => Promise<unknown[]>;
  run: (...params: unknown[]) => Promise<PrismaRunResult>;
};

type PrismaDatabase = {
  prepare: (sql: string) => PrismaStatement;
  exec: (sql: string) => Promise<void>;
};

function normalizePrismaRawValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.map(normalizePrismaRawValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizePrismaRawValue(nestedValue)])
    );
  }
  return value;
}

const prismaDatabase: PrismaDatabase = {
  prepare(sql) {
    return {
      async get(...params) {
        const rows = await prisma.$queryRawUnsafe<unknown[]>(sql, ...params);
        return normalizePrismaRawValue(rows[0]);
      },
      async all(...params) {
        const rows = await prisma.$queryRawUnsafe<unknown[]>(sql, ...params);
        return normalizePrismaRawValue(rows) as unknown[];
      },
      async run(...params) {
        const changes = await prisma.$executeRawUnsafe(sql, ...params);
        const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint | number }>>(
          'SELECT last_insert_rowid() AS id'
        );
        return {
          changes,
          lastInsertRowid: Number(rows[0]?.id || 0),
        };
      },
    };
  },
  async exec(sql) {
    await prisma.$executeRawUnsafe(sql);
  },
};

function nowIso() {
  return new Date().toISOString();
}

export function normalizeReferralCode(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function getDb() {
  return prismaDatabase;
}

const SERVER_SELECT_COLUMNS = `
  s.id, s.owner_id, u.full_name AS owner_name, u.avatar_url AS owner_avatar, u.profile_slug AS owner_slug,
  s.name, s.addr, s.platform, s.mode, s.ver, s.core, s.country, s.motd, s.short_desc, s.full_desc, s.desc,
  s.website, s.discord, s.telegram, s.donate, s.tiktok, s.launcher_url, s.avatar_url, s.banner_url,
  s.gallery_json, s.videos_json, s.tags, s.online, s.players, s.max, s.uptime, s.verified, s.boosted,
  COALESCE((SELECT COUNT(*) FROM app_server_nickname_votes sv WHERE sv.server_id = s.id), 0) AS votes_count,
  COALESCE((SELECT COUNT(*) FROM app_server_likes sl WHERE sl.server_id = s.id), 0) AS likes_count,
  COALESCE((SELECT COUNT(*) FROM app_server_reviews sr WHERE sr.server_id = s.id), 0) AS reviews_count,
  COALESCE((SELECT AVG(sr.rating) FROM app_server_reviews sr WHERE sr.server_id = s.id), 0) AS average_rating,
  s.cluster_id, c.name AS cluster_name, c.slug AS cluster_slug,
  CASE WHEN s.cluster_id IS NULL THEN NULL ELSE (SELECT COUNT(*) FROM app_servers cs WHERE cs.cluster_id = s.cluster_id) END AS cluster,
  s.project_id, p.name AS project_name,
  CASE WHEN s.project_id IS NULL THEN NULL ELSE (SELECT COUNT(*) FROM app_servers ps WHERE ps.project_id = s.project_id) END AS project_count,
  s.discord_guild_id, s.discord_bot_verified, s.discord_verify_code, s.created_at, s.updated_at
`;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function ensureUniqueSlug(base: string) {
  const db = getDb();
  const cleanBase = slugify(base) || 'user';
  let candidate = cleanBase;
  let suffix = 2;

  while (
    await db
      .prepare('SELECT id FROM app_users WHERE profile_slug = ? LIMIT 1')
      .get(candidate)
  ) {
    candidate = `${cleanBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string) {
  if (/^\$2[aby]\$/.test(stored)) {
    return bcrypt.compareSync(password, stored);
  }
  const [algo, salt, existingHash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !existingHash) return false;
  const incomingHash = scryptSync(password, salt, 64);
  const existingBuffer = Buffer.from(existingHash, 'hex');
  if (incomingHash.length !== existingBuffer.length) return false;
  return timingSafeEqual(incomingHash, existingBuffer);
}

function normalizeUserRole(role: string | null | undefined): UserRole {
  const normalizedRole = String(role || '').trim().toUpperCase();
  if (normalizedRole === 'ADMIN') {
    return 'ADMIN';
  }
  if (normalizedRole === 'OWNER') {
    return 'OWNER';
  }
  return 'USER';
}

function mapUserRow(row: DbUserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    created_at: row.created_at,
    user_metadata: {
      full_name: row.full_name || '',
      profile_slug: row.profile_slug || null,
      bio: row.bio || '',
      location: row.location || '',
      website: row.website || null,
      telegram: row.telegram || null,
      telegram_user_id: row.telegram_user_id || null,
      telegram_username: row.telegram_username || null,
      discord: row.discord || null,
      discord_user_id: row.discord_user_id || null,
      avatar_url: row.avatar_url || null,
      banner_url: row.banner_url || null,
      role: resolveUserRole({ userId: row.id, role: row.role }),
      is_legacy: Boolean(row.is_legacy),
      theme: row.theme === 'light' ? 'light' : 'dark',
    },
  };
}

function getServerInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2) || 'SV'
  );
}

function mapServerRow(row: DbServerRow): Server {
  const tags = JSON.parse(row.tags || '[]') as string[];
  const gallery = JSON.parse(row.gallery_json || '[]') as string[];
  const videos = JSON.parse(row.videos_json || '[]') as string[];
  const votesCount = Number(row.votes_count || 0);
  const likesCount = Number(row.likes_count || 0);
  const reviewsCount = Number(row.reviews_count || 0);
  const averageRating = Number(row.average_rating || 0);
  const ratingScore = Number((
    averageRating * 12 +
    Math.log1p(votesCount) * 4 +
    Math.log1p(likesCount) * 3 +
    Math.log1p(reviewsCount) * 5
  ).toFixed(2));
  return {
    seed: Number(row.id),
    ic: getServerInitials(row.name),
    name: row.name,
    shortDesc: row.short_desc || '',
    fullDesc: row.full_desc || '',
    desc: row.desc || '',
    addr: row.addr,
    platform: (row.platform === 'discord' ? 'discord' : 'minecraft') as ServerPlatform,
    country: row.country || undefined,
    motd: row.motd || undefined,
    on: Boolean(row.online),
    players: Number(row.players || 0),
    max: Number(row.max || 0),
    ver: row.ver,
    mode: row.mode,
    core: row.platform === 'discord' || row.core === 'discord'
      ? 'discord'
      : ((row.core as 'java' | 'bedrock' | 'java_bedrock') || 'java'),
    uptime: row.uptime || 'new',
    rank: Number(row.id),
    ratingScore,
    averageRating,
    votesCount,
    likesCount,
    reviewsCount,
    verified: Boolean(row.verified),
    boosted: Boolean(row.boosted),
    cluster: row.cluster ?? undefined,
    clusterId: row.cluster_id ?? null,
    clusterName: row.cluster_name || null,
    clusterSlug: row.cluster_slug || null,
    tags,
    website: row.website || undefined,
    discord: row.discord || undefined,
    telegram: row.telegram || undefined,
    donate: row.donate || undefined,
    tiktok: row.tiktok || undefined,
    launcherUrl: row.launcher_url || undefined,
    avatarUrl: row.avatar_url || undefined,
    bannerUrl: row.banner_url || undefined,
    gallery,
    videos,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerAvatarUrl: row.owner_avatar || null,
    ownerSlug: row.owner_slug || null,
    createdAt: row.created_at,
    projectId: row.project_id ?? null,
    projectName: row.project_name || null,
    projectCount: row.project_count ?? null,
    discordGuildId: row.discord_guild_id || null,
    discordBotVerified: Boolean(row.discord_bot_verified),
    discordVerifyCode: row.discord_verify_code || null,
  };
}

function generateDiscordVerifyCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

function mapServerReviewRow(row: DbServerReviewRow): ServerReview {
  return {
    id: Number(row.id),
    serverId: Number(row.server_id),
    userId: row.user_id || null,
    authorName: String(row.full_name || row.author_name || 'Гість'),
    avatarUrl: row.avatar_url || null,
    text: String(row.text || ''),
    rating: Number(row.rating || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


function mapServerVoteRow(row: DbServerVoteRow): ServerVoteEntry {
  return {
    id: Number(row.id),
    serverId: Number(row.server_id),
    nickname: String(row.nickname || ''),
    ipAddress: String(row.ip_address || ''),
    voteCount: Math.max(1, Number(row.vote_count || 1)),
    createdAt: row.created_at,
  };
}

export function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getSessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS;
}

export function getPasswordResetTokenTtlSeconds() {
  return PASSWORD_RESET_TOKEN_TTL_SECONDS;
}

export async function createUser(input: { email: string; password: string; name?: string | null }) {
  const email = normalizeEmail(input.email);
  const fallbackName = email.split('@')[0] || 'user';
  const fullName = String(input.name || fallbackName).trim().slice(0, 120) || fallbackName;
  const db = getDb();
  const existing = await db.prepare('SELECT id FROM app_users WHERE email = ? LIMIT 1').get(email);

  if (existing) {
    throw new Error('User already exists');
  }

  const id = randomUUID();
  const timestamp = nowIso();
  const profileSlug = await ensureUniqueSlug(fullName || fallbackName);

  await db.prepare(
    `INSERT INTO app_users (
      id, email, password_hash, full_name, profile_slug, bio, location, website, telegram, discord, avatar_url, banner_url, role, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, '', '', NULL, NULL, NULL, NULL, NULL, 'USER', ?, ?)`
  ).run(id, email, hashPassword(input.password), fullName, profileSlug, timestamp, timestamp);

  const user = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(id) as DbUserRow;
  return mapUserRow(user);
}

export async function authenticateUser(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const db = getDb();
  const row = await db.prepare('SELECT * FROM app_users WHERE email = ? LIMIT 1').get(email) as DbUserRow | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    return null;
  }

  return mapUserRow(row);
}

export async function getUserByEmail(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const db = getDb();
  const row = await db.prepare('SELECT * FROM app_users WHERE email = ? LIMIT 1').get(email) as DbUserRow | undefined;
  return row ? mapUserRow(row) : null;
}

export async function createUserFromOAuthProfile(input: {
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM app_users WHERE email = ? LIMIT 1').get(email) as DbUserRow | undefined;
  const timestamp = nowIso();

  if (existing) {
    if (input.avatarUrl && !existing.avatar_url) {
      await db.prepare('UPDATE app_users SET avatar_url = ?, updated_at = ? WHERE id = ?').run(
        String(input.avatarUrl).trim(),
        timestamp,
        existing.id,
      );
      const updated = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(existing.id) as DbUserRow;
      return mapUserRow(updated);
    }
    return mapUserRow(existing);
  }

  const fallbackName = email.split('@')[0] || 'user';
  const fullName = String(input.fullName || fallbackName).trim().slice(0, 120) || fallbackName;
  const id = randomUUID();
  const profileSlug = await ensureUniqueSlug(fullName);
  const passwordHash = hashPassword(randomBytes(24).toString('hex'));

  await db.prepare(
    `INSERT INTO app_users (
      id, email, password_hash, full_name, profile_slug, bio, location, website, telegram, discord, avatar_url, banner_url, role, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, '', '', NULL, NULL, NULL, ?, NULL, 'USER', ?, ?)`
  ).run(
    id,
    email,
    passwordHash,
    fullName,
    profileSlug,
    String(input.avatarUrl || '').trim() || null,
    timestamp,
    timestamp,
  );

  const user = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(id) as DbUserRow;
  return mapUserRow(user);
}

export async function authenticateCmsAdmin(emailInput: string, password: string) {
  const user = await authenticateUser(emailInput, password);
  if (!user) return null;

  const role = user.user_metadata.role;
  if (role !== 'ADMIN' && normalizeEmail(user.email) !== normalizeEmail(ADMIN_EMAIL)) {
    return null;
  }

  return user;
}

export async function createCmsSession(
  userId: string,
  maxAgeSeconds: number,
  userAgent?: string | null
) {
  const db = getDb();
  const sessionId = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();

  await db.prepare(
    `INSERT INTO cms_sessions (
      id, user_id, token_hash, user_agent, created_at, expires_at, revoked_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL)`
  ).run(
    sessionId,
    userId,
    hashSessionToken(token),
    String(userAgent || '').slice(0, 400) || null,
    createdAt,
    expiresAt
  );

  return { sessionId, token, expiresAt };
}

export async function getCmsSessionFromToken(
  token: string | undefined | null
): Promise<{ user: AuthUser; sessionId: string } | null> {
  if (!token) return null;

  const db = getDb();
  const row = await db.prepare(
    `SELECT
       s.id AS session_id,
       u.id,
       u.email,
       u.password_hash,
       u.full_name,
       u.profile_slug,
       u.bio,
       u.location,
       u.website,
       u.telegram,
       u.telegram_user_id,
       u.telegram_username,
       u.discord,
       u.discord_user_id,
       u.avatar_url,
       u.banner_url,
       u.role,
       u.theme,
       u.created_at,
       u.updated_at
     FROM cms_sessions s
     JOIN app_users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND s.revoked_at IS NULL
       AND datetime(s.expires_at) > datetime('now')
     LIMIT 1`
  ).get(hashSessionToken(token)) as (DbUserRow & { session_id: string }) | undefined;

  if (!row) return null;

  const user = mapUserRow(row);
  if (
    user.user_metadata.role !== 'ADMIN' &&
    normalizeEmail(user.email) !== normalizeEmail(ADMIN_EMAIL)
  ) {
    return null;
  }

  return { user, sessionId: row.session_id };
}

export async function revokeCmsSessionByToken(token: string | undefined | null) {
  if (!token) return;
  const db = getDb();
  await db.prepare(
    'UPDATE cms_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL'
  ).run(nowIso(), hashSessionToken(token));
}

export async function createSession(userId: string, userAgent?: string | null) {
  const db = getDb();
  const sessionId = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const createdAt = nowIso();

  await db.prepare(
    `INSERT INTO user_login_sessions (id, user_id, token_hash, user_agent, created_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, NULL)`
  ).run(sessionId, userId, hashSessionToken(token), String(userAgent || '').slice(0, 400) || null, createdAt);

  return { sessionId, token };
}

export async function getAuthSessionFromToken(
  token: string | undefined | null
): Promise<{ user: AuthUser; sessionId: string } | null> {
  if (!token) return null;

  const db = getDb();
  const row = await db
    .prepare(
      `SELECT
         s.id AS session_id,
         u.id,
         u.email,
         u.password_hash,
         u.full_name,
         u.profile_slug,
         u.bio,
         u.location,
         u.website,
         u.telegram,
         u.telegram_user_id,
         u.telegram_username,
         u.discord,
         u.discord_user_id,
         u.avatar_url,
         u.banner_url,
         u.role,
         u.theme,
         u.created_at,
         u.updated_at
       FROM user_login_sessions s
       JOIN app_users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL
       LIMIT 1`
    )
    .get(hashSessionToken(token)) as (DbUserRow & { session_id: string }) | undefined;

  if (!row) return null;

  return {
    user: mapUserRow(row),
    sessionId: row.session_id,
  };
}

export async function revokeSessionByToken(token: string | undefined | null) {
  if (!token) return;
  const db = getDb();
  await db.prepare('UPDATE user_login_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').run(
    nowIso(),
    hashSessionToken(token)
  );
}

export async function listSessions(userId: string, currentSessionId?: string | null) {
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT id, user_id, token_hash, user_agent, created_at, revoked_at
       FROM user_login_sessions
       WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY datetime(created_at) DESC`
    )
    .all(userId) as DbSessionRow[];

  return rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    current: row.id === currentSessionId,
    user_agent: row.user_agent,
  })) satisfies AuthSession[];
}

export async function revokeSessionById(userId: string, sessionId: string) {
  const db = getDb();
  await db.prepare(
    'UPDATE user_login_sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL'
  ).run(nowIso(), sessionId, userId);
}

export async function revokeOtherSessions(userId: string, currentSessionId: string) {
  const db = getDb();
  await db.prepare(
    'UPDATE user_login_sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL'
  ).run(nowIso(), userId, currentSessionId);
}

export async function revokeAllSessionsForUser(userId: string) {
  const db = getDb();
  await db.prepare(
    'UPDATE user_login_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL'
  ).run(nowIso(), userId);
}

export async function updatePassword(userId: string, currentPassword: string, nextPassword: string) {
  const db = getDb();
  const row = await db.prepare('SELECT password_hash FROM app_users WHERE id = ? LIMIT 1').get(userId) as
    | { password_hash: string }
    | undefined;

  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    throw new Error('Current password is incorrect');
  }

  await db.prepare('UPDATE app_users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(nextPassword),
    nowIso(),
    userId
  );
}

export async function createPasswordResetRequest(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const db = getDb();
  const user = await db.prepare(
    'SELECT id, email, full_name FROM app_users WHERE email = ? LIMIT 1'
  ).get(email) as { id: string; email: string; full_name: string } | undefined;

  if (!user) {
    return null;
  }

  await db.prepare(
    `DELETE FROM password_reset_tokens
     WHERE user_id = ?
        OR datetime(expires_at) <= datetime('now')
        OR used_at IS NOT NULL`
  ).run(user.id);

  const id = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000).toISOString();

  await db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, created_at, expires_at, used_at)
     VALUES (?, ?, ?, ?, ?, NULL)`
  ).run(id, user.id, hashSessionToken(token), createdAt, expiresAt);

  return {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    token,
    expiresAt,
  } satisfies PasswordResetRequest;
}

export async function getPasswordResetRequest(token: string) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return null;
  }

  const db = getDb();
  const row = await db.prepare(
    `SELECT
       prt.id,
       prt.user_id,
       prt.token_hash,
       prt.created_at,
       prt.expires_at,
       prt.used_at,
       u.email,
       u.full_name
     FROM password_reset_tokens prt
     JOIN app_users u ON u.id = prt.user_id
     WHERE prt.token_hash = ?
       AND prt.used_at IS NULL
       AND datetime(prt.expires_at) > datetime('now')
     LIMIT 1`
  ).get(hashSessionToken(normalizedToken)) as DbPasswordResetTokenRow | undefined;

  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    email: String(row.email || ''),
    fullName: String(row.full_name || ''),
    token: normalizedToken,
    expiresAt: row.expires_at,
  } satisfies PasswordResetRequest;
}

export async function resetPasswordWithToken(token: string, nextPassword: string) {
  if (String(nextPassword || '').length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const activeRequest = await getPasswordResetRequest(token);
  if (!activeRequest) {
    throw new Error('Reset token is invalid or expired');
  }

  const db = getDb();
  const timestamp = nowIso();

  await db.prepare(
    'UPDATE app_users SET password_hash = ?, updated_at = ? WHERE id = ?'
  ).run(hashPassword(nextPassword), timestamp, activeRequest.userId);

  await db.prepare(
    `UPDATE password_reset_tokens
     SET used_at = ?
     WHERE user_id = ?
       AND used_at IS NULL`
  ).run(timestamp, activeRequest.userId);

  await revokeAllSessionsForUser(activeRequest.userId);

  return { success: true };
}

const MAX_IMAGE_DATA_URL_LENGTH = 1_500_000;

function sanitizeImageUrl(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new Error(`${field} is too large (limit ~1MB)`);
  }
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 2048);
  // Site-relative paths produced by /api/uploads.
  if (trimmed.startsWith('/api/uploads/')) return trimmed.slice(0, 2048);
  if (trimmed.startsWith('/uploads/')) return trimmed.slice(0, 2048);
  throw new Error(`${field} must be an image URL or data URL`);
}

function sanitizeHandle(value: string) {
  const cleaned = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return cleaned;
}

function normalizeBio(value: string): string {
  return String(value || '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export async function updateProfile(
  userId: string,
  input: {
    full_name?: string;
    profile_slug?: string;
    bio?: string;
    location?: string;
    website?: string;
    telegram?: string;
    discord?: string;
    avatar_url?: string | null;
    banner_url?: string | null;
  }
) {
  const db = getDb();
  const current = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(userId) as
    | DbUserRow
    | undefined;
  if (!current) {
    throw new Error('User not found');
  }

  const fullName =
    input.full_name === undefined
      ? current.full_name
      : String(input.full_name || '').trim().slice(0, 120);
  if (!fullName) {
    throw new Error('Name is required');
  }

  let nextSlug = current.profile_slug;
  if (input.profile_slug !== undefined) {
    const requested = sanitizeHandle(String(input.profile_slug));
    if (!requested) {
      throw new Error('Handle is required');
    }
    if (requested !== current.profile_slug) {
      const taken = await db
        .prepare('SELECT id FROM app_users WHERE profile_slug = ? AND id != ? LIMIT 1')
        .get(requested, userId);
      if (taken) {
        throw new Error('This handle is already taken');
      }
      nextSlug = requested;
    }
  } else if (!nextSlug) {
    nextSlug = await ensureUniqueSlug(fullName);
  }

  const bio =
    input.bio === undefined
      ? normalizeBio(String(current.bio || '')).slice(0, 250)
      : normalizeBio(String(input.bio || '')).slice(0, 250);
  const location =
    input.location === undefined
      ? current.location || ''
      : String(input.location || '').slice(0, 120);
  const website =
    input.website === undefined
      ? current.website
      : String(input.website || '').trim().slice(0, 240) || null;
  const telegram =
    input.telegram === undefined
      ? current.telegram
      : String(input.telegram || '').trim().slice(0, 240) || null;
  const discord =
    input.discord === undefined
      ? current.discord
      : String(input.discord || '').trim().slice(0, 240) || null;
  const avatarUrl =
    input.avatar_url === undefined ? current.avatar_url : sanitizeImageUrl(input.avatar_url, 'Avatar');
  const bannerUrl =
    input.banner_url === undefined ? current.banner_url : sanitizeImageUrl(input.banner_url, 'Banner');

  await db.prepare(
    `UPDATE app_users
     SET full_name = ?, profile_slug = ?, bio = ?, location = ?, website = ?,
         telegram = ?, discord = ?, avatar_url = ?, banner_url = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    fullName,
    nextSlug,
    bio,
    location,
    website,
    telegram,
    discord,
    avatarUrl,
    bannerUrl,
    nowIso(),
    userId
  );

  const row = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(userId) as DbUserRow;
  return mapUserRow(row);
}

export async function countServersByOwner(userId: string) {
  const db = getDb();
  const row = await db
    .prepare('SELECT COUNT(*) AS c FROM app_servers WHERE owner_id = ?')
    .get(userId) as { c: number };
  return Number(row?.c || 0);
}

async function ensureOwnerRole(userId: string) {
  const db = getDb();
  await db.prepare(
    `UPDATE app_users
     SET role = 'OWNER', updated_at = ?
     WHERE id = ?
       AND role = 'USER'`
  ).run(nowIso(), userId);
}

export async function getUserByProfileSlug(profileSlug: string) {
  const normalizedSlug = String(profileSlug || '').trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }
  const db = getDb();
  const row = await db
    .prepare('SELECT * FROM app_users WHERE lower(profile_slug) = lower(?) LIMIT 1')
    .get(normalizedSlug) as DbUserRow | undefined;
  if (!row) {
    return null;
  }
  return mapUserRow(row);
}

export async function listServersByOwner(userId: string) {
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT ${SERVER_SELECT_COLUMNS}
       FROM app_servers s
       JOIN app_users u ON u.id = s.owner_id
       LEFT JOIN app_clusters c ON c.id = s.cluster_id
       LEFT JOIN app_projects p ON p.id = s.project_id
       WHERE s.owner_id = ?
       ORDER BY s.id ASC`
    )
    .all(userId) as DbServerRow[];
  return mergeLatestOnlineSamples(rows.map(mapServerRow));
}

export async function listServers() {
  const db = getDb();
  const rows = await db.prepare(
    `SELECT ${SERVER_SELECT_COLUMNS}
     FROM app_servers s
     JOIN app_users u ON u.id = s.owner_id
     LEFT JOIN app_clusters c ON c.id = s.cluster_id
     LEFT JOIN app_projects p ON p.id = s.project_id
     ORDER BY s.id ASC`
  ).all() as DbServerRow[];

  const servers = await mergeLatestOnlineSamples(rows.map(mapServerRow));
  return servers
    .sort((left, right) =>
      Number(Boolean(right.boosted)) - Number(Boolean(left.boosted)) ||
      Number(right.ratingScore || 0) - Number(left.ratingScore || 0) ||
      Number(right.averageRating || 0) - Number(left.averageRating || 0) ||
      Number(right.votesCount || 0) - Number(left.votesCount || 0) ||
      right.players - left.players ||
      left.seed - right.seed
    )
    .map((server, index) => ({ ...server, rank: index + 1 }));
}

export async function listPlatformOnlineHistory(hours = 24) {
  const db = getDb();
  const safeHours = Math.max(1, Math.min(Number(hours || 24), 168));
  const rows = await db
    .prepare(
      `SELECT latest.hour_key, SUM(latest.players) AS players
       FROM (
         SELECT samples.server_id, substr(samples.recorded_at, 1, 13) AS hour_key, samples.players
         FROM app_server_online_samples samples
         JOIN (
           SELECT server_id, substr(recorded_at, 1, 13) AS hour_key, MAX(recorded_at) AS recorded_at
           FROM app_server_online_samples
           WHERE datetime(recorded_at) >= datetime('now', ?)
           GROUP BY server_id, substr(recorded_at, 1, 13)
         ) grouped
           ON grouped.server_id = samples.server_id
          AND grouped.recorded_at = samples.recorded_at
       ) latest
       GROUP BY latest.hour_key
       ORDER BY latest.hour_key ASC`
    )
    .all(`-${safeHours} hours`) as Array<{ hour_key: string; players: number }>;

  return rows.map((row) => ({
    time: `${row.hour_key}:00:00.000Z`,
    players: Number(row.players || 0),
  }));
}

async function mergeLatestOnlineSamples(servers: Server[]) {
  if (servers.length === 0) {
    return servers;
  }
  const db = getDb();
  const serverIds = servers.map((server) => server.seed);
  const placeholders = serverIds.map(() => '?').join(', ');
  const latestRows = await db
    .prepare(
      `SELECT latest.server_id, latest.online, latest.players, latest.max
       FROM app_server_online_samples latest
       JOIN (
         SELECT server_id, MAX(recorded_at) AS recorded_at
         FROM app_server_online_samples
         WHERE server_id IN (${placeholders})
         GROUP BY server_id
       ) grouped
         ON grouped.server_id = latest.server_id
        AND grouped.recorded_at = latest.recorded_at`
    )
    .all(...serverIds) as Array<Pick<DbServerOnlineSampleRow, 'server_id' | 'online' | 'players' | 'max'>>;
  const latestByServerId = new Map<number, Pick<DbServerOnlineSampleRow, 'online' | 'players' | 'max'>>();
  latestRows.forEach((row) => {
    latestByServerId.set(Number(row.server_id), {
      online: Number(row.online || 0),
      players: Number(row.players || 0),
      max: Number(row.max || 0),
    });
  });
  return servers.map((server) => {
    const latest = latestByServerId.get(server.seed);
    if (!latest) {
      return server;
    }
    return {
      ...server,
      on: Boolean(latest.online),
      players: Number(latest.players || 0),
      max: Number(latest.max || 0),
    };
  });
}

export async function getServerById(id: number) {
  const db = getDb();
  const row = await db.prepare(
    `SELECT ${SERVER_SELECT_COLUMNS}
     FROM app_servers s
     JOIN app_users u ON u.id = s.owner_id
     LEFT JOIN app_clusters c ON c.id = s.cluster_id
     LEFT JOIN app_projects p ON p.id = s.project_id
     WHERE s.id = ?
     LIMIT 1`
  ).get(id) as DbServerRow | undefined;

  return row ? mapServerRow(row) : null;
}

export async function findServerByAddress(addr: string, platform: ServerPlatform = 'minecraft') {
  const db = getDb();
  const normalizedAddr = normalizeServerAddress(addr, platform);
  const row = await db.prepare(
    `SELECT ${SERVER_SELECT_COLUMNS}
     FROM app_servers s
     JOIN app_users u ON u.id = s.owner_id
     LEFT JOIN app_clusters c ON c.id = s.cluster_id
     LEFT JOIN app_projects p ON p.id = s.project_id
     WHERE lower(s.addr) = lower(?)
     LIMIT 1`
  ).get(normalizedAddr) as DbServerRow | undefined;

  return row ? mapServerRow(row) : null;
}

export async function createServer(input: {
  ownerId: string;
  name: string;
  addr: string;
  platform?: ServerPlatform;
  mode: string;
  ver: string;
  core?: 'java' | 'bedrock' | 'java_bedrock';
  country?: string;
  motd?: string;
  shortDesc?: string;
  fullDesc?: string;
  desc?: string;
  website?: string;
  discord?: string;
  telegram?: string;
  donate?: string;
  tiktok?: string;
  launcherUrl?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  gallery?: string[];
  videos?: string[];
  tags?: string[];
  projectId?: number | null;
}) {
  const db = getDb();
  await ensureOwnerRole(input.ownerId);
  const platform: ServerPlatform = input.platform === 'discord' ? 'discord' : 'minecraft';
  const normalizedAddr = normalizeServerAddress(input.addr, platform);
  const existing = await db.prepare('SELECT id FROM app_servers WHERE lower(addr) = lower(?) LIMIT 1').get(normalizedAddr);
  if (existing) {
    throw new Error('Сервер із цією адресою вже існує');
  }

  const timestamp = nowIso();
  const discordVerifyCode = platform === 'discord' ? generateDiscordVerifyCode() : null;
  const result = await db.prepare(
    `INSERT INTO app_servers (
      owner_id, name, addr, platform, mode, ver, core, country, motd, short_desc, full_desc, desc, website, discord, telegram, donate, tiktok, launcher_url,
      avatar_url, banner_url, gallery_json, videos_json, tags, online, players, max, uptime, verified, cluster_id, project_id,
      discord_guild_id, discord_bot_verified, discord_verify_code, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'new', 0, NULL, ?, NULL, 0, ?, ?, ?)`
  ).run(
    input.ownerId,
    String(input.name || '').trim(),
    normalizedAddr,
    platform,
    String(input.mode || '').trim(),
    String(input.ver || '').trim(),
    platform === 'discord' ? 'discord' : String(input.core || 'java').trim(),
    String(input.country || '').trim() || null,
    String(input.motd || '').trim() || null,
    String(input.shortDesc || '').trim(),
    String(input.fullDesc || '').trim(),
    String(input.desc || '').trim(),
    String(input.website || '').trim() || null,
    String(input.discord || '').trim() || null,
    String(input.telegram || '').trim() || null,
    String(input.donate || '').trim() || null,
    String(input.tiktok || '').trim() || null,
    String(input.launcherUrl || '').trim() || null,
    String(input.avatarUrl || '').trim() || null,
    String(input.bannerUrl || '').trim() || null,
    JSON.stringify((input.gallery || []).slice(0, 6)),
    JSON.stringify((input.videos || []).slice(0, 2)),
    JSON.stringify(input.tags || []),
    input.projectId ?? null,
    discordVerifyCode,
    timestamp,
    timestamp
  ) as { lastInsertRowid?: number | bigint };

  return getServerById(Number(result.lastInsertRowid));
}

export async function getUserByDiscordId(discordUserId: string) {
  const db = getDb();
  const row = await db
    .prepare('SELECT * FROM app_users WHERE discord_user_id = ? LIMIT 1')
    .get(String(discordUserId).trim()) as DbUserRow | undefined;
  return row ? mapUserRow(row) : null;
}

export async function createUserFromDiscordProfile(input: {
  discordUserId: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  discordProfileUrl?: string | null;
}) {
  const db = getDb();
  const discordUserId = String(input.discordUserId).trim();
  const existingDiscord = getUserByDiscordId(discordUserId);
  if (existingDiscord) {
    return existingDiscord;
  }
  const email = normalizeEmail(input.email);
  const existingEmail = await db.prepare('SELECT id FROM app_users WHERE email = ? LIMIT 1').get(email);
  if (existingEmail) {
    throw new Error('Email вже використовується іншим акаунтом');
  }
  const id = randomUUID();
  const timestamp = nowIso();
  const profileSlug = await ensureUniqueSlug(input.fullName);
  const passwordHash = hashPassword(randomBytes(24).toString('hex'));
  await db.prepare(
    `INSERT INTO app_users (
      id, email, password_hash, full_name, profile_slug, bio, location, website, telegram, discord, discord_user_id,
      avatar_url, banner_url, role, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, '', '', NULL, NULL, ?, ?, ?, NULL, 'USER', ?, ?)`
  ).run(
    id,
    email,
    passwordHash,
    String(input.fullName || 'Discord User').trim().slice(0, 120),
    profileSlug,
    String(input.discordProfileUrl || '').trim() || null,
    discordUserId,
    String(input.avatarUrl || '').trim() || null,
    timestamp,
    timestamp
  );
  const user = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(id) as DbUserRow;
  return mapUserRow(user);
}

export async function linkDiscordUserAccount(input: {
  userId: string;
  discordUserId: string;
  discordProfileUrl?: string | null;
  avatarUrl?: string | null;
}) {
  const db = getDb();
  const discordUserId = String(input.discordUserId).trim();
  const occupied = await db
    .prepare('SELECT id FROM app_users WHERE discord_user_id = ? AND id != ? LIMIT 1')
    .get(discordUserId, input.userId);
  if (occupied) {
    throw new Error('Цей Discord акаунт вже привʼязаний до іншого користувача');
  }
  const timestamp = nowIso();
  await db.prepare(
    `UPDATE app_users
     SET discord_user_id = ?, discord = COALESCE(?, discord), avatar_url = COALESCE(?, avatar_url), updated_at = ?
     WHERE id = ?`
  ).run(
    discordUserId,
    String(input.discordProfileUrl || '').trim() || null,
    String(input.avatarUrl || '').trim() || null,
    timestamp,
    input.userId
  );
  const user = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(input.userId) as DbUserRow;
  return mapUserRow(user);
}

export async function unlinkDiscordUserAccount(userId: string) {
  const db = getDb();
  await db.prepare(
    `UPDATE app_users SET discord_user_id = NULL, updated_at = ? WHERE id = ?`
  ).run(nowIso(), userId);
  const user = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(userId) as DbUserRow;
  return mapUserRow(user);
}

function getTelegramLinkSecret() {
  return String(process.env.TELEGRAM_LINK_SECRET || process.env.TELEGRAM_BOT_TOKEN || process.env.JWT_SECRET || 'eyzencore-telegram-dev').trim();
}

function signTelegramLinkPayload(payload: string) {
  return createHmac('sha256', getTelegramLinkSecret()).update(payload).digest('base64url');
}

export function getTelegramBotUsername() {
  return String(process.env.VITE_TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
}

export function createTelegramLinkToken(userId: string) {
  const expiresAt = Date.now() + 1000 * 60 * 15;
  const payload = Buffer.from(JSON.stringify({ userId, exp: expiresAt })).toString('base64url');
  const signature = signTelegramLinkPayload(payload);
  return `${payload}.${signature}`;
}

function parseTelegramLinkToken(token: string) {
  const [payload, signature] = String(token || '').trim().split('.');
  if (!payload || !signature) {
    throw new Error('Некоректний Telegram token');
  }
  const expected = signTelegramLinkPayload(payload);
  const incoming = Buffer.from(signature);
  const valid = Buffer.from(expected);
  if (incoming.length !== valid.length || !timingSafeEqual(incoming, valid)) {
    throw new Error('Telegram token недійсний');
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userId?: string; exp?: number };
  if (!decoded.userId || !decoded.exp || decoded.exp < Date.now()) {
    throw new Error('Telegram token застарів');
  }
  return decoded.userId;
}

export async function linkTelegramUserAccount(input: {
  token: string;
  telegramUserId: string;
  username?: string | null;
}) {
  const userId = parseTelegramLinkToken(input.token);
  const telegramUserId = String(input.telegramUserId || '').trim();
  const username = String(input.username || '').trim().replace(/^@/, '').slice(0, 80) || null;
  if (!telegramUserId) {
    throw new Error('Telegram ID відсутній');
  }
  const db = getDb();
  const occupied = await db
    .prepare('SELECT id FROM app_users WHERE telegram_user_id = ? AND id != ? LIMIT 1')
    .get(telegramUserId, userId);
  if (occupied) {
    throw new Error('Цей Telegram акаунт вже привʼязаний до іншого користувача');
  }
  const timestamp = nowIso();
  const telegramUrl = username ? `https://t.me/${username}` : `tg://user?id=${telegramUserId}`;
  await db.prepare(
    `UPDATE app_users
     SET telegram_user_id = ?, telegram_username = ?, telegram = ?, updated_at = ?
     WHERE id = ?`
  ).run(telegramUserId, username, telegramUrl, timestamp, userId);
  const user = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(userId) as DbUserRow;
  return mapUserRow(user);
}

export async function unlinkTelegramUserAccount(userId: string) {
  const db = getDb();
  await db.prepare(
    `UPDATE app_users
     SET telegram_user_id = NULL, telegram_username = NULL, telegram = NULL, updated_at = ?
     WHERE id = ?`
  ).run(nowIso(), userId);
  const user = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(userId) as DbUserRow;
  return mapUserRow(user);
}

export async function verifyDiscordServerByBot(input: { code: string; guildId: string; guildName?: string }) {
  const db = getDb();
  const normalizedCode = String(input.code || '').trim().toUpperCase();
  const guildId = String(input.guildId || '').trim();
  if (!normalizedCode || !guildId) {
    throw new Error('Код або guild ID відсутні');
  }
  const row = await db
    .prepare(
      `SELECT id, name, platform FROM app_servers
       WHERE upper(discord_verify_code) = ? AND platform = 'discord'
       LIMIT 1`
    )
    .get(normalizedCode) as { id: number; name: string; platform: string } | undefined;
  if (!row) {
    throw new Error('Невірний код верифікації');
  }
  await db.prepare(
    `UPDATE app_servers
     SET discord_guild_id = ?, discord_bot_verified = 1, verified = 1, updated_at = ?
     WHERE id = ?`
  ).run(guildId, nowIso(), row.id);
  return { serverId: Number(row.id), serverName: row.name };
}

export async function syncDiscordGuildStats(input: {
  guildId: string;
  players: number;
  max: number;
  guildName?: string;
}) {
  const db = getDb();
  const guildId = String(input.guildId || '').trim();
  if (!guildId) {
    return 0;
  }
  const servers = await db
    .prepare(`SELECT id FROM app_servers WHERE discord_guild_id = ? AND platform = 'discord'`)
    .all(guildId) as Array<{ id: number }>;
  if (servers.length === 0) {
    return 0;
  }
  const timestamp = nowIso();
  await Promise.all(servers.map(async (server) => {
    await db.prepare(
      `UPDATE app_servers SET online = 1, players = ?, max = ?, updated_at = ? WHERE id = ?`
    ).run(Number(input.players || 0), Number(input.max || 0), timestamp, server.id);
    await db.prepare(
      `INSERT INTO app_server_online_samples (server_id, online, players, max, votes, views, recorded_at)
       VALUES (?, 1, ?, ?, 0, 0, ?)`
    ).run(server.id, Number(input.players || 0), Number(input.max || 0), timestamp);
  }));
  return servers.length;
}

export async function updateServerDiscordGuildId(serverId: number, guildId: string | null) {
  const db = getDb();
  await db.prepare(`UPDATE app_servers SET discord_guild_id = ?, updated_at = ? WHERE id = ?`).run(
    guildId ? String(guildId).trim() : null,
    nowIso(),
    serverId
  );
}

export async function updateServerById(
  input: {
    serverId: number;
    ownerId: string;
    name: string;
    addr: string;
    platform?: ServerPlatform;
    mode: string;
    ver: string;
    core: 'java' | 'bedrock' | 'java_bedrock' | 'discord';
    country?: string;
    motd?: string;
    shortDesc?: string;
    fullDesc?: string;
    desc?: string;
    website?: string;
    discord?: string;
    telegram?: string;
    donate?: string;
    tiktok?: string;
    launcherUrl?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    gallery?: string[];
    videos?: string[];
    tags?: string[];
    projectId?: number | null;
  }
) {
  const db = getDb();
  const existing = await db
    .prepare('SELECT id FROM app_servers WHERE id = ? AND owner_id = ? LIMIT 1')
    .get(input.serverId, input.ownerId);
  if (!existing) {
    throw new Error('Сервер не знайдено або доступ заборонено');
  }
  const platform: ServerPlatform = input.platform === 'discord' ? 'discord' : 'minecraft';
  const normalizedAddr = normalizeServerAddress(input.addr, platform);
  const duplicate = await db
    .prepare('SELECT id FROM app_servers WHERE lower(addr) = lower(?) AND id != ? LIMIT 1')
    .get(normalizedAddr, input.serverId);
  if (duplicate) {
    throw new Error('Сервер із цією адресою вже існує');
  }
  await db.prepare(
    `UPDATE app_servers
     SET name = ?, addr = ?, platform = ?, mode = ?, ver = ?, core = ?, country = ?, motd = ?, short_desc = ?, full_desc = ?, desc = ?,
         website = ?, discord = ?, telegram = ?, donate = ?, tiktok = ?, launcher_url = ?, avatar_url = ?, banner_url = ?,
         gallery_json = ?, videos_json = ?, tags = ?, project_id = ?, updated_at = ?
     WHERE id = ? AND owner_id = ?`
  ).run(
    String(input.name || '').trim(),
    normalizedAddr,
    platform,
    String(input.mode || '').trim(),
    String(input.ver || '').trim(),
    platform === 'discord' ? 'discord' : String(input.core || 'java').trim(),
    String(input.country || '').trim() || null,
    String(input.motd || '').trim() || null,
    String(input.shortDesc || '').trim(),
    String(input.fullDesc || '').trim(),
    String(input.desc || '').trim(),
    String(input.website || '').trim() || null,
    String(input.discord || '').trim() || null,
    String(input.telegram || '').trim() || null,
    String(input.donate || '').trim() || null,
    String(input.tiktok || '').trim() || null,
    String(input.launcherUrl || '').trim() || null,
    String(input.avatarUrl || '').trim() || null,
    String(input.bannerUrl || '').trim() || null,
    JSON.stringify((input.gallery || []).slice(0, 6)),
    JSON.stringify((input.videos || []).slice(0, 2)),
    JSON.stringify((input.tags || []).slice(0, 6)),
    input.projectId ?? null,
    nowIso(),
    input.serverId,
    input.ownerId
  );
  return getServerById(input.serverId);
}

export async function clearAllTestData() {
  const db = getDb();
  await db.exec(`
    DELETE FROM user_login_sessions;
    DELETE FROM app_server_reviews;
    DELETE FROM app_server_nickname_votes;
    DELETE FROM app_server_votes;
    DELETE FROM app_server_views;
    DELETE FROM app_server_online_samples;
    DELETE FROM app_servers;
    DELETE FROM app_users;
  `);
}

function normalizeFingerprint(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function buildActorFingerprint(input: { ip?: string | null; userAgent?: string | null }): string {
  const normalizedIp = String(input.ip || '').trim().toLowerCase() || 'no-ip';
  const normalizedAgent = String(input.userAgent || '').trim().toLowerCase() || 'no-ua';
  return normalizeFingerprint(`${normalizedIp}::${normalizedAgent}`);
}

export async function registerServerView(input: {
  serverId: number;
  userId?: string | null;
  fingerprint: string;
  ipAddress?: string | null;
  countryCode?: string | null;
  referrer?: string | null;
  trafficSource?: string | null;
  referralCode?: string | null;
  cooldownMinutes?: number;
}) {
  const db = getDb();
  const now = nowIso();
  const cooldownWindow = Math.max(1, Number(input.cooldownMinutes || 15));
  const recentByUser =
    input.userId
      ? await db
          .prepare(
            `SELECT id
             FROM app_server_views
             WHERE server_id = ? AND user_id = ? AND created_at >= datetime('now', ?)
             LIMIT 1`
          )
          .get(input.serverId, input.userId, `-${cooldownWindow} minutes`)
      : null;
  if (recentByUser) {
    return { counted: false };
  }
  const recentByFingerprint = await db
    .prepare(
      `SELECT id
       FROM app_server_views
       WHERE server_id = ? AND fingerprint = ? AND created_at >= datetime('now', ?)
       LIMIT 1`
    )
    .get(input.serverId, input.fingerprint, `-${cooldownWindow} minutes`);
  if (recentByFingerprint) {
    return { counted: false };
  }
  await db.prepare(
    `INSERT INTO app_server_views (
       server_id, user_id, fingerprint, ip_address, country_code,
       referrer, traffic_source, referral_code, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.serverId,
    input.userId || null,
    input.fingerprint,
    String(input.ipAddress || '').trim() || null,
    String(input.countryCode || '').trim().toUpperCase() || null,
    String(input.referrer || '').trim().slice(0, 1000) || null,
    String(input.trafficSource || '').trim().slice(0, 120) || 'direct',
    normalizeReferralCode(input.referralCode || '') || null,
    now
  );
  return { counted: true };
}

export async function registerServerNicknameVote(input: {
  serverId: number;
  nickname: string;
  ipAddress: string;
  ipDailyLimit?: number;
  cooldownHours?: number;
}) {
  const db = getDb();
  const now = nowIso();
  const normalizedNickname = String(input.nickname || '').trim().toLowerCase();
  const normalizedIp = String(input.ipAddress || '').trim().slice(0, 120) || 'unknown';
  const ipDailyLimit = Math.max(1, Number(input.ipDailyLimit || 5));
  const cooldownHours = Math.max(1, Number(input.cooldownHours || 24));
  const existingNicknameVote = await db
    .prepare(
      `SELECT id
       FROM app_server_nickname_votes
       WHERE server_id = ? AND nickname = ? AND created_at >= datetime('now', ?)
       LIMIT 1`
    )
    .get(input.serverId, normalizedNickname, `-${cooldownHours} hours`) as { id: number } | undefined;
  if (existingNicknameVote) {
    return { success: false as const, reason: 'already-voted' as const };
  }
  const votesByIp = await db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM app_server_nickname_votes
       WHERE ip_address = ? AND created_at >= datetime('now', '-24 hours')`
    )
    .get(normalizedIp) as { c: number } | undefined;
  if (Number(votesByIp?.c || 0) >= ipDailyLimit) {
    return { success: false as const, reason: 'ip-limit' as const };
  }
  await db.prepare(
    `INSERT INTO app_server_nickname_votes (server_id, nickname, ip_address, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(input.serverId, normalizedNickname, normalizedIp, now);
  return { success: true as const };
}

export async function upsertServerReview(input: {
  serverId: number;
  userId?: string | null;
  fingerprint: string;
  text: string;
  rating: number;
  authorName?: string | null;
}) {
  const db = getDb();
  const now = nowIso();
  const normalizedText = String(input.text || '').trim();
  const normalizedRating = Math.max(1, Math.min(5, Number(input.rating || 0)));
  const normalizedAuthor = String(input.authorName || '').trim().slice(0, 80) || null;
  if (!normalizedText) {
    throw new Error('Текст відгуку є обовʼязковим');
  }
  if (normalizedText.length > 250) {
    throw new Error('Відгук може містити максимум 250 символів');
  }
  if (input.userId) {
    const existingByUser = await db
      .prepare('SELECT id FROM app_server_reviews WHERE server_id = ? AND user_id = ? LIMIT 1')
      .get(input.serverId, input.userId) as { id: number } | undefined;
    if (existingByUser) {
      await db.prepare(
        `UPDATE app_server_reviews
         SET text = ?, rating = ?, fingerprint = ?, author_name = COALESCE(?, author_name), updated_at = ?
         WHERE id = ?`
      ).run(normalizedText, normalizedRating, input.fingerprint, normalizedAuthor, now, existingByUser.id);
      return { updated: true };
    }
  }
  const existingByFingerprint = await db
    .prepare('SELECT id FROM app_server_reviews WHERE server_id = ? AND fingerprint = ? LIMIT 1')
    .get(input.serverId, input.fingerprint) as { id: number } | undefined;
  if (existingByFingerprint) {
    await db.prepare(
      `UPDATE app_server_reviews
       SET text = ?, rating = ?, user_id = COALESCE(user_id, ?), author_name = COALESCE(?, author_name), updated_at = ?
       WHERE id = ?`
    ).run(normalizedText, normalizedRating, input.userId || null, normalizedAuthor, now, existingByFingerprint.id);
    return { updated: true };
  }
  await db.prepare(
    `INSERT INTO app_server_reviews (server_id, user_id, fingerprint, author_name, text, rating, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(input.serverId, input.userId || null, input.fingerprint, normalizedAuthor, normalizedText, normalizedRating, now, now);
  return { created: true };
}

export async function listServerReviews(serverId: number, limit = 50) {
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT
         r.id, r.server_id, r.user_id, r.author_name, r.text, r.rating, r.created_at, r.updated_at,
         u.full_name, u.avatar_url
       FROM app_server_reviews r
       LEFT JOIN app_users u ON u.id = r.user_id
       WHERE r.server_id = ?
       ORDER BY datetime(r.updated_at) DESC
       LIMIT ?`
    )
    .all(serverId, Math.max(1, Math.min(limit, 100))) as DbServerReviewRow[];
  return rows.map(mapServerReviewRow);
}


export async function listServerVotes(serverId: number, limit = 50) {
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT
         v.id, v.server_id, v.nickname, v.ip_address, v.created_at
       FROM app_server_nickname_votes v
       WHERE v.server_id = ?
       ORDER BY datetime(v.created_at) DESC
       LIMIT ?`
    )
    .all(serverId, Math.max(1, Math.min(limit, 100))) as DbServerVoteRow[];
  return rows.map(mapServerVoteRow);
}

export async function listTopServerVoters(serverId: number, limit = 10) {
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT
         MIN(v.id) AS id,
         v.server_id,
         v.nickname,
         MIN(v.ip_address) AS ip_address,
         MAX(v.created_at) AS created_at,
         COUNT(*) AS vote_count
       FROM app_server_nickname_votes v
       WHERE v.server_id = ?
       GROUP BY v.server_id, v.nickname
       ORDER BY vote_count DESC, datetime(created_at) DESC
       LIMIT ?`
    )
    .all(serverId, Math.max(1, Math.min(limit, 100))) as DbServerVoteRow[];
  return rows.map(mapServerVoteRow);
}

export async function getServerEngagementSummary(serverId: number) {
  const db = getDb();
  const viewsRow = await db
    .prepare('SELECT COUNT(*) AS c FROM app_server_views WHERE server_id = ?')
    .get(serverId) as { c: number } | undefined;
  const nicknameVotesRow = await db
    .prepare('SELECT COUNT(*) AS c FROM app_server_nickname_votes WHERE server_id = ?')
    .get(serverId) as { c: number } | undefined;
  const accountVotesRow = await db
    .prepare('SELECT COUNT(*) AS c FROM app_server_votes WHERE server_id = ?')
    .get(serverId) as { c: number } | undefined;
  const reviewsRow = await db
    .prepare('SELECT COUNT(*) AS c, AVG(rating) AS avg_rating FROM app_server_reviews WHERE server_id = ?')
    .get(serverId) as { c: number; avg_rating: number | null } | undefined;
  return {
    views: Number(viewsRow?.c || 0),
    votes: Number(nicknameVotesRow?.c || 0) + Number(accountVotesRow?.c || 0),
    reviews: Number(reviewsRow?.c || 0),
    averageRating: Number(reviewsRow?.avg_rating || 0),
  };
}

export async function getServerReviewByActor(input: { serverId: number; userId?: string | null; fingerprint: string }) {
  const db = getDb();
  if (input.userId) {
    const row = await db
      .prepare('SELECT id, text, rating, created_at, updated_at FROM app_server_reviews WHERE server_id = ? AND user_id = ? LIMIT 1')
      .get(input.serverId, input.userId) as { id: number; text: string; rating: number; created_at: string; updated_at: string } | undefined;
    if (row) {
      return {
        id: Number(row.id),
        text: String(row.text || ''),
        rating: Number(row.rating || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  }
  const row = await db
    .prepare('SELECT id, text, rating, created_at, updated_at FROM app_server_reviews WHERE server_id = ? AND fingerprint = ? LIMIT 1')
    .get(input.serverId, input.fingerprint) as { id: number; text: string; rating: number; created_at: string; updated_at: string } | undefined;
  if (!row) return null;
  return {
    id: Number(row.id),
    text: String(row.text || ''),
    rating: Number(row.rating || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function recordServerOnlineSample(input: { serverId: number; online: boolean; players: number; max: number; votes: number; views: number }) {
  const db = getDb();
  const recordedAt = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
  const players = Math.max(0, Number(input.players || 0));
  const max = Math.max(0, Number(input.max || 0));
  await db.prepare(
    `UPDATE app_servers
     SET online = ?, players = ?, max = ?, updated_at = ?
     WHERE id = ?`
  ).run(input.online ? 1 : 0, players, max, recordedAt, input.serverId);
  await db.prepare(
    `INSERT INTO app_server_online_samples (server_id, online, players, max, votes, views, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(server_id, recorded_at) DO UPDATE SET
       online = excluded.online,
       players = excluded.players,
       max = excluded.max,
       votes = excluded.votes,
       views = excluded.views`
  ).run(
    input.serverId,
    input.online ? 1 : 0,
    players,
    max,
    Math.max(0, Number(input.votes || 0)),
    Math.max(0, Number(input.views || 0)),
    recordedAt
  );
  await db.prepare(
    `DELETE FROM app_server_online_samples
     WHERE server_id = ?
       AND recorded_at < datetime('now', '-400 days')`
  ).run(input.serverId);
}

export async function listServerOnlineSamples(serverId: number, hours = 24) {
  const db = getDb();
  const rows = await db.prepare(
    `SELECT server_id, online, players, max, votes, views, recorded_at
     FROM app_server_online_samples
     WHERE server_id = ?
       AND datetime(recorded_at) >= datetime('now', ?)
     ORDER BY datetime(recorded_at) ASC`
  ).all(serverId, `-${Math.max(1, Math.min(hours, 24 * 400))} hours`) as DbServerOnlineSampleRow[];
  return rows.map((row) => ({
    serverId: Number(row.server_id),
    online: Boolean(row.online),
    players: Number(row.players || 0),
    max: Number(row.max || 0),
    votes: Number(row.votes || 0),
    views: Number(row.views || 0),
    recordedAt: row.recorded_at,
  }));
}

export async function listServerMetricEvents(serverId: number, hours = 24) {
  const db = getDb();
  const safeHours = Math.max(1, Math.min(hours, 24 * 365 * 3));
  const views = await db.prepare(
    `SELECT created_at AS created_at
     FROM app_server_views
     WHERE server_id = ?
       AND datetime(created_at) >= datetime('now', ?)
     ORDER BY created_at ASC`
  ).all(serverId, `-${safeHours} hours`) as Array<{ created_at: string }>;
  const votes = await db.prepare(
    `SELECT created_at AS created_at
     FROM app_server_nickname_votes
     WHERE server_id = ?
       AND datetime(created_at) >= datetime('now', ?)
     UNION ALL
     SELECT updated_at AS created_at
     FROM app_server_votes
     WHERE server_id = ?
       AND datetime(updated_at) >= datetime('now', ?)
     ORDER BY created_at ASC`
  ).all(serverId, `-${safeHours} hours`, serverId, `-${safeHours} hours`) as Array<{ created_at: string }>;
  return {
    views: views.map((row) => row.created_at).filter(Boolean),
    votes: votes.map((row) => row.created_at).filter(Boolean),
  };
}

export async function getLatestServerOnlineSample(serverId: number) {
  const db = getDb();
  const row = await db.prepare(
    `SELECT server_id, online, players, max, votes, views, recorded_at
     FROM app_server_online_samples
     WHERE server_id = ?
     ORDER BY datetime(recorded_at) DESC
     LIMIT 1`
  ).get(serverId) as DbServerOnlineSampleRow | undefined;
  if (!row) return null;
  return {
    serverId: Number(row.server_id),
    online: Boolean(row.online),
    players: Number(row.players || 0),
    max: Number(row.max || 0),
    votes: Number(row.votes || 0),
    views: Number(row.views || 0),
    recordedAt: row.recorded_at,
  };
}

export type UserDashboardVote = {
  serverId: number;
  serverName: string;
  nickname: string;
  votedAt: string;
  canVoteAt: string;
  cooldownHours: number;
  cooldownRemainingHours: number;
  isCooldownActive: boolean;
};

export type UserDashboardReview = {
  id: number;
  serverId: number;
  serverName: string;
  rating: number;
  text: string;
  updatedAt: string;
};

export type UserDashboardPayload = {
  role: UserRole;
  profile: {
    id: string;
    username: string;
    nickname: string;
    email: string;
    joinedAt: string;
  };
  activity: {
    votes: UserDashboardVote[];
    reviews: UserDashboardReview[];
  };
  reviews: UserDashboardReview[];
  votes: UserDashboardVote[];
};

export type OwnerServerListItem = {
  serverId: number;
  serverName: string;
  dashboardSlug: string;
  status: 'active' | 'pending';
  totalViews: number;
  totalVotes: number;
  averageRating: number;
  projectId: number | null;
};

export type OwnerNotification = {
  id: number;
  serverId: number | null;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
};

export type OwnerDashboardPayload = {
  role: UserRole;
  ownedServers: OwnerServerListItem[];
  totals: {
    servers: number;
    views: number;
    votes: number;
    reviews: number;
    averageRating: number;
  };
  notifications: OwnerNotification[];
};

export type OwnerServerStatsPayload = {
  summary: {
    serverId: number;
    views: number;
    votes: number;
    reviews: number;
    averageRating: number;
  };
  charts: {
    views: Array<{ date: string; value: number }>;
    votes: Array<{ date: string; value: number }>;
  };
};

export type OwnerServerActivityPayload = {
  latestVotes: ServerVoteEntry[];
  latestReviews: ServerReview[];
  geolocation: Array<{
    countryCode: string;
    visitors: number;
  }>;
};

export type ServerReferralLink = {
  id: number;
  serverId: number;
  label: string;
  code: string;
  channel: string;
  url: string;
  totalViews: number;
  uniqueVisitors: number;
  views7d: number;
  views30d: number;
  createdAt: string;
  disabledAt: string | null;
};

export function resolveUserRole(input: { userId: string; role?: string | null }): UserRole {
  void input.userId;
  return normalizeUserRole(input.role);
}

export async function registerAuthenticatedServerVote(input: {
  serverId: number;
  userId: string;
  nickname: string;
  cooldownHours?: number;
}) {
  const db = getDb();
  const cooldownHours = Math.max(1, Number(input.cooldownHours || DEFAULT_VOTE_COOLDOWN_HOURS));
  const now = new Date();
  const nowIsoValue = now.toISOString();
  const existing = await db
    .prepare(
      `SELECT id, updated_at
       FROM app_server_votes
       WHERE server_id = ? AND user_id = ?
       LIMIT 1`
    )
    .get(input.serverId, input.userId) as { id: number; updated_at: string } | undefined;
  if (!existing) {
    await db.prepare(
      `INSERT INTO app_server_votes (server_id, user_id, fingerprint, author_name, value, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    ).run(input.serverId, input.userId, `user:${input.userId}`, String(input.nickname || '').trim().slice(0, 60) || null, nowIsoValue, nowIsoValue);
    return {
      success: true as const,
      cooldownHours,
      votedAt: nowIsoValue,
      nextVoteAt: new Date(now.getTime() + cooldownHours * 60 * 60 * 1000).toISOString(),
    };
  }
  const lastVoteTime = new Date(existing.updated_at).getTime();
  const nextVoteTimestamp = lastVoteTime + cooldownHours * 60 * 60 * 1000;
  if (Number.isFinite(lastVoteTime) && Date.now() < nextVoteTimestamp) {
    return {
      success: false as const,
      reason: 'cooldown' as const,
      cooldownHours,
      votedAt: existing.updated_at,
      nextVoteAt: new Date(nextVoteTimestamp).toISOString(),
    };
  }
  await db.prepare(
    `UPDATE app_server_votes
     SET author_name = ?, updated_at = ?
     WHERE id = ?`
  ).run(String(input.nickname || '').trim().slice(0, 60) || null, nowIsoValue, existing.id);
  return {
    success: true as const,
    cooldownHours,
    votedAt: nowIsoValue,
    nextVoteAt: new Date(now.getTime() + cooldownHours * 60 * 60 * 1000).toISOString(),
  };
}

function calculateCooldownHours(input: { nextVoteAt: string; now: Date }): number {
  const target = new Date(input.nextVoteAt).getTime();
  if (!Number.isFinite(target) || target <= input.now.getTime()) {
    return 0;
  }
  const hoursDiff = (target - input.now.getTime()) / (60 * 60 * 1000);
  return Math.max(1, Math.ceil(hoursDiff));
}

export async function listNotificationsByUser(input: { userId: string; limit?: number }) {
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT id, server_id, type, title, body, is_read, created_at
       FROM app_notifications
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC
       LIMIT ?`
    )
    .all(input.userId, Math.max(1, Math.min(Number(input.limit || 20), 100))) as Array<{
    id: number;
    server_id: number | null;
    type: string;
    title: string;
    body: string;
    is_read: number;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: Number(row.id),
    serverId: row.server_id === null ? null : Number(row.server_id),
    type: String(row.type || ''),
    title: String(row.title || ''),
    body: String(row.body || ''),
    createdAt: row.created_at,
    isRead: Boolean(row.is_read),
  }));
}

export async function createOwnerNotification(input: {
  serverId: number;
  type: 'vote' | 'review';
  actorName: string;
  text?: string;
  rating?: number;
}) {
  const db = getDb();
  const serverRow = await db
    .prepare('SELECT id, owner_id, name FROM app_servers WHERE id = ? LIMIT 1')
    .get(input.serverId) as { id: number; owner_id: string; name: string } | undefined;
  if (!serverRow) {
    return;
  }
  const preferences = await db
    .prepare(
      `SELECT enabled, votes_enabled, reviews_enabled
       FROM app_notification_preferences
       WHERE user_id = ?
       LIMIT 1`
    )
    .get(serverRow.owner_id) as {
      enabled: number;
      votes_enabled: number;
      reviews_enabled: number;
    } | undefined;
  if (
    preferences &&
    (!preferences.enabled ||
      (input.type === 'vote' && !preferences.votes_enabled) ||
      (input.type === 'review' && !preferences.reviews_enabled))
  ) {
    return;
  }
  const title = input.type === 'vote' ? 'New vote received' : 'New review posted';
  const body =
    input.type === 'vote'
      ? `${input.actorName} voted for ${serverRow.name}`
      : `${input.actorName} left a ${Math.max(1, Math.min(5, Number(input.rating || 5))).toFixed(1)}★ review on ${serverRow.name}${input.text ? `: ${String(input.text).slice(0, 120)}` : ''}`;
  await db.prepare(
    `INSERT INTO app_notifications (user_id, server_id, type, title, body, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).run(serverRow.owner_id, serverRow.id, input.type, title, body, nowIso());
}

export async function getUserDashboard(userId: string) {
  const db = getDb();
  const userRow = await db.prepare('SELECT * FROM app_users WHERE id = ? LIMIT 1').get(userId) as DbUserRow | undefined;
  if (!userRow) {
    throw new Error('User not found');
  }
  const now = new Date();
  const role = resolveUserRole({ userId, role: userRow.role });
  const votes = await db
    .prepare(
      `SELECT
         s.id AS server_id,
         s.name AS server_name,
         COALESCE(v.author_name, u.full_name, 'player') AS nickname,
         v.updated_at
       FROM app_server_votes v
       JOIN app_servers s ON s.id = v.server_id
       LEFT JOIN app_users u ON u.id = v.user_id
       WHERE v.user_id = ?
       ORDER BY datetime(v.updated_at) DESC`
    )
    .all(userId) as Array<{
    server_id: number;
    server_name: string;
    nickname: string;
    updated_at: string;
  }>;
  const voteItems: UserDashboardVote[] = votes.map((row) => {
    const votedAt = row.updated_at;
    const nextVoteAt = new Date(new Date(votedAt).getTime() + DEFAULT_VOTE_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
    const cooldownRemainingHours = calculateCooldownHours({ nextVoteAt, now });
    return {
      serverId: Number(row.server_id),
      serverName: String(row.server_name || ''),
      nickname: String(row.nickname || ''),
      votedAt,
      canVoteAt: nextVoteAt,
      cooldownHours: DEFAULT_VOTE_COOLDOWN_HOURS,
      cooldownRemainingHours,
      isCooldownActive: cooldownRemainingHours > 0,
    };
  });
  const reviews = await db
    .prepare(
      `SELECT
         r.id,
         r.server_id,
         s.name AS server_name,
         r.rating,
         r.text,
         r.updated_at
       FROM app_server_reviews r
       JOIN app_servers s ON s.id = r.server_id
       WHERE r.user_id = ?
       ORDER BY datetime(r.updated_at) DESC`
    )
    .all(userId) as Array<{
    id: number;
    server_id: number;
    server_name: string;
    rating: number;
    text: string;
    updated_at: string;
  }>;
  const reviewItems: UserDashboardReview[] = reviews.map((row) => ({
    id: Number(row.id),
    serverId: Number(row.server_id),
    serverName: String(row.server_name || ''),
    rating: Number(row.rating || 0),
    text: String(row.text || ''),
    updatedAt: row.updated_at,
  }));
  return {
    role,
    profile: {
      id: userRow.id,
      username: userRow.full_name || userRow.email.split('@')[0] || 'User',
      nickname: userRow.profile_slug || (userRow.full_name || 'user').toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
      email: userRow.email,
      joinedAt: userRow.created_at,
    },
    activity: {
      votes: voteItems.slice(0, 10),
      reviews: reviewItems.slice(0, 10),
    },
    reviews: reviewItems,
    votes: voteItems,
  };
}

export async function getOwnerDashboard(userId: string) {
  const db = getDb();
  const userRow = await db.prepare('SELECT id, role FROM app_users WHERE id = ? LIMIT 1').get(userId) as { id: string; role: string } | undefined;
  if (!userRow) {
    throw new Error('User not found');
  }
  const role = resolveUserRole({ userId, role: userRow.role });
  if (role === 'USER') {
    return {
      role,
      ownedServers: [],
      totals: {
        servers: 0,
        views: 0,
        votes: 0,
        reviews: 0,
        averageRating: 0,
      },
      notifications: [],
    };
  }
  const rows = await db
    .prepare(
      `SELECT
         s.id,
         s.name,
         s.verified,
         s.project_id,
         COALESCE(v_stats.views_count, 0) AS views_count,
         COALESCE(vote_stats.votes_count, 0) AS votes_count,
         COALESCE(review_stats.reviews_count, 0) AS reviews_count,
         COALESCE(review_stats.average_rating, 0) AS average_rating
       FROM app_servers s
       LEFT JOIN (
         SELECT server_id, COUNT(*) AS views_count
         FROM app_server_views
         GROUP BY server_id
       ) v_stats ON v_stats.server_id = s.id
       LEFT JOIN (
         SELECT server_id, COUNT(*) AS votes_count
         FROM app_server_nickname_votes
         GROUP BY server_id
       ) vote_stats ON vote_stats.server_id = s.id
       LEFT JOIN (
         SELECT server_id, COUNT(*) AS reviews_count, AVG(rating) AS average_rating
         FROM app_server_reviews
         GROUP BY server_id
       ) review_stats ON review_stats.server_id = s.id
       WHERE s.owner_id = ?
       ORDER BY s.project_id NULLS LAST, datetime(s.created_at) DESC`
    )
    .all(userId) as Array<{
    id: number;
    name: string;
    verified: number;
    project_id: number | null;
    views_count: number;
    votes_count: number;
    reviews_count: number;
    average_rating: number;
  }>;
  const ownedServers: OwnerServerListItem[] = rows.map((row) => ({
    serverId: Number(row.id),
    serverName: String(row.name || ''),
    dashboardSlug: buildServerDashboardSlug(String(row.name || '')),
    status: Number(row.verified) > 0 ? 'active' : 'pending',
    totalViews: Number(row.views_count || 0),
    totalVotes: Number(row.votes_count || 0),
    averageRating: Number(row.average_rating || 0),
    projectId: row.project_id ?? null,
  }));
  const reviewsCount = rows.reduce((sum, row) => sum + Number(row.reviews_count || 0), 0);
  const weightedRating = rows.reduce((sum, row) => sum + Number(row.average_rating || 0) * Number(row.reviews_count || 0), 0);
  return {
    role,
    ownedServers,
    totals: {
      servers: ownedServers.length,
      views: ownedServers.reduce((sum, row) => sum + row.totalViews, 0),
      votes: ownedServers.reduce((sum, row) => sum + row.totalVotes, 0),
      reviews: reviewsCount,
      averageRating: reviewsCount > 0 ? weightedRating / reviewsCount : 0,
    },
    notifications: await listNotificationsByUser({ userId, limit: 20 }),
  };
}

async function assertServerAccess(input: { serverId: number; userId: string; isAdmin?: boolean }) {
  if (input.isAdmin) {
    return;
  }
  const server = await getServerById(input.serverId);
  if (!server || server.ownerId !== input.userId) {
    throw new Error('Server not found or access denied');
  }
}

function getPublicOrigin() {
  return String(process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://eyzencore.com').replace(/\/+$/, '');
}

function buildReferralUrl(server: { seed?: number; id?: number; name: string }, code: string) {
  return `${getPublicOrigin()}${buildServerPublicPath(server)}?ref=${encodeURIComponent(code)}`;
}

export async function listServerReferralLinks(input: { serverId: number; userId: string; isAdmin?: boolean }) {
  await assertServerAccess(input);
  const db = getDb();
  const rows = await db.prepare(
    `SELECT
       r.id,
       r.server_id,
       r.label,
       r.code,
       r.channel,
       s.name AS server_name,
       r.created_at,
       r.disabled_at,
       COUNT(v.id) AS total_views,
       COUNT(DISTINCT v.fingerprint) AS unique_visitors,
       SUM(CASE WHEN datetime(v.created_at) >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS views_7d,
       SUM(CASE WHEN datetime(v.created_at) >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS views_30d
     FROM app_server_referrals r
     JOIN app_servers s ON s.id = r.server_id
     LEFT JOIN app_server_views v
       ON v.server_id = r.server_id
      AND v.referral_code = r.code
     WHERE r.server_id = ?
     GROUP BY r.id
     ORDER BY r.disabled_at IS NOT NULL ASC, datetime(r.created_at) DESC`
  ).all(input.serverId) as Array<{
    id: number;
    server_id: number;
    label: string;
    code: string;
    channel: string;
    server_name: string;
    created_at: string;
    disabled_at: string | null;
    total_views: number | null;
    unique_visitors: number | null;
    views_7d: number | null;
    views_30d: number | null;
  }>;
  return rows.map<ServerReferralLink>((row) => ({
    id: Number(row.id),
    serverId: Number(row.server_id),
    label: String(row.label || ''),
    code: String(row.code || ''),
    channel: String(row.channel || 'custom'),
    url: buildReferralUrl({ id: Number(row.server_id), name: String(row.server_name || 'server') }, String(row.code || '')),
    totalViews: Number(row.total_views || 0),
    uniqueVisitors: Number(row.unique_visitors || 0),
    views7d: Number(row.views_7d || 0),
    views30d: Number(row.views_30d || 0),
    createdAt: row.created_at,
    disabledAt: row.disabled_at || null,
  }));
}

export async function createServerReferralLink(input: {
  serverId: number;
  userId: string;
  isAdmin?: boolean;
  label: string;
  code?: string | null;
  channel?: string | null;
}) {
  await assertServerAccess(input);
  const server = await getServerById(input.serverId);
  if (!server) throw new Error('Server not found');
  const label = String(input.label || '').trim().slice(0, 80);
  if (label.length < 2) throw new Error('Label is required');
  const channel = String(input.channel || 'custom').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 32) || 'custom';
  const baseCode = normalizeReferralCode(input.code || label);
  if (baseCode.length < 2) throw new Error('Referral code is required');
  const db = getDb();
  const timestamp = nowIso();
  let code = baseCode;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
      code = `${baseCode}${suffix}`.slice(0, 48);
      await db.prepare(
        `INSERT INTO app_server_referrals (server_id, owner_id, label, code, channel, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(input.serverId, server.ownerId, label, code, channel, timestamp, timestamp);
      return {
        id: Number((await db.prepare('SELECT last_insert_rowid() AS id').get() as { id: number }).id || 0),
        serverId: input.serverId,
        label,
        code,
        channel,
        url: buildReferralUrl(server, code),
        totalViews: 0,
        uniqueVisitors: 0,
        views7d: 0,
        views30d: 0,
        createdAt: timestamp,
        disabledAt: null,
      } satisfies ServerReferralLink;
    } catch (error) {
      if (attempt >= 19) throw error;
    }
  }
  throw new Error('Could not create referral link');
}

export async function disableServerReferralLink(input: { serverId: number; referralId: number; userId: string; isAdmin?: boolean }) {
  await assertServerAccess(input);
  const db = getDb();
  const timestamp = nowIso();
  const result = await db.prepare(
    `UPDATE app_server_referrals
     SET disabled_at = ?, updated_at = ?
     WHERE id = ? AND server_id = ? AND disabled_at IS NULL`
  ).run(timestamp, timestamp, input.referralId, input.serverId) as { changes?: number };
  return { success: Number(result?.changes || 0) > 0 };
}

export async function getOwnerServerStats(input: { serverId: number; userId: string; isAdmin?: boolean; days?: number }) {
  await assertServerAccess(input);
  const db = getDb();
  const days = Math.max(1, Math.min(Number(input.days || 7), 365));
  const summary = await getServerEngagementSummary(input.serverId);
  const hourlyVotesRows = await db
    .prepare(
      `SELECT substr(created_at, 1, 13) AS hour_key, COUNT(*) AS total
       FROM app_server_nickname_votes
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)
       GROUP BY hour_key`
    )
    .all(input.serverId, `-${days} days`) as Array<{ hour_key: string; total: number }>;
  const hourlyViewsRows = await db
    .prepare(
      `SELECT substr(created_at, 1, 13) AS hour_key, COUNT(*) AS total
       FROM app_server_views
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)
       GROUP BY hour_key`
    )
    .all(input.serverId, `-${days} days`) as Array<{ hour_key: string; total: number }>;
  const votesMap = new Map<string, number>();
  hourlyVotesRows.forEach((row) => {
    votesMap.set(String(row.hour_key || ''), Number(row.total || 0));
  });
  const viewsMap = new Map<string, number>();
  hourlyViewsRows.forEach((row) => {
    viewsMap.set(String(row.hour_key || ''), Number(row.total || 0));
  });
  const votesSeries: Array<{ date: string; value: number }> = [];
  const viewsSeries: Array<{ date: string; value: number }> = [];
  const totalHours = days * 24;
  for (let offset = totalHours - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCMinutes(0, 0, 0);
    date.setUTCHours(date.getUTCHours() - offset);
    const hourKey = date.toISOString().slice(0, 13);
    votesSeries.push({ date: `${hourKey}:00:00.000Z`, value: Number(votesMap.get(hourKey) || 0) });
    viewsSeries.push({ date: `${hourKey}:00:00.000Z`, value: Number(viewsMap.get(hourKey) || 0) });
  }
  return {
    summary: {
      serverId: input.serverId,
      views: summary.views,
      votes: summary.votes,
      reviews: summary.reviews,
      averageRating: summary.averageRating,
    },
    charts: {
      views: viewsSeries,
      votes: votesSeries,
    },
  };
}

export async function getOwnerServerActivity(input: { serverId: number; userId: string; isAdmin?: boolean; limit?: number }) {
  await assertServerAccess(input);
  const db = getDb();
  const limit = Math.max(1, Math.min(Number(input.limit || 20), 100));
  const geolocationRows = await db
    .prepare(
      `SELECT
         COALESCE(NULLIF(country_code, ''), 'UN') AS country_code,
         COUNT(*) AS visitors
       FROM app_server_views
       WHERE server_id = ?
         AND created_at >= datetime('now', '-30 days')
       GROUP BY country_code
       ORDER BY visitors DESC
       LIMIT 10`
    )
    .all(input.serverId) as Array<{ country_code: string; visitors: number }>;
  return {
    latestVotes: await listServerVotes(input.serverId, limit),
    latestReviews: await listServerReviews(input.serverId, limit),
    geolocation: geolocationRows.map((row) => ({
      countryCode: String(row.country_code || 'UN').toUpperCase(),
      visitors: Number(row.visitors || 0),
    })),
  };
}

export async function deleteServerById(input: { serverId: number; userId: string; isAdmin?: boolean }) {
  await assertServerAccess(input);
  const db = getDb();
  await db.prepare('DELETE FROM app_servers WHERE id = ?').run(input.serverId);
  return { success: true as const };
}

export async function deleteServerReviewById(input: { serverId: number; reviewId: number; userId: string; isAdmin?: boolean }) {
  await assertServerAccess(input);
  const db = getDb();
  const result = await db.prepare('DELETE FROM app_server_reviews WHERE id = ? AND server_id = ?').run(input.reviewId, input.serverId) as { changes?: number };
  return { success: Number(result?.changes || 0) > 0 };
}

// ─── Owner Dashboard (per-server) ───────────────────────────────────────────
export type DashRange = '24h' | '7d' | '30d' | '90d' | 'all';
export type DashActivityKind = 'vote' | 'review' | 'view';
export type DashActivityItem = {
  kind: DashActivityKind;
  actor: string;
  detail: string;
  rating?: number;
  createdAt: string;
  // Source hint for the front-end avatar:
  //   'mc'      — Minecraft nickname (use mc-heads service)
  //   'profile' — registered user (use avatarUrl / profileSlug)
  //   'guest'   — anonymous visitor
  actorKind: 'mc' | 'profile' | 'guest';
  avatarUrl?: string | null;
  profileSlug?: string | null;
};
export type DashOwnedServer = {
  seed: number;
  name: string;
  ic: string;
  addr: string;
  avatarUrl: string | null;
};
export type DashTopVoter = {
  id: number;
  nickname: string;
  voteCount: number;
  createdAt: string;
};
export type DashReviewItem = {
  id: number;
  authorName: string;
  avatarUrl: string | null;
  profileSlug: string | null;
  text: string;
  rating: number;
  createdAt: string;
};
export type DashTrafficSource = {
  source: string;
  visitors: number;
  percent: number;
};
export type DashReferralLink = ServerReferralLink;

const DASH_RANGE_DAYS: Record<DashRange, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: 365,
};

function rangeDays(range: DashRange): number {
  return DASH_RANGE_DAYS[range] ?? 7;
}

async function countSince(table: 'app_server_views' | 'app_server_nickname_votes' | 'app_server_reviews', serverId: number, sinceDays: number, untilDays?: number) {
  const db = getDb();
  let sql = `SELECT COUNT(*) AS c FROM ${table} WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)`;
  const params: Array<number | string> = [serverId, `-${sinceDays} days`];
  if (typeof untilDays === 'number') {
    sql += ` AND datetime(created_at) < datetime('now', ?)`;
    params.push(`-${untilDays} days`);
  }
  const row = await db.prepare(sql).get(...params) as { c: number } | undefined;
  return Number(row?.c || 0);
}

async function countVotesSince(serverId: number, sinceDays: number, untilDays?: number) {
  const db = getDb();
  const params: Array<number | string> = [serverId, `-${sinceDays} days`, serverId, `-${sinceDays} days`];
  let upperBound = '';
  if (typeof untilDays === 'number') {
    upperBound = ` AND datetime(created_at) < datetime('now', ?)`;
    params.splice(2, 0, `-${untilDays} days`);
    params.push(`-${untilDays} days`);
  }
  const row = await db.prepare(
    `SELECT SUM(c) AS c
     FROM (
       SELECT COUNT(*) AS c
       FROM app_server_nickname_votes
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)${upperBound}
       UNION ALL
       SELECT COUNT(*) AS c
       FROM app_server_votes
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)${upperBound}
     )`
  ).get(...params) as { c: number } | undefined;
  return Number(row?.c || 0);
}

async function avgRatingSince(serverId: number, sinceDays: number) {
  const db = getDb();
  const row = await db
    .prepare(`SELECT AVG(rating) AS r FROM app_server_reviews WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)`)
    .get(serverId, `-${sinceDays} days`) as { r: number | null } | undefined;
  return Number(row?.r || 0);
}

export async function getServerDashboardSnapshot(input: { serverId: number; userId: string; isAdmin?: boolean; range?: DashRange }) {
  await assertServerAccess({ serverId: input.serverId, userId: input.userId, isAdmin: input.isAdmin });
  const db = getDb();
  const range: DashRange = (input.range as DashRange) || '7d';
  const days = rangeDays(range);

  // KPI: current vs prior period
  const [
    votesNow,
    votesPrior,
    viewsNow,
    viewsPrior,
    reviewsNow,
    reviewsPrior,
    ratingNow,
    ratingPrior,
    summary,
  ] = await Promise.all([
    countVotesSince(input.serverId, days),
    countVotesSince(input.serverId, days * 2, days),
    countSince('app_server_views', input.serverId, days),
    countSince('app_server_views', input.serverId, days * 2, days),
    countSince('app_server_reviews', input.serverId, days),
    countSince('app_server_reviews', input.serverId, days * 2, days),
    avgRatingSince(input.serverId, days),
    avgRatingSince(input.serverId, days * 2),
    getServerEngagementSummary(input.serverId),
  ]);

  // IP copies — count distinct fingerprints with views (proxy: unique visitors who reached the server page)
  const uniqueRow = await db
    .prepare(`SELECT COUNT(DISTINCT fingerprint) AS c FROM app_server_views WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)`)
    .get(input.serverId, `-${days} days`) as { c: number } | undefined;
  const uniqueVisitorsNow = Number(uniqueRow?.c || 0);
  const uniquePriorRow = await db
    .prepare(`SELECT COUNT(DISTINCT fingerprint) AS c FROM app_server_views WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?) AND datetime(created_at) < datetime('now', ?)`)
    .get(input.serverId, `-${days * 2} days`, `-${days} days`) as { c: number } | undefined;
  const uniqueVisitorsPrior = Number(uniquePriorRow?.c || 0);

  // Live band: peak today + uptime 30d + current
  const peakRow = await db
    .prepare(`SELECT MAX(players) AS m FROM app_server_online_samples WHERE server_id = ? AND datetime(recorded_at) >= date('now')`)
    .get(input.serverId) as { m: number | null } | undefined;
  const peakToday = Number(peakRow?.m || 0);

  const uptimeRow = await db
    .prepare(`SELECT AVG(CASE WHEN online = 1 THEN 1.0 ELSE 0.0 END) AS up FROM app_server_online_samples WHERE server_id = ? AND datetime(recorded_at) >= datetime('now', '-30 days')`)
    .get(input.serverId) as { up: number | null } | undefined;
  const uptime30 = uptimeRow?.up == null ? null : Math.round(Number(uptimeRow.up) * 1000) / 10;

  const latest = await getLatestServerOnlineSample(input.serverId);

  // Time-bucketed chart: use finer buckets for short ranges and wider buckets for long ranges.
  const bucketHoursByRange: Record<DashRange, number> = {
    '24h': 1,
    '7d': 6,
    '30d': 24,
    '90d': 72,
    all: 24 * 30,
  };
  const bucketMs = bucketHoursByRange[range] * 60 * 60 * 1000;
  const chartStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const chartEnd = new Date();
  const firstBucket = Math.floor(chartStart.getTime() / bucketMs) * bucketMs;
  const lastBucket = Math.floor(chartEnd.getTime() / bucketMs) * bucketMs;
  const sampleRows = await db
    .prepare(
      `SELECT players, recorded_at
       FROM app_server_online_samples
       WHERE server_id = ? AND datetime(recorded_at) >= datetime('now', ?)
       ORDER BY datetime(recorded_at) ASC`
    )
    .all(input.serverId, `-${days} days`) as Array<{ players: number; recorded_at: string }>;
  const viewRowsForChart = await db
    .prepare(
      `SELECT fingerprint, created_at
       FROM app_server_views
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)
       ORDER BY created_at ASC`
    )
    .all(input.serverId, `-${days} days`) as Array<{ fingerprint: string; created_at: string }>;
  const voteRowsForChart = await db
    .prepare(
      `SELECT created_at
       FROM app_server_nickname_votes
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)
       UNION ALL
       SELECT created_at
       FROM app_server_votes
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)
       ORDER BY created_at ASC`
    )
    .all(input.serverId, `-${days} days`, input.serverId, `-${days} days`) as Array<{ created_at: string }>;
  const playerBuckets = new Map<number, { total: number; count: number; peak: number }>();
  for (const row of sampleRows) {
    const time = new Date(row.recorded_at).getTime();
    if (!Number.isFinite(time)) continue;
    const key = Math.floor(time / bucketMs) * bucketMs;
    const current = playerBuckets.get(key) || { total: 0, count: 0, peak: 0 };
    const players = Math.max(0, Number(row.players || 0));
    current.total += players;
    current.count += 1;
    current.peak = Math.max(current.peak, players);
    playerBuckets.set(key, current);
  }
  const visitorBuckets = new Map<number, Set<string>>();
  const viewBuckets = new Map<number, number>();
  for (const row of viewRowsForChart) {
    const time = new Date(row.created_at).getTime();
    if (!Number.isFinite(time)) continue;
    const key = Math.floor(time / bucketMs) * bucketMs;
    const set = visitorBuckets.get(key) || new Set<string>();
    set.add(String(row.fingerprint || 'guest'));
    visitorBuckets.set(key, set);
    viewBuckets.set(key, (viewBuckets.get(key) || 0) + 1);
  }
  const voteBuckets = new Map<number, number>();
  for (const row of voteRowsForChart) {
    const time = new Date(row.created_at).getTime();
    if (!Number.isFinite(time)) continue;
    const key = Math.floor(time / bucketMs) * bucketMs;
    voteBuckets.set(key, (voteBuckets.get(key) || 0) + 1);
  }
  const chart: Array<{ date: string; online: number; peak: number; visitors: number; views: number; votes: number }> = [];
  for (let cursor = firstBucket; cursor <= lastBucket; cursor += bucketMs) {
    const player = playerBuckets.get(cursor);
    chart.push({
      date: new Date(cursor).toISOString(),
      online: player && player.count > 0 ? Math.round(player.total / player.count) : 0,
      peak: player?.peak || 0,
      visitors: visitorBuckets.get(cursor)?.size || 0,
      views: viewBuckets.get(cursor) || 0,
      votes: voteBuckets.get(cursor) || 0,
    });
  }

  // Activity feed: merge votes + reviews + views (last 50 each), sort, limit 60
  const recentVotes = (await listServerVotes(input.serverId, 50)).map<DashActivityItem>((v) => ({
    kind: 'vote',
    actor: v.nickname,
    actorKind: 'mc',
    detail: `Голос #${v.id}`,
    createdAt: v.createdAt,
  }));
  const recentReviewsRows = await db
    .prepare(
      `SELECT r.id, r.text, r.rating, r.created_at, r.author_name, r.user_id,
              u.full_name AS user_full_name, u.avatar_url AS user_avatar, u.profile_slug AS user_slug
       FROM app_server_reviews r
       LEFT JOIN app_users u ON u.id = r.user_id
       WHERE r.server_id = ?
       ORDER BY datetime(r.created_at) DESC
       LIMIT 50`
    )
    .all(input.serverId) as Array<{
      id: number;
      text: string | null;
      rating: number;
      created_at: string;
      author_name: string | null;
      user_id: string | null;
      user_full_name: string | null;
      user_avatar: string | null;
      user_slug: string | null;
    }>;
  const recentReviews = recentReviewsRows.map<DashActivityItem>((row) => {
    const isProfile = Boolean(row.user_id);
    const actor = String(row.user_full_name || row.author_name || 'Гість');
    const text = String(row.text || '').trim();
    const trimmed = text.length > 90 ? `${text.slice(0, 90)}…` : text;
    return {
      kind: 'review',
      actor,
      actorKind: isProfile ? 'profile' : 'guest',
      detail: `${row.rating}★${trimmed ? ` "${trimmed}"` : ''}`,
      rating: Number(row.rating || 0),
      createdAt: row.created_at,
      avatarUrl: row.user_avatar || null,
      profileSlug: row.user_slug || null,
    };
  });
  const recentViewsRows = await db
    .prepare(
      `SELECT v.id, v.created_at, v.fingerprint, v.user_id,
              u.full_name AS user_full_name, u.avatar_url AS user_avatar, u.profile_slug AS user_slug
       FROM app_server_views v
       LEFT JOIN app_users u ON u.id = v.user_id
       WHERE v.server_id = ?
       ORDER BY datetime(v.created_at) DESC
       LIMIT 50`
    )
    .all(input.serverId) as Array<{
      id: number;
      created_at: string;
      fingerprint: string;
      user_id: string | null;
      user_full_name: string | null;
      user_avatar: string | null;
      user_slug: string | null;
    }>;
  const recentViews = recentViewsRows.map<DashActivityItem>((row) => {
    const isProfile = Boolean(row.user_id);
    const guestLabel = row.fingerprint ? `guest_${String(row.fingerprint).slice(0, 6)}` : 'guest';
    const actor = isProfile ? String(row.user_full_name || 'Користувач') : guestLabel;
    return {
      kind: 'view',
      actor,
      actorKind: isProfile ? 'profile' : 'guest',
      detail: isProfile ? 'Переглянув сторінку серверу' : 'Анонімний перегляд сторінки',
      createdAt: row.created_at,
      avatarUrl: row.user_avatar || null,
      profileSlug: row.user_slug || null,
    };
  });
  const activity = [...recentVotes, ...recentReviews, ...recentViews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 60);

  // Top voters (Minecraft nicknames)
  const topVoters = (await listTopServerVoters(input.serverId, 8)).map<DashTopVoter>((v) => ({
    id: v.id,
    nickname: v.nickname,
    voteCount: v.voteCount,
    createdAt: v.createdAt,
  }));

  // Recent reviews for the bottom card — include profile data
  const reviewsListRows = await db
    .prepare(
      `SELECT r.id, r.text, r.rating, r.created_at, r.author_name, r.user_id,
              u.full_name AS user_full_name, u.avatar_url AS user_avatar, u.profile_slug AS user_slug
       FROM app_server_reviews r
       LEFT JOIN app_users u ON u.id = r.user_id
       WHERE r.server_id = ?
       ORDER BY datetime(r.created_at) DESC
       LIMIT 4`
    )
    .all(input.serverId) as Array<{
      id: number;
      text: string | null;
      rating: number;
      created_at: string;
      author_name: string | null;
      user_id: string | null;
      user_full_name: string | null;
      user_avatar: string | null;
      user_slug: string | null;
    }>;
  const reviewsList: DashReviewItem[] = reviewsListRows.map((row) => ({
    id: Number(row.id),
    authorName: String(row.user_full_name || row.author_name || 'Гість'),
    avatarUrl: row.user_avatar || null,
    profileSlug: row.user_slug || null,
    text: String(row.text || ''),
    rating: Number(row.rating || 0),
    createdAt: row.created_at,
  }));

  // List of all servers owned by the user (for the dashboard server-picker)
  const ownedServerRows = await db
    .prepare(
      `SELECT id, name, addr, avatar_url
       FROM app_servers
       WHERE owner_id = ?
       ORDER BY name COLLATE NOCASE ASC`
    )
    .all(input.userId) as Array<{ id: number; name: string; addr: string; avatar_url: string | null }>;
  const ownedServers: DashOwnedServer[] = ownedServerRows.map((row) => ({
    seed: Number(row.id),
    name: String(row.name || ''),
    ic: getServerInitials(String(row.name || '')),
    addr: String(row.addr || ''),
    avatarUrl: row.avatar_url || null,
  }));

  // Heatmap: views by (day_of_week × hour) over last 7 days
  const heatRows = await db
    .prepare(
      `SELECT
         CAST(strftime('%w', created_at) AS INTEGER) AS dow,
         CAST(strftime('%H', created_at) AS INTEGER) AS hour,
         COUNT(*) AS c
       FROM app_server_views
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', '-7 days')
       GROUP BY dow, hour`
    )
    .all(input.serverId) as Array<{ dow: number; hour: number; c: number }>;
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let heatMax = 0;
  heatRows.forEach((row) => {
    const dowSqlite = Number(row.dow); // 0 = Sunday in SQLite
    const dow = dowSqlite === 0 ? 6 : dowSqlite - 1; // remap: 0=Mon … 6=Sun
    const hour = Number(row.hour);
    const count = Number(row.c || 0);
    if (dow >= 0 && dow < 7 && hour >= 0 && hour < 24) {
      heatmap[dow][hour] = count;
      if (count > heatMax) heatMax = count;
    }
  });

  // Country breakdown — distinct visitors per country over the selected period
  const countryRows = await db
    .prepare(
      `SELECT
         COALESCE(NULLIF(country_code, ''), 'UN') AS code,
         COUNT(DISTINCT fingerprint) AS visitors
       FROM app_server_views
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)
       GROUP BY code
       ORDER BY visitors DESC
       LIMIT 8`
    )
    .all(input.serverId, `-${days} days`) as Array<{ code: string; visitors: number }>;
  const countryTotal = countryRows.reduce((sum, row) => sum + Number(row.visitors || 0), 0);
  const byCountry = countryRows.map((row) => ({
    code: String(row.code || 'UN').toUpperCase(),
    visitors: Number(row.visitors || 0),
    percent: countryTotal > 0 ? (Number(row.visitors) / countryTotal) * 100 : 0,
  }));

  const trafficRows = await db
    .prepare(
      `SELECT
         COALESCE(NULLIF(traffic_source, ''), 'direct') AS source,
         COUNT(DISTINCT fingerprint) AS visitors
       FROM app_server_views
       WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)
       GROUP BY source
       ORDER BY visitors DESC
       LIMIT 8`
    )
    .all(input.serverId, `-${days} days`) as Array<{ source: string; visitors: number }>;
  const trafficTotal = trafficRows.reduce((sum, row) => sum + Number(row.visitors || 0), 0);
  const trafficSources: DashTrafficSource[] = trafficRows.map((row) => ({
    source: String(row.source || 'direct'),
    visitors: Number(row.visitors || 0),
    percent: trafficTotal > 0 ? (Number(row.visitors || 0) / trafficTotal) * 100 : 0,
  }));
  const referralLinks = await listServerReferralLinks({
    serverId: input.serverId,
    userId: input.userId,
    isAdmin: input.isAdmin,
  });

  return {
    range,
    days,
    summary,
    kpi: {
      votes: { current: votesNow, prior: votesPrior },
      visitors: { current: uniqueVisitorsNow, prior: uniqueVisitorsPrior },
      views: { current: viewsNow, prior: viewsPrior },
      reviews: { current: reviewsNow, prior: reviewsPrior },
      rating: { current: ratingNow, prior: ratingPrior, overall: summary.averageRating },
    },
    live: {
      currentPlayers: latest?.players || 0,
      currentMax: latest?.max || 0,
      online: Boolean(latest?.online),
      peakToday,
      uptime30,
      lastSampleAt: latest?.recordedAt || null,
    },
    chart,
    activity,
    topVoters,
    reviews: reviewsList,
    heatmap,
    heatMax,
    ownedServers,
    byCountry,
    trafficSources,
    referralLinks,
  };
}

export async function updateServerLiveStatus(input: {
  serverId: number;
  online: boolean;
  players: number;
  max: number;
}) {
  const db = getDb();
  await db.prepare(
    `UPDATE app_servers
     SET online = ?, players = ?, max = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.online ? 1 : 0,
    Math.max(0, Number(input.players || 0)),
    Math.max(0, Number(input.max || 0)),
    nowIso(),
    input.serverId
  );
}

/**
 * Backfill missing country_code on app_server_views rows that have an IP but no country.
 * Returns the number of rows that were updated. Safe to call repeatedly.
 */
export async function backfillViewCountries(input: { serverId?: number; limit?: number } = {}) {
  const db = getDb();
  const limit = Math.max(1, Math.min(Number(input.limit || 50), 200));
  const rows = (input.serverId
    ? await db.prepare(
        `SELECT id, ip_address FROM app_server_views
         WHERE server_id = ?
           AND (country_code IS NULL OR country_code = '')
           AND ip_address IS NOT NULL AND ip_address != ''
         ORDER BY id DESC LIMIT ?`
      ).all(input.serverId, limit)
    : await db.prepare(
        `SELECT id, ip_address FROM app_server_views
         WHERE (country_code IS NULL OR country_code = '')
           AND ip_address IS NOT NULL AND ip_address != ''
         ORDER BY id DESC LIMIT ?`
      ).all(limit)) as Array<{ id: number; ip_address: string }>;
  if (rows.length === 0) return { scanned: 0, updated: 0 };
  const { lookupCountry } = await import('@/lib/geoip');
  let updated = 0;
  // Group by IP to minimize lookups
  const ipToIds = new Map<string, number[]>();
  rows.forEach((row) => {
    const ip = String(row.ip_address || '').trim();
    if (!ip) return;
    const list = ipToIds.get(ip) || [];
    list.push(Number(row.id));
    ipToIds.set(ip, list);
  });
  const updateStmt = await db.prepare('UPDATE app_server_views SET country_code = ? WHERE id = ?');
  const entries = Array.from(ipToIds.entries());
  for (let i = 0; i < entries.length; i += 1) {
    const [ip, ids] = entries[i];
    const geo = await lookupCountry(ip);
    if (!geo?.code) continue;
    for (let j = 0; j < ids.length; j += 1) {
      await updateStmt.run(geo.code, ids[j]);
      updated += 1;
    }
  }
  return { scanned: rows.length, updated };
}

// ─── User profile summary (karma + activity feed) ───────────────────────────

export type UserProfileActivityKind =
  | 'server_created'
  | 'server_verified'
  | 'vote_received'
  | 'review_received'
  | 'profile_updated';

export type UserProfileActivity = {
  kind: UserProfileActivityKind;
  serverId: number | null;
  serverName: string | null;
  actor: string | null;
  detail: string;
  rating?: number | null;
  createdAt: string;
};

export type UserProfileSummary = {
  votesReceived: number;
  reviewsReceived: number;
  viewsReceived: number;
  averageRating: number;
  serversCount: number;
  karma: number;
  activity: UserProfileActivity[];
};

/**
 * Aggregate engagement on all servers owned by the user, plus a recent
 * activity feed (server creations, votes received, reviews received,
 * profile updates).
 *
 * Karma = votes_received + reviews_received × 5 + round((avg_rating - 3) × reviews × 2)
 *   - rewards both popularity (votes) and quality (positive reviews)
 *   - average rating > 3 boosts, < 3 lightly penalises
 */
export async function getUserProfileSummary(userId: string, activityLimit = 30) {
  const db = getDb();

  // Engagement aggregates across the user's owned servers
  const engagementRow = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM app_server_nickname_votes v
            JOIN app_servers s ON s.id = v.server_id
            WHERE s.owner_id = ?) AS votes_received,
         (SELECT COUNT(*) FROM app_server_reviews r
            JOIN app_servers s ON s.id = r.server_id
            WHERE s.owner_id = ?) AS reviews_received,
         (SELECT COUNT(*) FROM app_server_views vw
            JOIN app_servers s ON s.id = vw.server_id
            WHERE s.owner_id = ?) AS views_received,
         (SELECT AVG(r.rating) FROM app_server_reviews r
            JOIN app_servers s ON s.id = r.server_id
            WHERE s.owner_id = ?) AS avg_rating,
         (SELECT COUNT(*) FROM app_servers WHERE owner_id = ?) AS servers_count`
    )
    .get(userId, userId, userId, userId, userId) as {
      votes_received: number | null;
      reviews_received: number | null;
      views_received: number | null;
      avg_rating: number | null;
      servers_count: number | null;
    } | undefined;

  const votesReceived = Number(engagementRow?.votes_received || 0);
  const reviewsReceived = Number(engagementRow?.reviews_received || 0);
  const viewsReceived = Number(engagementRow?.views_received || 0);
  const averageRating = Number(engagementRow?.avg_rating || 0);
  const serversCount = Number(engagementRow?.servers_count || 0);

  const ratingBonus = reviewsReceived > 0 ? Math.round((averageRating - 3) * reviewsReceived * 2) : 0;
  const karma = Math.max(0, votesReceived + reviewsReceived * 5 + ratingBonus);

  // Recent activity — pulled from multiple tables, merged client-side, sorted desc.
  const safeLimit = Math.max(1, Math.min(Number(activityLimit || 30), 100));

  const serverRows = await db
    .prepare(
      `SELECT id, name, created_at, verified
       FROM app_servers
       WHERE owner_id = ?
       ORDER BY datetime(created_at) DESC
       LIMIT ?`
    )
    .all(userId, safeLimit) as Array<{ id: number; name: string; created_at: string; verified: number }>;

  const voteRows = await db
    .prepare(
      `SELECT v.id, v.nickname, v.created_at, s.id AS server_id, s.name AS server_name
       FROM app_server_nickname_votes v
       JOIN app_servers s ON s.id = v.server_id
       WHERE s.owner_id = ?
       ORDER BY datetime(v.created_at) DESC
       LIMIT ?`
    )
    .all(userId, safeLimit) as Array<{ id: number; nickname: string; created_at: string; server_id: number; server_name: string }>;

  const reviewRows = await db
    .prepare(
      `SELECT r.id, r.text, r.rating, r.created_at, r.author_name,
              s.id AS server_id, s.name AS server_name,
              u.full_name AS reviewer_name
       FROM app_server_reviews r
       JOIN app_servers s ON s.id = r.server_id
       LEFT JOIN app_users u ON u.id = r.user_id
       WHERE s.owner_id = ?
       ORDER BY datetime(r.created_at) DESC
       LIMIT ?`
    )
    .all(userId, safeLimit) as Array<{
      id: number;
      text: string | null;
      rating: number;
      created_at: string;
      author_name: string | null;
      server_id: number;
      server_name: string;
      reviewer_name: string | null;
    }>;

  const profileRow = await db
    .prepare('SELECT updated_at, created_at FROM app_users WHERE id = ? LIMIT 1')
    .get(userId) as { updated_at: string | null; created_at: string | null } | undefined;

  const activity: UserProfileActivity[] = [];

  serverRows.forEach((row) => {
    activity.push({
      kind: 'server_created',
      serverId: Number(row.id),
      serverName: String(row.name || ''),
      actor: null,
      detail: 'Додав сервер у моніторинг',
      createdAt: row.created_at,
    });
    if (Number(row.verified) > 0) {
      activity.push({
        kind: 'server_verified',
        serverId: Number(row.id),
        serverName: String(row.name || ''),
        actor: null,
        detail: 'Сервер пройшов верифікацію',
        createdAt: row.created_at,
      });
    }
  });

  voteRows.forEach((row) => {
    activity.push({
      kind: 'vote_received',
      serverId: Number(row.server_id),
      serverName: String(row.server_name || ''),
      actor: String(row.nickname || ''),
      detail: `Голос від ${row.nickname}`,
      createdAt: row.created_at,
    });
  });

  reviewRows.forEach((row) => {
    const text = String(row.text || '').trim();
    const trimmed = text.length > 90 ? `${text.slice(0, 90)}…` : text;
    const reviewer = String(row.reviewer_name || row.author_name || 'Гість');
    activity.push({
      kind: 'review_received',
      serverId: Number(row.server_id),
      serverName: String(row.server_name || ''),
      actor: reviewer,
      detail: `${row.rating}★ від ${reviewer}${trimmed ? ` — "${trimmed}"` : ''}`,
      rating: Number(row.rating),
      createdAt: row.created_at,
    });
  });

  if (profileRow?.updated_at && profileRow.updated_at !== profileRow.created_at) {
    activity.push({
      kind: 'profile_updated',
      serverId: null,
      serverName: null,
      actor: null,
      detail: 'Оновив свій профіль',
      createdAt: profileRow.updated_at,
    });
  }

  activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    votesReceived,
    reviewsReceived,
    viewsReceived,
    averageRating,
    serversCount,
    karma,
    activity: activity.slice(0, safeLimit),
  };
}

function mapNewsPostRow(row: DbNewsRow): NewsPost {
  const blocks = parseNewsBlocks(row.content_json, row.content);
  return {
    id: Number(row.id),
    authorUserId: String(row.author_user_id || ''),
    title: String(row.title || ''),
    excerpt: String(row.excerpt || ''),
    content: String(row.content || ''),
    blocks,
    category: String(row.category || 'Новини'),
    coverUrl: row.cover_url || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: String(row.full_name || 'Користувач'),
    authorSlug: row.profile_slug || null,
    authorAvatarUrl: row.avatar_url || null,
  };
}

function normalizeNewsText(value: string, maxLength: number): string {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function isValidVideoUrl(value: string): boolean {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  // Site-relative paths produced by /api/uploads (locally hosted videos)
  if (trimmed.startsWith('/api/uploads/')) return true;
  if (trimmed.startsWith('/uploads/')) return true;
  return false;
}

function buildNewsPlainContent(blocks: NewsContentBlock[]): string {
  const lines: string[] = [];
  blocks.forEach((block) => {
    if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote') {
      const text = String(block.text || '').trim();
      if (text) {
        lines.push(text);
      }
    }
    if ((block.type === 'image' || block.type === 'video') && block.caption) {
      lines.push(String(block.caption).trim());
    }
    if (block.type === 'gallery' && block.caption) {
      lines.push(String(block.caption).trim());
    }
  });
  return normalizeNewsText(lines.join('\n\n'), 4000);
}

function normalizeNewsBlocks(input: { blocks?: NewsContentBlock[]; fallbackContent: string }): NewsContentBlock[] {
  const incomingBlocks = Array.isArray(input.blocks) ? input.blocks : [];
  const normalizedBlocks: NewsContentBlock[] = [];
  incomingBlocks.forEach((block, index) => {
    const id = normalizeNewsText(block?.id || `block-${index + 1}`, 64) || `block-${index + 1}`;
    const type = String(block?.type || '').trim() as NewsBlockType;
    if (type === 'heading' || type === 'paragraph' || type === 'quote') {
      const text = normalizeNewsText(String(block?.text || ''), 2500);
      if (text) {
        normalizedBlocks.push({ id, type, text });
      }
      return;
    }
    if (type === 'image') {
      const url = sanitizeImageUrl(block?.url || '', 'News image');
      if (!url) {
        return;
      }
      normalizedBlocks.push({
        id,
        type,
        url,
        caption: normalizeNewsText(String(block?.caption || ''), 220),
      });
      return;
    }
    if (type === 'video') {
      const url = normalizeNewsText(String(block?.url || ''), 2048);
      if (!url || !isValidVideoUrl(url)) {
        return;
      }
      normalizedBlocks.push({
        id,
        type,
        url,
        caption: normalizeNewsText(String(block?.caption || ''), 220),
      });
      return;
    }
    if (type === 'gallery') {
      const urls = (Array.isArray(block?.urls) ? block.urls : [])
        .map((url) => sanitizeImageUrl(String(url || ''), 'News gallery image'))
        .filter((url): url is string => Boolean(url))
        .slice(0, 20);
      if (urls.length === 0) return;
      normalizedBlocks.push({
        id,
        type,
        urls,
        caption: normalizeNewsText(String(block?.caption || ''), 220),
      });
    }
  });
  if (normalizedBlocks.length === 0) {
    const fallbackText = normalizeNewsText(input.fallbackContent, 4000);
    if (fallbackText) {
      return [{ id: 'block-1', type: 'paragraph', text: fallbackText }];
    }
  }
  return normalizedBlocks.slice(0, 80);
}

function parseNewsBlocks(rawJson: string | null, fallbackContent: string): NewsContentBlock[] {
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as NewsContentBlock[];
      const blocks = normalizeNewsBlocks({
        blocks: parsed,
        fallbackContent,
      });
      if (blocks.length > 0) {
        return blocks;
      }
    } catch {}
  }
  return normalizeNewsBlocks({
    fallbackContent,
  });
}

export async function listNewsPosts(limit = 30) {
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT
         n.id, n.author_user_id, n.title, n.excerpt, n.content, n.content_json, n.category, n.cover_url, n.created_at, n.updated_at,
         u.full_name, u.profile_slug, u.avatar_url
       FROM app_news_posts n
       JOIN app_users u ON u.id = n.author_user_id
       ORDER BY datetime(n.created_at) DESC
       LIMIT ?`
    )
    .all(Math.max(1, Math.min(Number(limit || 30), 100))) as DbNewsRow[];
  return rows.map(mapNewsPostRow);
}

export async function getNewsPostById(newsId: number) {
  const db = getDb();
  const row = await db
    .prepare(
      `SELECT
         n.id, n.author_user_id, n.title, n.excerpt, n.content, n.content_json, n.category, n.cover_url, n.created_at, n.updated_at,
         u.full_name, u.profile_slug, u.avatar_url
       FROM app_news_posts n
       JOIN app_users u ON u.id = n.author_user_id
       WHERE n.id = ?
       LIMIT 1`
    )
    .get(newsId) as DbNewsRow | undefined;
  if (!row) {
    return null;
  }
  return mapNewsPostRow(row);
}

export async function createNewsPost(input: {
  authorUserId: string;
  title: string;
  excerpt?: string;
  content?: string;
  blocks?: NewsContentBlock[];
  category?: string;
  coverUrl?: string | null;
}) {
  const db = getDb();
  const title = normalizeNewsText(input.title, 140);
  const blocks = normalizeNewsBlocks({
    blocks: input.blocks,
    fallbackContent: String(input.content || ''),
  });
  const content = buildNewsPlainContent(blocks);
  const excerpt = normalizeNewsText(input.excerpt || '', 320);
  const category = normalizeNewsText(input.category || 'Новини', 40) || 'Новини';
  const coverUrl = input.coverUrl === undefined ? null : sanitizeImageUrl(input.coverUrl, 'News cover');
  if (!title) {
    throw new Error('Заголовок новини є обовʼязковим');
  }
  if (!content) {
    throw new Error('Текст новини є обовʼязковим');
  }
  const createdAt = nowIso();
  const result = await db
    .prepare(
      `INSERT INTO app_news_posts (author_user_id, title, excerpt, content, content_json, category, cover_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.authorUserId,
      title,
      excerpt,
      content,
      JSON.stringify(blocks),
      category,
      coverUrl,
      createdAt,
      createdAt
    ) as { lastInsertRowid?: number | bigint };
  const insertedRow = await db
    .prepare(
      `SELECT
         n.id, n.author_user_id, n.title, n.excerpt, n.content, n.content_json, n.category, n.cover_url, n.created_at, n.updated_at,
         u.full_name, u.profile_slug, u.avatar_url
       FROM app_news_posts n
       JOIN app_users u ON u.id = n.author_user_id
       WHERE n.id = ?
       LIMIT 1`
    )
    .get(Number(result.lastInsertRowid || 0)) as DbNewsRow | undefined;
  if (!insertedRow) {
    throw new Error('Не вдалося створити новину');
  }
  return mapNewsPostRow(insertedRow);
}

async function assertNewsPostAccess(input: { newsId: number; actorUserId: string; isAdmin?: boolean }) {
  if (input.isAdmin) {
    return;
  }
  const current = await getNewsPostById(input.newsId);
  if (!current || current.authorUserId !== input.actorUserId) {
    throw new Error('Новину не знайдено або доступ заборонено');
  }
}

export async function updateNewsPost(input: UpdateNewsPostInput) {
  await assertNewsPostAccess({
    newsId: input.newsId,
    actorUserId: input.actorUserId,
    isAdmin: input.isAdmin,
  });
  const db = getDb();
  const title = normalizeNewsText(input.title, 140);
  const blocks = normalizeNewsBlocks({
    blocks: input.blocks,
    fallbackContent: String(input.content || ''),
  });
  const content = buildNewsPlainContent(blocks);
  const excerpt = normalizeNewsText(input.excerpt || '', 320);
  const category = normalizeNewsText(input.category || 'Новини', 40) || 'Новини';
  const coverUrl = input.coverUrl === undefined ? null : sanitizeImageUrl(input.coverUrl, 'News cover');
  if (!title) {
    throw new Error('Заголовок новини є обовʼязковим');
  }
  if (!content) {
    throw new Error('Текст новини є обовʼязковим');
  }
  await db.prepare(
    `UPDATE app_news_posts
     SET title = ?, excerpt = ?, content = ?, content_json = ?, category = ?, cover_url = ?, updated_at = ?
     WHERE id = ?`
  ).run(title, excerpt, content, JSON.stringify(blocks), category, coverUrl, nowIso(), input.newsId);
  const updated = await getNewsPostById(input.newsId);
  if (!updated) {
    throw new Error('Не вдалося оновити новину');
  }
  return updated;
}

export async function deleteNewsPost(input: { newsId: number; actorUserId: string; isAdmin?: boolean }) {
  await assertNewsPostAccess({
    newsId: input.newsId,
    actorUserId: input.actorUserId,
    isAdmin: input.isAdmin,
  });
  const db = getDb();
  await db.prepare('DELETE FROM app_news_posts WHERE id = ?').run(input.newsId);
  return { success: true };
}

export async function countServerActivityInDays(input: { serverId: number; days?: number }) {
  const db = getDb();
  const days = Math.max(1, Math.min(Number(input.days || 30), 365));
  const windowExpr = `-${days} days`;
  const viewsRow = await db
    .prepare(`SELECT COUNT(*) AS c FROM app_server_views WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)`)
    .get(input.serverId, windowExpr) as { c: number } | undefined;
  const votesRow = await db
    .prepare(`SELECT COUNT(*) AS c FROM app_server_nickname_votes WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)`)
    .get(input.serverId, windowExpr) as { c: number } | undefined;
  const reviewsRow = await db
    .prepare(`SELECT COUNT(*) AS c FROM app_server_reviews WHERE server_id = ? AND datetime(created_at) >= datetime('now', ?)`)
    .get(input.serverId, windowExpr) as { c: number } | undefined;
  return {
    views: Number(viewsRow?.c || 0),
    votes: Number(votesRow?.c || 0),
    reviews: Number(reviewsRow?.c || 0),
  };
}

export type PublicServerActivityEvent = {
  id: string;
  type: 'vote.received' | 'review.created' | 'view.tracked';
  createdAt: string;
  payload: Record<string, string | number>;
};

export async function listServerActivityEvents(input: { serverId: number; limit?: number }) {
  const db = getDb();
  const limit = Math.max(1, Math.min(Number(input.limit || 25), 100));
  const voteRows = await db
    .prepare(
      `SELECT id, nickname, created_at
       FROM app_server_nickname_votes
       WHERE server_id = ?
       ORDER BY datetime(created_at) DESC
       LIMIT ?`
    )
    .all(input.serverId, limit) as Array<{ id: number; nickname: string; created_at: string }>;
  const reviewRows = await db
    .prepare(
      `SELECT id, COALESCE(author_name, 'Guest') AS author_name, rating, created_at
       FROM app_server_reviews
       WHERE server_id = ?
       ORDER BY datetime(created_at) DESC
       LIMIT ?`
    )
    .all(input.serverId, limit) as Array<{ id: number; author_name: string; rating: number; created_at: string }>;
  const viewRows = await db
    .prepare(
      `SELECT id, COALESCE(NULLIF(country_code, ''), 'UN') AS country_code, created_at
       FROM app_server_views
       WHERE server_id = ?
       ORDER BY datetime(created_at) DESC
       LIMIT ?`
    )
    .all(input.serverId, limit) as Array<{ id: number; country_code: string; created_at: string }>;
  const events: PublicServerActivityEvent[] = [
    ...voteRows.map((row) => ({
      id: `vote-${row.id}`,
      type: 'vote.received' as const,
      createdAt: row.created_at,
      payload: {
        nickname: String(row.nickname || 'unknown'),
      },
    })),
    ...reviewRows.map((row) => ({
      id: `review-${row.id}`,
      type: 'review.created' as const,
      createdAt: row.created_at,
      payload: {
        author: String(row.author_name || 'Guest'),
        rating: Number(row.rating || 0),
      },
    })),
    ...viewRows.map((row) => ({
      id: `view-${row.id}`,
      type: 'view.tracked' as const,
      createdAt: row.created_at,
      payload: {
        countryCode: String(row.country_code || 'UN').toUpperCase(),
      },
    })),
  ];
  return events
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only helpers
// ─────────────────────────────────────────────────────────────────────────────

export { ADMIN_EMAIL };

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string;
  profileSlug: string | null;
  role: string;
  createdAt: string;
  avatarUrl: string | null;
}

export type AdminStatsRow = {
  totalUsers: number;
  totalServers: number;
  totalNews: number;
  activeSessions: number;
  totalReviews: number;
  totalVotes: number;
}

export async function listAllUsers() {
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT id, email, full_name, profile_slug, role, created_at, avatar_url
       FROM app_users
       ORDER BY datetime(created_at) DESC`
    )
    .all() as Array<{
      id: string;
      email: string;
      full_name: string;
      profile_slug: string | null;
      role: string;
      created_at: string;
      avatar_url: string | null;
    }>;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    profileSlug: row.profile_slug,
    role: row.role,
    createdAt: row.created_at,
    avatarUrl: row.avatar_url,
  }));
}

export async function updateUserRoleById(userId: string, role: UserRole) {
  const db = getDb();
  await db.prepare('UPDATE app_users SET role = ?, updated_at = ? WHERE id = ?').run(
    role,
    new Date().toISOString(),
    userId
  );
  return { success: true };
}

export async function deleteUserById(userId: string) {
  const db = getDb();
  await db.prepare('DELETE FROM user_login_sessions WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM app_users WHERE id = ?').run(userId);
  return { success: true };
}

export async function verifyServerById(serverId: number, verified: boolean) {
  const db = getDb();
  await db.prepare('UPDATE app_servers SET verified = ?, updated_at = ? WHERE id = ?').run(
    verified ? 1 : 0,
    new Date().toISOString(),
    serverId
  );
  return { success: true };
}

export async function getAdminStats() {
  const db = getDb();
  const totalUsers = (await db.prepare('SELECT COUNT(*) AS cnt FROM app_users').get() as { cnt: number }).cnt;
  const totalServers = (await db.prepare('SELECT COUNT(*) AS cnt FROM app_servers').get() as { cnt: number }).cnt;
  const totalNews = (await db.prepare('SELECT COUNT(*) AS cnt FROM app_news_posts').get() as { cnt: number }).cnt;
  const activeSessions = (await db.prepare('SELECT COUNT(*) AS cnt FROM user_login_sessions WHERE revoked_at IS NULL').get() as { cnt: number }).cnt;
  const totalReviews = (await db.prepare('SELECT COUNT(*) AS cnt FROM app_server_reviews').get() as { cnt: number }).cnt;
  const totalVotes = (await db.prepare('SELECT COUNT(*) AS cnt FROM app_server_votes').get() as { cnt: number }).cnt;
  return { totalUsers, totalServers, totalNews, activeSessions, totalReviews, totalVotes };
}

// ─────────────────────────────────────────────────────────────────────────────
// Server applications
// ─────────────────────────────────────────────────────────────────────────────

export type ServerApplicationStatus = 'pending' | 'approved' | 'rejected';

export type ServerApplication = {
  id: number;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  status: ServerApplicationStatus;
  rejectionReason: string | null;
  name: string;
  addr: string;
  platform: ServerPlatform;
  mode: string;
  ver: string;
  core: string;
  country: string | null;
  motd: string | null;
  shortDesc: string;
  fullDesc: string;
  desc: string;
  website: string | null;
  discord: string | null;
  telegram: string | null;
  donate: string | null;
  tiktok: string | null;
  launcherUrl: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  gallery: string[];
  videos: string[];
  tags: string[];
  projectId: number | null;
  createdAt: string;
  reviewedAt: string | null;
}

type DbServerApplicationRow = {
  id: number;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  status: string;
  rejection_reason: string | null;
  name: string;
  addr: string;
  platform?: string | null;
  mode: string;
  ver: string;
  core: string;
  country: string | null;
  motd: string | null;
  short_desc: string | null;
  full_desc: string | null;
  desc: string | null;
  website: string | null;
  discord: string | null;
  telegram: string | null;
  donate: string | null;
  tiktok: string | null;
  launcher_url: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  gallery_json: string;
  videos_json: string;
  tags: string;
  project_id: number | null;
  created_at: string;
  reviewed_at: string | null;
}

function mapApplicationRow(row: DbServerApplicationRow): ServerApplication {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name || 'Unknown',
    ownerAvatar: row.owner_avatar,
    status: (row.status as ServerApplicationStatus) || 'pending',
    rejectionReason: row.rejection_reason,
    name: row.name,
    addr: row.addr,
    platform: row.platform === 'discord' ? 'discord' : 'minecraft',
    mode: row.mode,
    ver: row.ver,
    core: row.core,
    country: row.country,
    motd: row.motd,
    shortDesc: row.short_desc || '',
    fullDesc: row.full_desc || '',
    desc: row.desc || '',
    website: row.website,
    discord: row.discord,
    telegram: row.telegram,
    donate: row.donate,
    tiktok: row.tiktok,
    launcherUrl: row.launcher_url,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    gallery: JSON.parse(row.gallery_json || '[]') as string[],
    videos: JSON.parse(row.videos_json || '[]') as string[],
    tags: JSON.parse(row.tags || '[]') as string[],
    projectId: row.project_id ?? null,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function createServerApplication(input: {
  ownerId: string;
  name: string;
  addr: string;
  platform?: ServerPlatform;
  mode: string;
  ver: string;
  core?: string;
  country?: string;
  motd?: string;
  shortDesc?: string;
  fullDesc?: string;
  desc?: string;
  website?: string;
  discord?: string;
  telegram?: string;
  donate?: string;
  tiktok?: string;
  launcherUrl?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  gallery?: string[];
  videos?: string[];
  tags?: string[];
  projectId?: number | null;
}) {
  const db = getDb();
  const platform: ServerPlatform = input.platform === 'discord' ? 'discord' : 'minecraft';
  const normalizedAddr = normalizeServerAddress(input.addr, platform);
  const existingServer = await db.prepare('SELECT id FROM app_servers WHERE lower(addr) = lower(?) LIMIT 1').get(normalizedAddr);
  if (existingServer) {
    throw new Error('Сервер із цією адресою вже існує');
  }
  const existingApp = await db
    .prepare("SELECT id FROM app_server_applications WHERE lower(addr) = lower(?) AND status = 'pending' LIMIT 1")
    .get(normalizedAddr);
  if (existingApp) {
    throw new Error('Заявка для цього сервера вже знаходиться на розгляді');
  }
  const ownerRow = await db
    .prepare('SELECT full_name, avatar_url FROM app_users WHERE id = ? LIMIT 1')
    .get(input.ownerId) as { full_name: string; avatar_url: string | null } | undefined;
  const timestamp = nowIso();
  const result = await db
    .prepare(
      `INSERT INTO app_server_applications (
        owner_id, owner_name, owner_avatar, status,
        name, addr, platform, mode, ver, core, country, motd,
        short_desc, full_desc, desc, website, discord, telegram,
        donate, tiktok, launcher_url, avatar_url, banner_url,
        gallery_json, videos_json, tags, project_id, created_at
      ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.ownerId,
      ownerRow?.full_name || null,
      ownerRow?.avatar_url || null,
      String(input.name || '').trim(),
      normalizedAddr,
      platform,
      String(input.mode || (platform === 'discord' ? 'Community' : 'Survival')).trim(),
      String(input.ver || (platform === 'discord' ? 'Discord' : '1.21.11')).trim(),
      platform === 'discord' ? 'discord' : String(input.core || 'java').trim(),
      String(input.country || '').trim() || null,
      String(input.motd || '').trim() || null,
      String(input.shortDesc || '').trim(),
      String(input.fullDesc || '').trim(),
      String(input.desc || '').trim(),
      String(input.website || '').trim() || null,
      String(input.discord || '').trim() || null,
      String(input.telegram || '').trim() || null,
      String(input.donate || '').trim() || null,
      String(input.tiktok || '').trim() || null,
      String(input.launcherUrl || '').trim() || null,
      String(input.avatarUrl || '').trim() || null,
      String(input.bannerUrl || '').trim() || null,
      JSON.stringify((input.gallery || []).slice(0, 6)),
      JSON.stringify((input.videos || []).slice(0, 2)),
      JSON.stringify((input.tags || []).slice(0, 6)),
      input.projectId ?? null,
      timestamp
    ) as { lastInsertRowid?: number | bigint };
  return { applicationId: Number(result.lastInsertRowid) };
}

export async function listServerApplications(status?: ServerApplicationStatus) {
  const db = getDb();
  const rows = status
    ? (await db.prepare('SELECT * FROM app_server_applications WHERE status = ? ORDER BY datetime(created_at) DESC').all(status) as DbServerApplicationRow[])
    : (await db.prepare('SELECT * FROM app_server_applications ORDER BY datetime(created_at) DESC').all() as DbServerApplicationRow[]);
  return rows.map(mapApplicationRow);
}

export async function getServerApplicationById(id: number) {
  const db = getDb();
  const row = await db
    .prepare('SELECT * FROM app_server_applications WHERE id = ? LIMIT 1')
    .get(id) as DbServerApplicationRow | undefined;
  return row ? mapApplicationRow(row) : null;
}

export async function approveServerApplication(id: number) {
  const db = getDb();
  const app = await getServerApplicationById(id);
  if (!app) {
    throw new Error('Заявку не знайдено');
  }
  if (app.status !== 'pending') {
    throw new Error('Заявка вже була розглянута');
  }
  const server = await createServer({
    ownerId: app.ownerId,
    name: app.name,
    addr: app.addr,
    platform: app.platform,
    mode: app.mode,
    ver: app.ver,
    core: app.platform === 'discord' ? 'java' : (app.core as 'java' | 'bedrock' | 'java_bedrock'),
    country: app.country || undefined,
    motd: app.motd || undefined,
    shortDesc: app.shortDesc,
    fullDesc: app.fullDesc,
    desc: app.desc,
    website: app.website || undefined,
    discord: app.discord || undefined,
    telegram: app.telegram || undefined,
    donate: app.donate || undefined,
    tiktok: app.tiktok || undefined,
    launcherUrl: app.launcherUrl || undefined,
    avatarUrl: app.avatarUrl || undefined,
    bannerUrl: app.bannerUrl || undefined,
    gallery: app.gallery,
    videos: app.videos,
    tags: app.tags,
    projectId: app.projectId ?? undefined,
  });
  await db.prepare(
    "UPDATE app_server_applications SET status = 'approved', reviewed_at = ? WHERE id = ?"
  ).run(nowIso(), id);
  const notificationPreferences = await db
    .prepare(
      `SELECT enabled, system_enabled
       FROM app_notification_preferences
       WHERE user_id = ?
       LIMIT 1`
    )
    .get(app.ownerId) as { enabled: number; system_enabled: number } | undefined;
  if (server && (!notificationPreferences || (notificationPreferences.enabled && notificationPreferences.system_enabled))) {
    await db.prepare(
      `INSERT INTO app_notifications (user_id, server_id, type, title, body, is_read, created_at)
       VALUES (?, ?, 'system', ?, ?, 0, ?)`
    ).run(
      app.ownerId,
      server.seed,
      'Заявку схвалено',
      `Ваш сервер "${app.name}" схвалено і тепер відображається в каталозі.`,
      nowIso()
    );
  }
  return { success: true, serverId: server?.seed ?? 0 };
}

export async function rejectServerApplication(id: number, reason?: string) {
  const db = getDb();
  const app = await getServerApplicationById(id);
  if (!app) {
    throw new Error('Заявку не знайдено');
  }
  if (app.status !== 'pending') {
    throw new Error('Заявка вже була розглянута');
  }
  await db.prepare(
    "UPDATE app_server_applications SET status = 'rejected', rejection_reason = ?, reviewed_at = ? WHERE id = ?"
  ).run(reason || null, nowIso(), id);
  const notificationPreferences = await db
    .prepare(
      `SELECT enabled, system_enabled
       FROM app_notification_preferences
       WHERE user_id = ?
       LIMIT 1`
    )
    .get(app.ownerId) as { enabled: number; system_enabled: number } | undefined;
  if (!notificationPreferences || (notificationPreferences.enabled && notificationPreferences.system_enabled)) {
    await db.prepare(
      `INSERT INTO app_notifications (user_id, server_id, type, title, body, is_read, created_at)
       VALUES (?, NULL, 'system', ?, ?, 0, ?)`
    ).run(
      app.ownerId,
      'Заявку відхилено',
      reason
        ? `Ваш сервер "${app.name}" відхилено. Причина: ${reason}`
        : `Ваш сервер "${app.name}" було відхилено адміністратором.`,
      nowIso()
    );
  }
  return { success: true };
}

export async function countPendingApplications() {
  const db = getDb();
  return (await db.prepare("SELECT COUNT(*) AS cnt FROM app_server_applications WHERE status = 'pending'").get() as { cnt: number }).cnt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Personal Access Tokens (PAT)
// ─────────────────────────────────────────────────────────────────────────────

export type ApiTokenScope = 'servers:read' | 'events:read';

export type ApiToken = {
  id: string;
  userId: string;
  serverId: number | null;
  name: string;
  scopes: ApiTokenScope[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

type DbApiTokenRow = {
  id: string;
  user_id: string;
  server_id: number | null;
  name: string;
  token_hash: string;
  scopes: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

function mapApiTokenRow(row: DbApiTokenRow): ApiToken {
  return {
    id: row.id,
    userId: row.user_id,
    serverId: row.server_id === null ? null : Number(row.server_id),
    name: row.name,
    scopes: JSON.parse(row.scopes || '["servers:read"]') as ApiTokenScope[],
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

export async function createApiToken(input: {
  userId: string;
  serverId: number;
  name: string;
  scopes: ApiTokenScope[];
}) {
  const db = getDb();
  const id = randomUUID();
  const plaintext = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(plaintext).digest('hex');
  const timestamp = nowIso();
  await db.prepare(
    `INSERT INTO app_api_tokens (id, user_id, server_id, name, token_hash, scopes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.userId, input.serverId, input.name.trim(), tokenHash, JSON.stringify(input.scopes), timestamp);
  const token = mapApiTokenRow({
    id,
    user_id: input.userId,
    server_id: input.serverId,
    name: input.name.trim(),
    token_hash: tokenHash,
    scopes: JSON.stringify(input.scopes),
    last_used_at: null,
    created_at: timestamp,
    revoked_at: null,
  });
  return { token, plaintext };
}

export async function listApiTokens(userId: string, serverId?: number) {
  const db = getDb();
  const rows = serverId
    ? await db
      .prepare('SELECT * FROM app_api_tokens WHERE user_id = ? AND server_id = ? AND revoked_at IS NULL ORDER BY datetime(created_at) DESC')
      .all(userId, serverId) as DbApiTokenRow[]
    : await db
      .prepare('SELECT * FROM app_api_tokens WHERE user_id = ? AND revoked_at IS NULL ORDER BY datetime(created_at) DESC')
      .all(userId) as DbApiTokenRow[];
  return rows.map(mapApiTokenRow);
}

export async function revokeApiToken(tokenId: string, userId: string) {
  const db = getDb();
  await db.prepare('UPDATE app_api_tokens SET revoked_at = ? WHERE id = ? AND user_id = ?').run(nowIso(), tokenId, userId);
  return { success: true };
}

export async function resolveApiToken(rawToken: string) {
  const db = getDb();
  const hash = createHash('sha256').update(rawToken).digest('hex');
  const row = await db
    .prepare('SELECT * FROM app_api_tokens WHERE token_hash = ? AND revoked_at IS NULL LIMIT 1')
    .get(hash) as DbApiTokenRow | undefined;
  if (!row) return null;
  await db.prepare('UPDATE app_api_tokens SET last_used_at = ? WHERE id = ?').run(nowIso(), row.id);
  return mapApiTokenRow(row);
}

// ─── Projects ────────────────────────────────────────────────────────────────

export type Project = {
  id: number;
  ownerId: string;
  name: string;
  description: string;
  logoUrl: string | null;
  website: string | null;
  discord: string | null;
  serverCount: number;
  createdAt: string;
  updatedAt: string;
};

type DbProjectRow = {
  id: number;
  owner_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  discord: string | null;
  server_count: number;
  created_at: string;
  updated_at: string;
};

function mapProjectRow(row: DbProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description || '',
    logoUrl: row.logo_url,
    website: row.website,
    discord: row.discord,
    serverCount: row.server_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createProject(input: {
  ownerId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  discord?: string;
}) {
  const db = getDb();
  const now = nowIso();
  const result = await db
    .prepare(
      `INSERT INTO app_projects (owner_id, name, description, logo_url, website, discord, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .get(
      input.ownerId,
      input.name.trim(),
      input.description?.trim() || '',
      input.logoUrl || null,
      input.website?.trim() || null,
      input.discord?.trim() || null,
      now,
      now
    ) as DbProjectRow;
  return mapProjectRow({ ...result, server_count: 0 });
}

export async function getProjectById(projectId: number) {
  const db = getDb();
  const row = await db
    .prepare(
      `SELECT p.*, COUNT(s.id) as server_count
       FROM app_projects p
       LEFT JOIN app_servers s ON s.project_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`
    )
    .get(projectId) as DbProjectRow | undefined;
  return row ? mapProjectRow(row) : null;
}

export async function listProjectsByOwner(ownerId: string) {
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT p.*, COUNT(s.id) as server_count
       FROM app_projects p
       LEFT JOIN app_servers s ON s.project_id = p.id
       WHERE p.owner_id = ?
       GROUP BY p.id
       ORDER BY datetime(p.created_at) DESC`
    )
    .all(ownerId) as DbProjectRow[];
  return rows.map(mapProjectRow);
}

export async function updateProject(input: {
  projectId: number;
  ownerId: string;
  name: string;
  description?: string;
  logoUrl?: string | null;
  website?: string | null;
  discord?: string | null;
}) {
  const db = getDb();
  const now = nowIso();
  await db.prepare(
    `UPDATE app_projects
     SET name = ?, description = ?, logo_url = ?, website = ?, discord = ?, updated_at = ?
     WHERE id = ? AND owner_id = ?`
  ).run(
    input.name.trim(),
    input.description?.trim() || '',
    input.logoUrl ?? null,
    input.website?.trim() ?? null,
    input.discord?.trim() ?? null,
    now,
    input.projectId,
    input.ownerId
  );
  const updated = getProjectById(input.projectId);
  if (!updated) throw new Error('Project not found');
  return updated;
}

export async function deleteProject(projectId: number, ownerId: string) {
  const db = getDb();
  await db.prepare(`UPDATE app_servers SET project_id = NULL WHERE project_id = ?`).run(projectId);
  await db.prepare(`DELETE FROM app_projects WHERE id = ? AND owner_id = ?`).run(projectId, ownerId);
}

// ─── Server Verification ─────────────────────────────────────────────────────

export type ServerVerification = {
  id: number;
  serverId: number;
  ownerId: string;
  token: string;
  createdAt: string;
  verifiedAt: string | null;
};

type DbVerificationRow = {
  id: number;
  server_id: number;
  owner_id: string;
  token: string;
  created_at: string;
  verified_at: string | null;
};

function mapVerificationRow(row: DbVerificationRow): ServerVerification {
  return {
    id: row.id,
    serverId: row.server_id,
    ownerId: row.owner_id,
    token: row.token,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
  };
}

function generateVerificationToken(): string {
  const part1 = randomBytes(4).toString('hex');
  const part2 = randomBytes(3).toString('hex');
  return `eyzencore-verify-${part1}-${part2}`;
}

export async function getOrCreateVerificationToken(serverId: number, ownerId: string) {
  const db = getDb();
  const existing = await db
    .prepare('SELECT * FROM app_server_verifications WHERE server_id = ? LIMIT 1')
    .get(serverId) as DbVerificationRow | undefined;
  if (existing) return mapVerificationRow(existing);
  const token = generateVerificationToken();
  const now = nowIso();
  const row = await db
    .prepare(
      `INSERT INTO app_server_verifications (server_id, owner_id, token, created_at)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    )
    .get(serverId, ownerId, token, now) as DbVerificationRow;
  return mapVerificationRow(row);
}

export async function regenerateVerificationToken(serverId: number, ownerId: string) {
  const db = getDb();
  const token = generateVerificationToken();
  const now = nowIso();
  await db.prepare('DELETE FROM app_server_verifications WHERE server_id = ? AND owner_id = ?').run(serverId, ownerId);
  const row = await db
    .prepare(
      `INSERT INTO app_server_verifications (server_id, owner_id, token, created_at)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    )
    .get(serverId, ownerId, token, now) as DbVerificationRow;
  return mapVerificationRow(row);
}

export async function markServerVerified(serverId: number) {
  const db = getDb();
  const now = nowIso();
  await db.prepare(`UPDATE app_servers SET verified = 1, updated_at = ? WHERE id = ?`).run(now, serverId);
  await db.prepare(`UPDATE app_server_verifications SET verified_at = ? WHERE server_id = ?`).run(now, serverId);
}

export async function getVerificationByServerId(serverId: number) {
  const db = getDb();
  const row = await db
    .prepare('SELECT * FROM app_server_verifications WHERE server_id = ? LIMIT 1')
    .get(serverId) as DbVerificationRow | undefined;
  return row ? mapVerificationRow(row) : null;
}

export async function assignServerToProject(serverId: number, projectId: number | null, ownerId: string) {
  const db = getDb();
  await db.prepare(`UPDATE app_servers SET project_id = ?, updated_at = ? WHERE id = ? AND owner_id = ?`).run(
    projectId,
    nowIso(),
    serverId,
    ownerId
  );
}
