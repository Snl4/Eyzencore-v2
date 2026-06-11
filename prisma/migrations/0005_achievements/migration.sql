CREATE TABLE "app_achievements" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "emblem" TEXT NOT NULL DEFAULT '★',
  "trigger_type" TEXT NOT NULL DEFAULT 'manual',
  "trigger_value" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL
);

CREATE UNIQUE INDEX "idx_app_achievements_slug" ON "app_achievements"("slug");
CREATE INDEX "idx_achievements_active_sort" ON "app_achievements"("is_active", "sort_order");

CREATE TABLE "app_user_achievements" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "achievement_id" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "granted_by" TEXT NOT NULL DEFAULT 'auto',
  "earned_at" TEXT NOT NULL,
  CONSTRAINT "app_user_achievements_achievement_id_fkey"
    FOREIGN KEY ("achievement_id") REFERENCES "app_achievements" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_user_achievements_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_users" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "idx_user_achievements_unique" ON "app_user_achievements"("achievement_id", "user_id");
CREATE INDEX "idx_user_achievements_user" ON "app_user_achievements"("user_id");
