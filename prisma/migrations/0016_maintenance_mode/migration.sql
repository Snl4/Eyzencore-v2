CREATE TABLE "app_site_settings" (
  "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  "maintenance_enabled" INTEGER NOT NULL DEFAULT 0,
  "maintenance_title" TEXT NOT NULL DEFAULT 'Технічні роботи',
  "maintenance_message" TEXT NOT NULL DEFAULT 'Ми оновлюємо Eyzencore. Сайт незабаром повернеться.',
  "updated_at" TEXT NOT NULL
);

INSERT INTO "app_site_settings" (
  "id",
  "maintenance_enabled",
  "maintenance_title",
  "maintenance_message",
  "updated_at"
) VALUES (
  1,
  0,
  'Технічні роботи',
  'Ми оновлюємо Eyzencore. Сайт незабаром повернеться.',
  CURRENT_TIMESTAMP
);
