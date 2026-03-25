DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResourceTier') THEN
    CREATE TYPE "ResourceTier" AS ENUM ('FOUNDATION', 'INNER', 'CORE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResourceType') THEN
    CREATE TYPE "ResourceType" AS ENUM ('CLARITY', 'STRATEGY', 'OBSERVATION', 'MINDSET', 'ACTION');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regtype('"ResourceStatus"') IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'SCHEDULED'
      AND enumtypid = to_regtype('"ResourceStatus"')
  ) THEN
    ALTER TYPE "ResourceStatus" ADD VALUE 'SCHEDULED';
  END IF;
END $$;

ALTER TABLE "Resource"
ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "excerpt" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "tier" "ResourceTier" NOT NULL DEFAULT 'FOUNDATION',
ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Getting Started',
ADD COLUMN IF NOT EXISTS "type" "ResourceType" NOT NULL DEFAULT 'CLARITY',
ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);

UPDATE "Resource"
SET "excerpt" = "summary"
WHERE COALESCE("excerpt", '') = ''
  AND COALESCE("summary", '') <> '';

UPDATE "Resource"
SET "content" = "summary" ||
  E'\n\n## Reality\n\nState what is actually happening.\n\n## Breakdown\n\n### What people usually miss\n\nAdd the real pattern here.\n\n### Why it keeps happening\n\nExplain the cause.\n\n### What it costs\n\nExplain the cost.\n\n## Shift\n\nState what needs to change.\n\n## Next step\n\n1. Add the first action.\n2. Add the second action.\n3. Add the third action.'
WHERE COALESCE("content", '') = ''
  AND COALESCE("summary", '') <> '';

UPDATE "Resource"
SET "tier" = CASE
  WHEN "accessTier" = 'INNER_CIRCLE' THEN 'INNER'::"ResourceTier"
  WHEN "accessTier" = 'CORE' THEN 'CORE'::"ResourceTier"
  ELSE 'FOUNDATION'::"ResourceTier"
END;

UPDATE "Resource"
SET "category" = COALESCE(
  (
    SELECT "Category"."name"
    FROM "Category"
    WHERE "Category"."id" = "Resource"."categoryId"
  ),
  "category",
  'Getting Started'
);

CREATE INDEX IF NOT EXISTS "Resource_tier_idx" ON "Resource"("tier");
CREATE INDEX IF NOT EXISTS "Resource_status_idx" ON "Resource"("status");
CREATE INDEX IF NOT EXISTS "Resource_scheduledFor_idx" ON "Resource"("scheduledFor");
CREATE INDEX IF NOT EXISTS "Resource_status_tier_idx" ON "Resource"("status", "tier");
