-- Refuse to hide an existing user-owned card behind the system hub route.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "CircleCard" WHERE "slug" = 'hucknall-circle-hub' AND id <> 'cmvzwzm3y000amkahigz25s8r') THEN
    RAISE EXCEPTION 'Hucknall hub slug is already in use. Resolve ownership before deploying this hub.';
  END IF;
END $$;

ALTER TABLE "CircleCard"
  ADD COLUMN "businessPostcode" VARCHAR(10),
  ADD COLUMN "businessCategory" VARCHAR(40);

CREATE INDEX "CircleCard_local_hub_visibility_idx"
  ON "CircleCard"("businessPostcode", "cardType", "showInDiscover", "isPublished");

-- No existing business is enrolled and no existing location is copied or inferred.
