CREATE TABLE IF NOT EXISTS "community_resources" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "author_user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL DEFAULT 'mod',
  "summary" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "icon_url" TEXT,
  "gallery_json" TEXT NOT NULL DEFAULT '[]',
  "source_url" TEXT NOT NULL,
  "download_url" TEXT,
  "source_host" TEXT,
  "project_id" TEXT,
  "author_name" TEXT,
  "license" TEXT,
  "loaders_json" TEXT NOT NULL DEFAULT '[]',
  "game_versions_json" TEXT NOT NULL DEFAULT '[]',
  "tags_json" TEXT NOT NULL DEFAULT '[]',
  "side" TEXT,
  "downloads" INTEGER NOT NULL DEFAULT 0,
  "followers" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'published',
  "featured" INTEGER NOT NULL DEFAULT 0,
  "verified" INTEGER NOT NULL DEFAULT 1,
  "published_at" TEXT,
  "updated_remote_at" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  FOREIGN KEY ("author_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_community_resources_status_created" ON "community_resources" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_community_resources_type" ON "community_resources" ("type");
CREATE INDEX IF NOT EXISTS "idx_community_resources_source" ON "community_resources" ("source_host", "project_id");
