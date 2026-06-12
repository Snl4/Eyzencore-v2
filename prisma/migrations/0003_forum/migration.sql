CREATE TABLE "forum_categories" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "icon" TEXT NOT NULL DEFAULT 'comments',
  "color" TEXT NOT NULL DEFAULT '#7b8cff',
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL
);

CREATE UNIQUE INDEX "forum_categories_slug_key" ON "forum_categories"("slug");
CREATE INDEX "idx_forum_categories_position" ON "forum_categories"("position");

CREATE TABLE "forum_threads" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "category_id" INTEGER NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "is_pinned" INTEGER NOT NULL DEFAULT 0,
  "is_locked" INTEGER NOT NULL DEFAULT 0,
  "is_solved" INTEGER NOT NULL DEFAULT 0,
  "views" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "last_activity_at" TEXT NOT NULL,
  CONSTRAINT "forum_threads_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "forum_categories" ("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "forum_threads_author_user_id_fkey"
    FOREIGN KEY ("author_user_id") REFERENCES "app_users" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_forum_threads_author" ON "forum_threads"("author_user_id");
CREATE INDEX "idx_forum_threads_category" ON "forum_threads"("category_id");
CREATE INDEX "idx_forum_threads_activity" ON "forum_threads"("last_activity_at");

CREATE TABLE "forum_posts" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "thread_id" INTEGER NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "forum_posts_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "forum_threads" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "forum_posts_author_user_id_fkey"
    FOREIGN KEY ("author_user_id") REFERENCES "app_users" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_forum_posts_author" ON "forum_posts"("author_user_id");
CREATE INDEX "idx_forum_posts_thread" ON "forum_posts"("thread_id", "created_at");

CREATE TABLE "forum_thread_likes" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "thread_id" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "forum_thread_likes_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "forum_threads" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "forum_thread_likes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_users" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "idx_forum_thread_likes_unique" ON "forum_thread_likes"("thread_id", "user_id");
CREATE INDEX "idx_forum_thread_likes_thread" ON "forum_thread_likes"("thread_id");

CREATE TABLE "forum_post_likes" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "post_id" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "forum_post_likes_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "forum_posts" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "forum_post_likes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_users" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "idx_forum_post_likes_unique" ON "forum_post_likes"("post_id", "user_id");
CREATE INDEX "idx_forum_post_likes_post" ON "forum_post_likes"("post_id");

INSERT INTO "forum_categories" ("slug", "name", "description", "icon", "color", "position", "created_at") VALUES
  ('guides', 'Гайди та туторіали', 'Корисні інструкції для гравців і власників серверів.', 'book-open', '#7b8cff', 10, datetime('now')),
  ('questions', 'Питання гравців', 'Допомога, поради та відповіді від спільноти.', 'circle-question', '#a78bfa', 20, datetime('now')),
  ('announcements', 'Ресурси', 'Корисні матеріали, збірки, плагіни, моди та інструменти для спільноти.', 'bullhorn', '#5eead4', 30, datetime('now')),
  ('support', 'Технічна підтримка', 'Проблеми із серверами, клієнтом або платформою.', 'screwdriver-wrench', '#fbbf24', 40, datetime('now'));
