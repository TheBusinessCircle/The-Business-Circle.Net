-- A dedicated Circle Card Stripe customer belongs to exactly one application
-- user. Fail the migration rather than normalising or deleting any conflicting
-- production relationship: duplicates require an operator-led reconciliation.
BEGIN;

DROP INDEX "CircleCardSubscription_stripeCustomerId_idx";

CREATE UNIQUE INDEX "CircleCardSubscription_stripeCustomerId_key"
    ON "CircleCardSubscription"("stripeCustomerId");

COMMIT;
