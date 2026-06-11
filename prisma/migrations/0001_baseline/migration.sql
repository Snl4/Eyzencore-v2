-- CreateTable
CREATE TABLE "app_api_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '["servers:read"]',
    "last_used_at" TEXT,
    "created_at" TEXT NOT NULL,
    "revoked_at" TEXT,
    CONSTRAINT "app_api_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_news_posts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "author_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "content_json" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'Новини',
    "cover_url" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "app_news_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "server_id" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL,
    CONSTRAINT "app_notifications_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "logo_url" TEXT,
    "website" TEXT,
    "discord" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "app_projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_server_applications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "owner_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "name" TEXT NOT NULL,
    "addr" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'minecraft',
    "mode" TEXT NOT NULL,
    "ver" TEXT NOT NULL,
    "core" TEXT NOT NULL DEFAULT 'java',
    "country" TEXT,
    "motd" TEXT,
    "short_desc" TEXT DEFAULT '',
    "full_desc" TEXT DEFAULT '',
    "desc" TEXT DEFAULT '',
    "website" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "donate" TEXT,
    "tiktok" TEXT,
    "launcher_url" TEXT,
    "avatar_url" TEXT,
    "banner_url" TEXT,
    "gallery_json" TEXT NOT NULL DEFAULT '[]',
    "videos_json" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "owner_name" TEXT,
    "owner_avatar" TEXT,
    "created_at" TEXT NOT NULL,
    "reviewed_at" TEXT,
    "project_id" INTEGER,
    CONSTRAINT "app_server_applications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "app_projects" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "app_server_applications_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_server_nickname_votes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    CONSTRAINT "app_server_nickname_votes_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_server_online_samples" (
    "server_id" INTEGER NOT NULL,
    "online" INTEGER NOT NULL DEFAULT 0,
    "players" INTEGER NOT NULL DEFAULT 0,
    "max" INTEGER NOT NULL DEFAULT 0,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "recorded_at" TEXT NOT NULL,

    PRIMARY KEY ("server_id", "recorded_at"),
    CONSTRAINT "app_server_online_samples_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_server_reviews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "fingerprint" TEXT NOT NULL,
    "author_name" TEXT,
    "text" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "app_server_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "app_server_reviews_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_server_verifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "owner_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "verified_at" TEXT,
    CONSTRAINT "app_server_verifications_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "app_server_verifications_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_server_views" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "fingerprint" TEXT NOT NULL,
    "ip_address" TEXT,
    "country_code" TEXT,
    "created_at" TEXT NOT NULL,
    CONSTRAINT "app_server_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "app_server_views_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_server_votes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "fingerprint" TEXT NOT NULL,
    "author_name" TEXT,
    "value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "app_server_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "app_server_votes_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_servers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addr" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'minecraft',
    "mode" TEXT NOT NULL,
    "ver" TEXT NOT NULL,
    "core" TEXT NOT NULL DEFAULT 'java',
    "country" TEXT,
    "motd" TEXT,
    "short_desc" TEXT DEFAULT '',
    "full_desc" TEXT DEFAULT '',
    "desc" TEXT DEFAULT '',
    "website" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "donate" TEXT,
    "tiktok" TEXT,
    "launcher_url" TEXT,
    "avatar_url" TEXT,
    "banner_url" TEXT,
    "gallery_json" TEXT NOT NULL DEFAULT '[]',
    "videos_json" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "online" INTEGER NOT NULL DEFAULT 0,
    "players" INTEGER NOT NULL DEFAULT 0,
    "max" INTEGER NOT NULL DEFAULT 0,
    "uptime" TEXT NOT NULL DEFAULT 'new',
    "verified" INTEGER NOT NULL DEFAULT 0,
    "cluster" INTEGER,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "project_id" INTEGER,
    "discord_guild_id" TEXT,
    "discord_bot_verified" INTEGER NOT NULL DEFAULT 0,
    "discord_verify_code" TEXT,
    CONSTRAINT "app_servers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "app_projects" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "app_servers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "app_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "profile_slug" TEXT,
    "bio" TEXT DEFAULT '',
    "location" TEXT DEFAULT '',
    "website" TEXT,
    "telegram" TEXT,
    "discord" TEXT,
    "avatar_url" TEXT,
    "banner_url" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "discord_user_id" TEXT
);

-- CreateTable
CREATE TABLE "email_verification_codes" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "code_hash" TEXT NOT NULL,
    "expires_at" TEXT NOT NULL,
    "sent_at" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "user_login_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TEXT NOT NULL,
    "revoked_at" TEXT,
    CONSTRAINT "user_login_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_app_api_tokens_2" ON "app_api_tokens"("token_hash");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_api_tokens_token_hash" ON "app_api_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_api_tokens_user_id" ON "app_api_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_news_posts_author" ON "app_news_posts"("author_user_id");

-- CreateIndex
CREATE INDEX "idx_news_posts_created_at" ON "app_news_posts"("created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "app_notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "app_notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_projects_owner" ON "app_projects"("owner_id");

-- CreateIndex
CREATE INDEX "idx_server_apps_status" ON "app_server_applications"("status");

-- CreateIndex
CREATE INDEX "idx_server_apps_owner_id" ON "app_server_applications"("owner_id");

-- CreateIndex
CREATE INDEX "idx_server_nickname_votes_created_at" ON "app_server_nickname_votes"("created_at");

-- CreateIndex
CREATE INDEX "idx_server_nickname_votes_ip" ON "app_server_nickname_votes"("ip_address");

-- CreateIndex
CREATE INDEX "idx_server_nickname_votes_nickname" ON "app_server_nickname_votes"("nickname");

-- CreateIndex
CREATE INDEX "idx_server_nickname_votes_server_id" ON "app_server_nickname_votes"("server_id");

-- CreateIndex
CREATE INDEX "idx_server_online_samples_recorded_at" ON "app_server_online_samples"("recorded_at");

-- CreateIndex
CREATE INDEX "idx_server_online_samples_server_id" ON "app_server_online_samples"("server_id");

-- CreateIndex
CREATE INDEX "idx_server_reviews_fingerprint" ON "app_server_reviews"("fingerprint");

-- CreateIndex
CREATE INDEX "idx_server_reviews_user_id" ON "app_server_reviews"("user_id");

-- CreateIndex
CREATE INDEX "idx_server_reviews_server_id" ON "app_server_reviews"("server_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_server_reviews_unique_fingerprint" ON "app_server_reviews"("server_id", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "idx_server_reviews_unique_user" ON "app_server_reviews"("server_id", "user_id") WHERE ON app_server_reviews(server_id, user_id) WHERE user_id IS NOT NULL;

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_app_server_verifications_1" ON "app_server_verifications"("server_id");
Pragma writable_schema=0;

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_app_server_verifications_2" ON "app_server_verifications"("token");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_server_verifications_owner_id" ON "app_server_verifications"("owner_id");

-- CreateIndex
CREATE INDEX "idx_server_verifications_server_id" ON "app_server_verifications"("server_id");

-- CreateIndex
CREATE INDEX "idx_server_views_fingerprint" ON "app_server_views"("fingerprint");

-- CreateIndex
CREATE INDEX "idx_server_views_created_at" ON "app_server_views"("created_at");

-- CreateIndex
CREATE INDEX "idx_server_views_server_id" ON "app_server_views"("server_id");

-- CreateIndex
CREATE INDEX "idx_server_votes_fingerprint" ON "app_server_votes"("fingerprint");

-- CreateIndex
CREATE INDEX "idx_server_votes_user_id" ON "app_server_votes"("user_id");

-- CreateIndex
CREATE INDEX "idx_server_votes_server_id" ON "app_server_votes"("server_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_server_votes_unique_fingerprint" ON "app_server_votes"("server_id", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "idx_server_votes_unique_user" ON "app_server_votes"("server_id", "user_id") WHERE ON app_server_votes(server_id, user_id) WHERE user_id IS NOT NULL;

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_app_servers_1" ON "app_servers"("addr");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_app_servers_owner_id" ON "app_servers"("owner_id");

-- CreateIndex
CREATE INDEX "idx_app_servers_addr" ON "app_servers"("addr");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_app_users_2" ON "app_users"("email");
Pragma writable_schema=0;

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_app_users_3" ON "app_users"("profile_slug");
Pragma writable_schema=0;

-- CreateIndex
CREATE UNIQUE INDEX "idx_app_users_discord_user_id" ON "app_users"("discord_user_id") WHERE discord_user_id IS NOT NULL;

-- CreateIndex
CREATE INDEX "idx_app_users_email" ON "app_users"("email");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_user_login_sessions_2" ON "user_login_sessions"("token_hash");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_sessions_token_hash" ON "user_login_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "user_login_sessions"("user_id");
