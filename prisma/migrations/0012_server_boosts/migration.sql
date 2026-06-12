ALTER TABLE "app_servers" ADD COLUMN "boosted" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "idx_app_servers_boosted" ON "app_servers"("boosted");
