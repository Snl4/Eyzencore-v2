CREATE TABLE "cms_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TEXT NOT NULL,
  "expires_at" TEXT NOT NULL,
  "revoked_at" TEXT,
  CONSTRAINT "cms_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_users" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "cms_sessions_token_hash_key" ON "cms_sessions"("token_hash");
CREATE INDEX "idx_cms_sessions_token_hash" ON "cms_sessions"("token_hash");
CREATE INDEX "idx_cms_sessions_user_id" ON "cms_sessions"("user_id");
