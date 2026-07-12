import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260712213000_circle_card_paid_through_lifecycle/migration.sql"
);
const migration = readFileSync(migrationPath, "utf8");
const executableSql = migration.replace(/^\s*--.*$/gm, "");

describe("Circle Card paid-through migration", () => {
  it("is additive and leaves historical rows valid without fabricated lifecycle evidence", () => {
    expect(executableSql).not.toMatch(/\b(?:DROP|DELETE|TRUNCATE|UPDATE)\b/i);
    expect(executableSql).not.toMatch(/\bSET\s+NOT\s+NULL\b/i);
    expect(executableSql).not.toMatch(/ADD COLUMN[^,;]+\bDEFAULT\b/i);

    for (const field of [
      "accessEndsAt",
      "lastPaidPeriodStart",
      "lastPaidPeriodEnd",
      "paymentFailedAt",
      "recoveryGraceEndsAt",
      "paymentFailureInvoiceId",
      "paymentFailurePeriodStart",
      "paymentFailurePeriodEnd",
      "latestCheckoutSessionId",
      "checkoutSessionExpiresAt",
      "reconciliationRequiredAt",
      "studioDraftMetadata",
      "studioPreviousActiveMetadata"
    ]) {
      expect(executableSql).toContain(`ADD COLUMN "${field}"`);
    }
  });

  it("adds nullable uniqueness only for durable invoice and Checkout evidence", () => {
    expect(executableSql).toContain(
      'CREATE UNIQUE INDEX "CircleCardSubscription_lastPaidInvoiceId_key"'
    );
    expect(executableSql).toContain(
      'CREATE UNIQUE INDEX "CircleCardSubscription_latestCheckoutSessionId_key"'
    );
    expect(executableSql).not.toContain('ADD COLUMN "lastPaidInvoiceId" TEXT NOT NULL');
    expect(executableSql).not.toContain('ADD COLUMN "latestCheckoutSessionId" TEXT NOT NULL');
  });
});
