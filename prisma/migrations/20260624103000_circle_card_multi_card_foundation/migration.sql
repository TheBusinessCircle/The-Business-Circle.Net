CREATE TYPE "CircleCardType" AS ENUM ('PERSONAL', 'BUSINESS', 'CREATOR');

ALTER TABLE "CircleCard"
  ADD COLUMN "cardType" "CircleCardType" NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isDefaultCard" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contentBlocks" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "archivedAt" TIMESTAMP(3);

WITH ordered_cards AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "isPrimary" DESC, "createdAt" ASC, id ASC
    )::integer - 1 AS display_order
  FROM "CircleCard"
)
UPDATE "CircleCard" AS card
SET "displayOrder" = ordered_cards.display_order
FROM ordered_cards
WHERE card.id = ordered_cards.id;

UPDATE "CircleCard"
SET "isDefaultCard" = "isPrimary"
WHERE "isPrimary" = true;

WITH missing_default_users AS (
  SELECT "userId"
  FROM "CircleCard"
  GROUP BY "userId"
  HAVING BOOL_OR("isDefaultCard") = false
),
first_cards AS (
  SELECT DISTINCT ON (card."userId")
    card.id
  FROM "CircleCard" card
  INNER JOIN missing_default_users missing
    ON missing."userId" = card."userId"
  ORDER BY card."userId", card."displayOrder" ASC, card."createdAt" ASC, card.id ASC
)
UPDATE "CircleCard"
SET "isDefaultCard" = true,
    "isPrimary" = true
WHERE id IN (SELECT id FROM first_cards);

CREATE INDEX "CircleCard_userId_archivedAt_idx" ON "CircleCard"("userId", "archivedAt");
CREATE INDEX "CircleCard_cardType_idx" ON "CircleCard"("cardType");
CREATE INDEX "CircleCard_displayOrder_idx" ON "CircleCard"("displayOrder");
CREATE INDEX "CircleCard_isDefaultCard_idx" ON "CircleCard"("isDefaultCard");
