CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "expires_at" TEXT NOT NULL,
  "used_at" TEXT,
  CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_users" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "sqlite_autoindex_password_reset_tokens_2"
  ON "password_reset_tokens"("token_hash");

CREATE INDEX "idx_password_reset_tokens_token_hash"
  ON "password_reset_tokens"("token_hash");

CREATE INDEX "idx_password_reset_tokens_user_id"
  ON "password_reset_tokens"("user_id");

CREATE INDEX "idx_password_reset_tokens_expires_at"
  ON "password_reset_tokens"("expires_at");
