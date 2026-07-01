CREATE TABLE "app_engagement_reset_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "performed_by_user_id" TEXT,
    "performed_by_email" TEXT,
    "performed_at" TEXT NOT NULL,
    "servers_count" INTEGER NOT NULL DEFAULT 0,
    "nickname_votes_archived" INTEGER NOT NULL DEFAULT 0,
    "account_votes_archived" INTEGER NOT NULL DEFAULT 0,
    "likes_archived" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "app_engagement_reset_server_snapshots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_id" INTEGER NOT NULL,
    "server_id" INTEGER NOT NULL,
    "server_name" TEXT NOT NULL,
    "nickname_votes" INTEGER NOT NULL DEFAULT 0,
    "account_votes" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "app_engagement_reset_server_snapshots_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "app_engagement_reset_batches" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "app_engagement_reset_server_snapshots_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "app_server_nickname_votes_archive" (
    "archive_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_id" INTEGER NOT NULL,
    "original_id" INTEGER,
    "server_id" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "archived_at" TEXT NOT NULL,
    CONSTRAINT "app_server_nickname_votes_archive_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "app_engagement_reset_batches" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "app_server_votes_archive" (
    "archive_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_id" INTEGER NOT NULL,
    "original_id" INTEGER,
    "server_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "fingerprint" TEXT NOT NULL,
    "author_name" TEXT,
    "value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "archived_at" TEXT NOT NULL,
    CONSTRAINT "app_server_votes_archive_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "app_engagement_reset_batches" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "app_server_likes_archive" (
    "archive_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_id" INTEGER NOT NULL,
    "original_id" INTEGER,
    "server_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "fingerprint" TEXT NOT NULL,
    "author_name" TEXT,
    "created_at" TEXT NOT NULL,
    "archived_at" TEXT NOT NULL,
    CONSTRAINT "app_server_likes_archive_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "app_engagement_reset_batches" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_engagement_reset_batches_performed_at" ON "app_engagement_reset_batches"("performed_at");
CREATE INDEX "idx_engagement_reset_snapshots_batch_id" ON "app_engagement_reset_server_snapshots"("batch_id");
CREATE INDEX "idx_engagement_reset_snapshots_server_id" ON "app_engagement_reset_server_snapshots"("server_id");
CREATE INDEX "idx_nickname_votes_archive_batch_id" ON "app_server_nickname_votes_archive"("batch_id");
CREATE INDEX "idx_server_votes_archive_batch_id" ON "app_server_votes_archive"("batch_id");
CREATE INDEX "idx_server_likes_archive_batch_id" ON "app_server_likes_archive"("batch_id");
