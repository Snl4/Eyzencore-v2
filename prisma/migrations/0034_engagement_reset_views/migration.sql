ALTER TABLE "app_engagement_reset_batches" ADD COLUMN "views_archived" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "app_engagement_reset_server_snapshots" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "app_server_views_archive" (
    "archive_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_id" INTEGER NOT NULL,
    "original_id" INTEGER,
    "server_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "fingerprint" TEXT NOT NULL,
    "ip_address" TEXT,
    "country_code" TEXT,
    "referrer" TEXT,
    "traffic_source" TEXT,
    "referral_code" TEXT,
    "created_at" TEXT NOT NULL,
    "archived_at" TEXT NOT NULL,
    CONSTRAINT "app_server_views_archive_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "app_engagement_reset_batches" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_server_views_archive_batch_id" ON "app_server_views_archive"("batch_id");
