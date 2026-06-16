-- Make Circle Card colour customisation optional so default cards can resolve
-- the premium palette without storing colour values as fake customisation.
ALTER TABLE "CircleCard"
  ALTER COLUMN "themePrimaryColor" DROP DEFAULT,
  ALTER COLUMN "themePrimaryColor" DROP NOT NULL,
  ALTER COLUMN "themeAccentColor" DROP DEFAULT,
  ALTER COLUMN "themeAccentColor" DROP NOT NULL,
  ALTER COLUMN "themeButtonColor" DROP DEFAULT,
  ALTER COLUMN "themeButtonColor" DROP NOT NULL,
  ALTER COLUMN "themePreset" DROP DEFAULT;

UPDATE "CircleCard"
SET
  "themePrimaryColor" = CASE
    WHEN "themePrimaryColor" = '#D4AF5F' THEN NULL
    ELSE "themePrimaryColor"
  END,
  "themeAccentColor" = CASE
    WHEN "themeAccentColor" = '#F0CF88' THEN NULL
    ELSE "themeAccentColor"
  END,
  "themeButtonColor" = CASE
    WHEN "themeButtonColor" = '#D4AF5F' THEN NULL
    ELSE "themeButtonColor"
  END,
  "themePreset" = CASE
    WHEN "themePreset" = 'black-gold' THEN NULL
    ELSE "themePreset"
  END
WHERE
  "themePrimaryColor" = '#D4AF5F'
  OR "themeAccentColor" = '#F0CF88'
  OR "themeButtonColor" = '#D4AF5F'
  OR "themePreset" = 'black-gold';
