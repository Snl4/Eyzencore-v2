UPDATE "forum_categories"
SET
  "name" = REPLACE("name", 'Інстурменти', 'Інструменти'),
  "description" = REPLACE("description", 'Інстурменти', 'Інструменти')
WHERE "name" LIKE '%Інстурменти%'
   OR "description" LIKE '%Інстурменти%';

UPDATE "forum_categories"
SET
  "name" = REPLACE("name", 'інстурменти', 'інструменти'),
  "description" = REPLACE("description", 'інстурменти', 'інструменти')
WHERE "name" LIKE '%інстурменти%'
   OR "description" LIKE '%інстурменти%';

UPDATE "forum_threads"
SET "title" = REPLACE("title", 'Інстурменти', 'Інструменти')
WHERE "title" LIKE '%Інстурменти%';

UPDATE "forum_threads"
SET "title" = REPLACE("title", 'інстурменти', 'інструменти')
WHERE "title" LIKE '%інстурменти%';

UPDATE "forum_posts"
SET "content" = REPLACE("content", 'Інстурменти', 'Інструменти')
WHERE "content" LIKE '%Інстурменти%';

UPDATE "forum_posts"
SET "content" = REPLACE("content", 'інстурменти', 'інструменти')
WHERE "content" LIKE '%інстурменти%';

UPDATE "app_animilair_products"
SET
  "title" = REPLACE("title", 'Інстурменти', 'Інструменти'),
  "short_desc" = REPLACE("short_desc", 'Інстурменти', 'Інструменти'),
  "description" = REPLACE("description", 'Інстурменти', 'Інструменти')
WHERE "title" LIKE '%Інстурменти%'
   OR "short_desc" LIKE '%Інстурменти%'
   OR "description" LIKE '%Інстурменти%';

UPDATE "app_animilair_products"
SET
  "title" = REPLACE("title", 'інстурменти', 'інструменти'),
  "short_desc" = REPLACE("short_desc", 'інстурменти', 'інструменти'),
  "description" = REPLACE("description", 'інстурменти', 'інструменти')
WHERE "title" LIKE '%інстурменти%'
   OR "short_desc" LIKE '%інстурменти%'
   OR "description" LIKE '%інстурменти%';

UPDATE "app_animilair_orders"
SET "title" = REPLACE("title", 'Інстурменти', 'Інструменти')
WHERE "title" LIKE '%Інстурменти%';

UPDATE "app_animilair_orders"
SET "title" = REPLACE("title", 'інстурменти', 'інструменти')
WHERE "title" LIKE '%інстурменти%';
