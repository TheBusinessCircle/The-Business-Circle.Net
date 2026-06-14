-- Circle Card Identity Engine foundation: visual theme values and future discovery metadata.
ALTER TABLE "CircleCard"
  ADD COLUMN "themePrimaryColor" TEXT NOT NULL DEFAULT '#D4AF5F',
  ADD COLUMN "themeAccentColor" TEXT NOT NULL DEFAULT '#F0CF88',
  ADD COLUMN "themeButtonColor" TEXT NOT NULL DEFAULT '#D4AF5F',
  ADD COLUMN "themeSurfaceStyle" TEXT NOT NULL DEFAULT 'PREMIUM',
  ADD COLUMN "themePreset" TEXT DEFAULT 'black-gold',
  ADD COLUMN "themeMetadata" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "CircleCard_themeSurfaceStyle_idx" ON "CircleCard"("themeSurfaceStyle");
CREATE INDEX "CircleCard_themePreset_idx" ON "CircleCard"("themePreset");
