import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Circle Card Pro final launch controls", () => {
  it("gives checkout and Portal immediate pending, duplicate-press and recoverable-error states", () => {
    const checkout = source("src/components/circle-card/circle-card-pro-checkout-buttons.tsx");
    const portal = source("src/components/circle-card/circle-card-billing-portal-button.tsx");
    const interest = source("src/components/circle-card/circle-card-interest-submit-button.tsx");

    expect(checkout).toContain("if (inFlight.current || isPending || !billingEnabled || !authenticated) return");
    expect(checkout).toContain("Preparing secure checkout…");
    expect(checkout).toContain("finally");
    expect(checkout).toContain('role="alert"');
    expect(portal).toContain("if (inFlight.current || isPending) return");
    expect(portal).toContain("Opening billing…");
    expect(portal).toContain('role="alert"');
    expect(interest).toContain("useFormStatus");
    expect(interest).toContain("Registering interest…");
  });

  it("cannot call Checkout while billing is disabled and uses the protected route when enabled", () => {
    const checkout = source("src/components/circle-card/circle-card-pro-checkout-buttons.tsx");
    const route = source("src/app/api/stripe/circle-card/checkout/route.ts");
    const proPage = source("src/app/(public)/circle-card/pro/page.tsx");
    const dashboard = source("src/app/(member)/dashboard/circle-card/page.tsx");

    expect(checkout.indexOf("if (!billingEnabled || !authenticated)")).toBeGreaterThan(
      checkout.indexOf("function startCheckout()")
    );
    expect(checkout).toContain('fetch("/api/stripe/circle-card/checkout"');
    expect(route).toContain("isTrustedOrigin");
    expect(route).toContain("getCircleCardBillingReadiness");
    expect(route).toContain("findFirst");
    expect(route).toContain("userId: authResult.user.id");
    expect(route).toContain("canUserStartCircleCardCheckout(authResult.user.id)");
    expect(proPage).toContain("canUserStartCircleCardCheckout(activeUser.id)");
    expect(proPage).not.toMatch(/CircleCardProCheckoutButtons[^>]*\sbillingEnabled\s+authenticated=/);
    expect(dashboard).toContain("canUserStartCircleCardCheckout(session.user.id)");
  });

  it("keeps authoritative success and non-Stripe access server-derived", () => {
    const dashboard = source("src/app/(member)/dashboard/circle-card/page.tsx");
    const billing = source("src/server/circle-card/billing.service.ts");

    expect(dashboard).toContain('actualCircleCardAccess.source === "standalone_subscription"');
    expect(dashboard).toContain('firstValue(params.billing) === "success"');
    expect(dashboard).toContain("CircleCardAuthoritativeProAnalytics");
    expect(billing).toContain('entitlement.source === "ADMIN_OVERRIDE"');
    expect(billing).toContain('entitlement.source === "AMBASSADOR_FREE_PRO"');
    expect(billing).toContain('entitlement.source === "BCN_INCLUDED_PRO"');
    expect(billing).toContain('entitlement.source === "EARLY_ACCESS"');
  });

  it("retains request-level access memoisation and avoids a duplicate dashboard load", () => {
    const billing = source("src/server/circle-card/billing.service.ts");
    const dashboard = source("src/app/(member)/dashboard/circle-card/page.tsx");
    const publicCard = source("src/server/circle-card/public-card.service.ts");

    expect(billing).toContain("const loadCircleCardAccessForUserCached = cache");
    expect(billing).toContain("return now");
    expect(dashboard.match(/loadCircleCardAccessForUser\(session\.user\.id\)/g)).toHaveLength(1);
    expect(publicCard).toContain("loadCircleCardAccessForUser(card.userId)");
    expect(publicCard).toContain("await Promise.all([");
  });

  it("keeps Studio controls above mobile navigation and protects Free activation", () => {
    const studio = source("src/components/circle-card/circle-studio.tsx");
    const action = source("src/actions/circle-card.actions.ts");

    expect(studio).toContain("pb-[calc(6rem+env(safe-area-inset-bottom))]");
    expect(studio).toContain("Your Studio design is saved privately.");
    expect(studio).toContain("Apply My Design with Pro — £9.99/month");
    expect(studio).toContain("View My Current Live Card");
    expect(action).toContain('intent === "activate" && !user.access.capabilities.circleStudio');
  });

  it("preserves normal image uploads and stored launch-gated Media Kit files", () => {
    const dashboard = source("src/app/(member)/dashboard/circle-card/page.tsx");
    const mediaKit = source("src/components/circle-card/circle-card-media-kit-manager.tsx");

    expect(dashboard).toContain('name="profileImageUrl"');
    expect(dashboard).toContain('name="businessLogoUrl"');
    expect(mediaKit).not.toContain("CircleCardLinkFileUploadField");
    expect(mediaKit).toContain('type="hidden" name="fileUrl"');
    expect(mediaKit).toContain('type="hidden" name="externalMediaKitUrl"');
  });

  it("records privacy-safe action buckets and rerender-safe conversion events", () => {
    const performance = source("src/server/circle-card/performance.ts");
    const analytics = source("src/lib/analytics.ts");
    const clientAnalytics = source("src/components/circle-card/circle-card-pro-analytics.tsx");

    expect(performance).toContain('logServerInfo("circle-card-action-performance"');
    expect(performance).toContain("durationBucket");
    expect(performance).not.toMatch(/email|card content|request body|payment details/i);
    for (const event of [
      "pro_page_viewed",
      "pro_cta_clicked",
      "pro_feature_locked_viewed",
      "studio_preview_started",
      "studio_draft_saved",
      "studio_upgrade_clicked",
      "checkout_requested",
      "checkout_reused",
      "checkout_failed",
      "portal_opened",
      "authoritative_pro_confirmed"
    ]) {
      expect(analytics).toContain(event);
    }
    expect(clientAnalytics).toContain("useRef(false)");
    expect(clientAnalytics).toContain("if (sent.current) return");
  });
});
