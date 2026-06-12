ALTER TABLE "app_server_views" ADD COLUMN "referrer" TEXT;
ALTER TABLE "app_server_views" ADD COLUMN "traffic_source" TEXT;

CREATE INDEX "idx_server_views_traffic_source"
  ON "app_server_views"("traffic_source");
