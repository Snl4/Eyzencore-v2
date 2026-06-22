ALTER TABLE "app_users" ADD COLUMN "telegram_user_id" TEXT;
ALTER TABLE "app_users" ADD COLUMN "telegram_username" TEXT;
ALTER TABLE "app_users" ADD COLUMN "theme" TEXT DEFAULT 'dark';

CREATE UNIQUE INDEX "idx_app_users_telegram_user_id"
  ON "app_users"("telegram_user_id")
  WHERE "telegram_user_id" IS NOT NULL;
