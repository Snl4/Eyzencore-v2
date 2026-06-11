CREATE TABLE "app_server_likes" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "server_id" INTEGER NOT NULL,
  "user_id" TEXT,
  "fingerprint" TEXT NOT NULL,
  "author_name" TEXT,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "app_server_likes_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_server_likes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_users" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "idx_server_likes_unique_fingerprint" ON "app_server_likes"("server_id", "fingerprint");
CREATE UNIQUE INDEX "idx_server_likes_unique_user" ON "app_server_likes"("server_id", "user_id") WHERE user_id IS NOT NULL;
CREATE INDEX "idx_server_likes_server_id" ON "app_server_likes"("server_id");
CREATE INDEX "idx_server_likes_user_id" ON "app_server_likes"("user_id");
