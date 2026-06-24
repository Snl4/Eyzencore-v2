CREATE TABLE IF NOT EXISTS "app_animilair_product_reviews" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "product_id" INTEGER NOT NULL,
  "order_id" INTEGER NOT NULL,
  "customer_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "app_animilair_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "app_animilair_orders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_animilair_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_animilair_reviews_order_id_key" ON "app_animilair_product_reviews"("order_id");
CREATE INDEX IF NOT EXISTS "idx_animilair_reviews_product" ON "app_animilair_product_reviews"("product_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_animilair_reviews_customer" ON "app_animilair_product_reviews"("customer_id");
