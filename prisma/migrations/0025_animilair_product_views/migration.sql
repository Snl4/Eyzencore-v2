CREATE TABLE IF NOT EXISTS "app_animilair_product_views" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "product_id" INTEGER NOT NULL,
  "user_id" TEXT,
  "fingerprint" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_animilair_product_views_unique" ON "app_animilair_product_views"("product_id", "fingerprint");
CREATE INDEX IF NOT EXISTS "idx_animilair_product_views_product" ON "app_animilair_product_views"("product_id");
CREATE INDEX IF NOT EXISTS "idx_animilair_product_views_created" ON "app_animilair_product_views"("created_at");
