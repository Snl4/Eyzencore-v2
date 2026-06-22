CREATE TABLE "app_server_referrals" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "server_id" INTEGER NOT NULL,
  "owner_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'custom',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "disabled_at" TEXT,
  CONSTRAINT "app_server_referrals_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_server_referrals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "idx_server_referrals_server_code"
  ON "app_server_referrals"("server_id", "code");

CREATE INDEX "idx_server_referrals_server_id"
  ON "app_server_referrals"("server_id");

CREATE INDEX "idx_server_referrals_owner_id"
  ON "app_server_referrals"("owner_id");

ALTER TABLE "app_server_views" ADD COLUMN "referral_code" TEXT;

CREATE INDEX "idx_server_views_referral_code"
  ON "app_server_views"("server_id", "referral_code");
