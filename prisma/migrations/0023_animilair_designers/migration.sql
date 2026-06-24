ALTER TABLE "app_animilair_authors" ADD COLUMN "user_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "app_animilair_authors_user_id_key"
ON "app_animilair_authors"("user_id")
WHERE "user_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_animilair_authors_user"
ON "app_animilair_authors"("user_id");
