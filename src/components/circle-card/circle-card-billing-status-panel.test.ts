import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCircleCardBillingStatusView } from "@/components/circle-card/circle-card-billing-status-panel";
import {
  buildCircleCardAccessSnapshot,
  resolveCircleCardEntitlement,
  type CircleCardAccessSnapshot
} from "@/lib/circle-card/permissions";

function accessSnapshot(
  input: Partial<CircleCardAccessSnapshot> = {}
): CircleCardAccessSnapshot {
  return {
    ...buildCircleCardAccessSnapshot({
      entitlement: resolveCircleCardEntitlement({ role: "MEMBER" })
    }),
    ...input
  };
}

describe("Circle Card customer billing status", () => {
  it("shows confirmed paid access and the paid-through date", () => {
    const accessEndsAt = new Date("2026-08-12T00:00:00.000Z");
    const view = buildCircleCardBillingStatusView(
      accessSnapshot({
        plan: "PRO",
        source: "standalone_subscription",
        hasProAccess: true,
        lifecycleStatus: "active",
        accessEndsAt,
        effectiveAccessEndsAt: accessEndsAt,
        subscriptionStatus: "ACTIVE",
        hasBillingRelationship: true
      })
    );

    expect(view.title).toBe("Circle Card Pro is active");
    expect(view.dateLabel).toBe("Paid access confirmed through");
    expect(view.date).toBe(accessEndsAt);
    expect(view.showUpgrade).toBe(false);
  });

  it("warns during grace and identifies its exact recovery deadline", () => {
    const recoveryGraceEndsAt = new Date("2026-07-19T14:30:00.000Z");
    const view = buildCircleCardBillingStatusView(
      accessSnapshot({
        plan: "PRO",
        source: "standalone_subscription",
        hasProAccess: true,
        lifecycleStatus: "past_due_grace",
        recoveryGraceEndsAt,
        isInRecoveryGrace: true,
        subscriptionStatus: "PAST_DUE",
        hasBillingRelationship: true
      })
    );

    expect(view.label).toBe("Payment needs attention");
    expect(view.dateLabel).toBe("Recovery access ends");
    expect(view.date).toBe(recoveryGraceEndsAt);
    expect(view.description).toContain("payment failed");
  });

  it("distinguishes cancellation paid-through from an expired downgrade", () => {
    const accessEndsAt = new Date("2026-08-01T00:00:00.000Z");
    const cancelling = buildCircleCardBillingStatusView(
      accessSnapshot({
        plan: "PRO",
        source: "standalone_subscription",
        hasProAccess: true,
        lifecycleStatus: "cancelling",
        accessEndsAt,
        effectiveAccessEndsAt: accessEndsAt,
        cancellationEffectiveAt: new Date("2026-09-01T00:00:00.000Z"),
        cancelAtPeriodEnd: true,
        subscriptionStatus: "ACTIVE"
      })
    );
    const expired = buildCircleCardBillingStatusView(
      accessSnapshot({
        lifecycleStatus: "expired",
        accessEndsAt,
        effectiveAccessEndsAt: accessEndsAt,
        subscriptionStatus: "CANCELED"
      })
    );

    expect(cancelling.title).toContain("remains active");
    expect(cancelling.dateLabel).toBe("Pro access ends");
    expect(cancelling.date).toEqual(accessEndsAt);
    expect(expired.title).toBe("Circle Card is on Free");
    expect(expired.description).toContain("content remains stored");
  });

  it.each([
    ["admin", "administrator"],
    ["ambassador", "ambassador grant"],
    ["grandfathered", "persisted access grant"],
    ["bcn_membership", "BCN membership"]
  ] as const)("uses non-renewal copy for %s access", (source, expectedCopy) => {
    const view = buildCircleCardBillingStatusView(
      accessSnapshot({
        plan: "PRO",
        source,
        hasProAccess: true,
        lifecycleStatus:
          source === "admin"
            ? "admin"
            : source === "ambassador"
              ? "ambassador"
              : source === "grandfathered"
                ? "grandfathered"
                : "membership_included"
      })
    );

    expect(view.description).toContain(expectedCopy);
    expect(view.showUpgrade).toBe(false);
    expect(view.date).toBeNull();
  });

  it("wires portal visibility, the disabled-billing interest path, and a strict success banner", () => {
    const root = process.cwd();
    const component = readFileSync(
      join(root, "src/components/circle-card/circle-card-billing-status-panel.tsx"),
      "utf8"
    );
    const dashboard = readFileSync(
      join(root, "src/app/(member)/dashboard/circle-card/page.tsx"),
      "utf8"
    );

    expect(component).toContain("access.hasBillingRelationship");
    expect(component).toContain("Update Payment Method");
    expect(component).toContain('"/circle-card/pro#register-interest"');
    expect(dashboard).toContain('actualCircleCardAccess.source === "standalone_subscription"');
    expect(dashboard).toContain('actualCircleCardAccess.lifecycleStatus === "active"');
    expect(dashboard).toContain("<CircleCardBillingStatusPanel");
  });
});
