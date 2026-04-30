import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildJoin2ActionHrefs, isJoin2ActivationKey } from "@/lib/join/cinematic-entry";

describe("join-mobile cinematic entry", () => {
  it("preserves selected tier, billing period, invite, and from in the join href", () => {
    const hrefs = buildJoin2ActionHrefs({
      tier: "INNER_CIRCLE",
      billingInterval: "annual",
      billing: "cancelled",
      from: "/membership?tier=core&period=monthly",
      inviteCode: " bcn-test "
    });

    expect(hrefs.publicSiteHref).toBe("/");
    expect(hrefs.loginHref).toBe("/login?from=%2Fmembership%3Ftier%3Dcore%26period%3Dmonthly");
    expect(hrefs.joinHref).toBe(
      "/join?from=%2Fmembership%3Ftier%3Dcore%26period%3Dmonthly&tier=inner-circle&period=annual&billing=cancelled&invite=BCN-TEST&auth=register"
    );
  });

  it("treats keyboard activation keys as valid portal entry input", () => {
    expect(isJoin2ActivationKey("Enter")).toBe(true);
    expect(isJoin2ActivationKey(" ")).toBe(true);
    expect(isJoin2ActivationKey("Escape")).toBe(false);
  });

  it("wires keyboard activation into the portal button choice transition", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/auth/join2-cinematic-entry.tsx"),
      "utf8"
    );

    expect(source).toContain("onKeyDown={handlePortalKeyDown}");
    expect(source).toContain('setSceneStage("choices")');
    expect(source).toContain("Explore The Business Circle");
    expect(source).toContain("Continue to join");
    expect(source).toContain("Sign in");
    expect(source).toContain('video.addEventListener("error", markVideoFallback)');
    expect(source).toContain("JOIN2_FALLBACK_TIMEOUT_MS");
  });

  it("keeps fallback readiness on the Step Inside button instead of rendering a direct-route panel", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/auth/join2-cinematic-entry.tsx"),
      "utf8"
    );

    expect(source).toContain("setPortalReady(true)");
    expect(source).not.toContain("fallbackActions");
    expect(source).not.toContain("fallbackActionGrid");
    expect(source).not.toContain("fallbackActionLink");
    expect(source).not.toContain("shouldShowJoin2FallbackActions");
  });
});
