CREATE TABLE IF NOT EXISTS "app_news_comments" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "news_id" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "app_news_comments_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "app_news_posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_news_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_comments_unique_user" ON "app_news_comments"("news_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_news_comments_news" ON "app_news_comments"("news_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_news_comments_user" ON "app_news_comments"("user_id");

CREATE TABLE IF NOT EXISTS "app_news_likes" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "news_id" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "app_news_likes_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "app_news_posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_news_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_likes_unique_user" ON "app_news_likes"("news_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_news_likes_news" ON "app_news_likes"("news_id");
CREATE INDEX IF NOT EXISTS "idx_news_likes_user" ON "app_news_likes"("user_id");

CREATE TABLE IF NOT EXISTS "app_news_views" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "news_id" INTEGER NOT NULL,
  "user_id" TEXT,
  "fingerprint" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "app_news_views_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "app_news_posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_news_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_views_unique_fingerprint" ON "app_news_views"("news_id", "fingerprint");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_views_unique_user" ON "app_news_views"("news_id", "user_id") WHERE "user_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_news_views_news" ON "app_news_views"("news_id");
CREATE INDEX IF NOT EXISTS "idx_news_views_created" ON "app_news_views"("created_at");
