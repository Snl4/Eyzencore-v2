CREATE TABLE "app_notification_preferences" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "votes_enabled" INTEGER NOT NULL DEFAULT 1,
    "reviews_enabled" INTEGER NOT NULL DEFAULT 1,
    "system_enabled" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "app_notification_preferences_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "app_users" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
);
