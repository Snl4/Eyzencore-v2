CREATE TABLE IF NOT EXISTS "app_server_events" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "server_id" INTEGER NOT NULL,
  "owner_id" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'update',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "starts_at" TEXT NOT NULL,
  "ends_at" TEXT,
  "location" TEXT,
  "prize" TEXT,
  "image_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'published',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "app_server_events_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_server_events_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "app_server_event_attendees" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "event_id" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "reminder_enabled" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "app_server_event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "app_server_events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_server_event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "app_server_event_comments" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "event_id" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "app_server_event_comments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "app_server_events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_server_event_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_server_events_server_id" ON "app_server_events"("server_id");
CREATE INDEX IF NOT EXISTS "idx_server_events_starts_at" ON "app_server_events"("starts_at");
CREATE INDEX IF NOT EXISTS "idx_server_events_status" ON "app_server_events"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_server_event_attendees_unique" ON "app_server_event_attendees"("event_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_server_event_attendees_user" ON "app_server_event_attendees"("user_id");
CREATE INDEX IF NOT EXISTS "idx_server_event_comments_event" ON "app_server_event_comments"("event_id", "created_at");
