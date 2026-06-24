CREATE TABLE IF NOT EXISTS "app_animilair_authors" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT '',
  "bio" TEXT NOT NULL DEFAULT '',
  "avatar_url" TEXT,
  "banner_url" TEXT,
  "socials_json" TEXT NOT NULL DEFAULT '{}',
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_animilair_authors_slug_key" ON "app_animilair_authors"("slug");
CREATE INDEX IF NOT EXISTS "idx_animilair_authors_position" ON "app_animilair_authors"("position");

CREATE TABLE IF NOT EXISTS "app_animilair_products" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "author_id" INTEGER NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'design',
  "short_desc" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "price_from" INTEGER,
  "delivery_days" INTEGER,
  "cover_url" TEXT,
  "tags_json" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'published',
  "featured" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_animilair_products_slug_key" ON "app_animilair_products"("slug");
CREATE INDEX IF NOT EXISTS "idx_animilair_products_author" ON "app_animilair_products"("author_id");
CREATE INDEX IF NOT EXISTS "idx_animilair_products_public" ON "app_animilair_products"("status", "featured");

CREATE TABLE IF NOT EXISTS "app_animilair_product_media" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "product_id" INTEGER NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'image',
  "url" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_animilair_media_product" ON "app_animilair_product_media"("product_id", "position");

CREATE TABLE IF NOT EXISTS "app_animilair_orders" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "product_id" INTEGER NOT NULL,
  "customer_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "title" TEXT NOT NULL,
  "brief" TEXT NOT NULL,
  "budget" TEXT NOT NULL DEFAULT '',
  "deadline" TEXT,
  "contact" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "app_animilair_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_animilair_orders_customer" ON "app_animilair_orders"("customer_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_animilair_orders_product" ON "app_animilair_orders"("product_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_animilair_orders_status" ON "app_animilair_orders"("status");

CREATE TABLE IF NOT EXISTS "app_animilair_order_messages" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "order_id" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "app_animilair_messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "app_animilair_orders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_animilair_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_animilair_messages_order" ON "app_animilair_order_messages"("order_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_animilair_messages_user" ON "app_animilair_order_messages"("user_id");
