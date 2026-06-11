ALTER TABLE "forum_threads" ADD COLUMN "attachments_json" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "forum_posts" ADD COLUMN "attachments_json" TEXT NOT NULL DEFAULT '[]';
