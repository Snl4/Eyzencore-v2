CREATE TABLE "app_clusters" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "owner_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "logo_url" TEXT,
  "banner_url" TEXT,
  "website" TEXT,
  "discord" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "app_clusters_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "app_users" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "app_clusters_slug_key" ON "app_clusters"("slug");
CREATE INDEX "idx_clusters_owner" ON "app_clusters"("owner_id");

ALTER TABLE "app_servers" ADD COLUMN "cluster_id" INTEGER
  REFERENCES "app_clusters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_app_servers_cluster_id" ON "app_servers"("cluster_id");
