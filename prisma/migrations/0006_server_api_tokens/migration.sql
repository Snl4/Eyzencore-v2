ALTER TABLE "app_api_tokens" ADD COLUMN "server_id" INTEGER
  REFERENCES "app_servers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX "idx_api_tokens_server_id" ON "app_api_tokens"("server_id");
