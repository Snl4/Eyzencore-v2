CREATE TABLE "app_server_callbacks" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "server_id" INTEGER NOT NULL,
  "callback_url" TEXT NOT NULL DEFAULT '',
  "auth_header" TEXT NOT NULL DEFAULT 'Authorization',
  "auth_token" TEXT NOT NULL DEFAULT '',
  "events_json" TEXT NOT NULL DEFAULT '["vote","comment","like"]',
  "is_active" INTEGER NOT NULL DEFAULT 0,
  "nuvotifier_enabled" INTEGER NOT NULL DEFAULT 0,
  "nuvotifier_host" TEXT NOT NULL DEFAULT '',
  "nuvotifier_port" INTEGER NOT NULL DEFAULT 8192,
  "nuvotifier_token" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "app_server_callbacks_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "app_server_callbacks_server_id_key" ON "app_server_callbacks"("server_id");
CREATE INDEX "idx_server_callbacks_server_id" ON "app_server_callbacks"("server_id");

CREATE TABLE "app_callback_events" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "server_id" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "payload_json" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "app_callback_events_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_callback_events_server" ON "app_callback_events"("server_id", "created_at");

CREATE TABLE "app_callback_deliveries" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "event_id" INTEGER NOT NULL,
  "callback_id" INTEGER NOT NULL,
  "server_id" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "payload_json" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "status_code" INTEGER,
  "response_excerpt" TEXT,
  "error_message" TEXT,
  "created_at" TEXT NOT NULL,
  "delivered_at" TEXT,
  CONSTRAINT "app_callback_deliveries_callback_id_fkey"
    FOREIGN KEY ("callback_id") REFERENCES "app_server_callbacks" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_callback_deliveries_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "app_callback_events" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_callback_deliveries_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "app_servers" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_callback_deliveries_callback" ON "app_callback_deliveries"("callback_id", "created_at");
CREATE INDEX "idx_callback_deliveries_event" ON "app_callback_deliveries"("event_id");
CREATE INDEX "idx_callback_deliveries_server" ON "app_callback_deliveries"("server_id", "created_at");
