UPDATE "app_users"
SET "profile_slug" = NULL
WHERE "id" = '__eyzencore_support__';

INSERT OR IGNORE INTO "app_users" (
  "id",
  "email",
  "password_hash",
  "full_name",
  "profile_slug",
  "bio",
  "location",
  "role",
  "created_at",
  "updated_at",
  "is_legacy",
  "theme"
)
SELECT
  '__eyzencore_support__',
  'animilair-support@eyzencore.internal',
  'eyzencore-animilair-support-no-login',
  'EyzenCore Support',
  NULL,
  '',
  '',
  'ADMIN',
  datetime('now'),
  datetime('now'),
  0,
  'dark'
WHERE NOT EXISTS (
  SELECT 1 FROM "app_users" WHERE "id" = '__eyzencore_support__'
);
