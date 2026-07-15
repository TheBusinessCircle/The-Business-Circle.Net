import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "prisma/migrations/20260713010000_circle_card_customer_ownership/migration.sql"
  ),
  "utf8"
);
const executableSql = migration.replace(/^\s*--.*$/gm, "");

describe("Circle Card Stripe customer ownership migration", () => {
  it("replaces the non-unique index with one exact unique ownership constraint", () => {
    expect(executableSql).toMatch(
      /DROP INDEX "CircleCardSubscription_stripeCustomerId_idx"[\s\S]*CREATE UNIQUE INDEX "CircleCardSubscription_stripeCustomerId_key"[\s\S]*ON "CircleCardSubscription"\("stripeCustomerId"\)/
    );
  });

  it("fails transactionally without rewriting conflicting production records", () => {
    expect(executableSql).toMatch(/^\s*BEGIN;/);
    expect(executableSql).toMatch(/COMMIT;\s*$/);
    expect(executableSql).not.toMatch(/\b(?:DELETE|INSERT|UPDATE)\b/i);
    expect(executableSql).not.toMatch(/ON\s+CONFLICT|DISTINCT\s+ON/i);
  });
});
