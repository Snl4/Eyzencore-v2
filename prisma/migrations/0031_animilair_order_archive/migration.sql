ALTER TABLE "app_animilair_orders" ADD COLUMN "customer_archived_at" TEXT;
ALTER TABLE "app_animilair_orders" ADD COLUMN "author_archived_at" TEXT;

CREATE INDEX IF NOT EXISTS "idx_animilair_orders_customer_archive" ON "app_animilair_orders"("customer_id", "customer_archived_at");
CREATE INDEX IF NOT EXISTS "idx_animilair_orders_author_archive" ON "app_animilair_orders"("author_archived_at");
