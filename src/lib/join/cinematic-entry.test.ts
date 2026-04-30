import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Join2CinematicEntry } from "@/components/auth/join2-cinematic-entry";
import { buildJoin2ActionHrefs, isJoin2ActivationKey } from "@/lib/join/cinematic-entry";

const removedJoinMobilePanelText = [
  ["DIRECT", "ROUTE"].join(" "),
  ["Direct", "route"].join(" "),
  ["Explore", "The Business Circle"].join(" "),
  ["Continue", "to join"].join(" "),
  ["Sign", "in"].join(" ")
];

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

  it("renders the mobile cinematic entrance without route-panel text", () => {
    const markup = renderToStaticMarkup(
      createElement(Join2CinematicEntry, {
        initialSelectedTier: "FOUNDATION",
        billingInterval: "monthly"
      })
    );

    expect(markup).toContain("Step inside");
    expect(markup).toContain("Not every room is worth entering.");
    expect(markup).toContain("This one is built for business owners moving with intent.");

    removedJoinMobilePanelText.forEach((text) => {
      expect(markup).not.toContain(text);
    });
  });

  it("wires keyboard activation into the portal button join transition", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/auth/join2-cinematic-entry.tsx"),
      "utf8"
    );

    expect(source).toContain("onKeyDown={handlePortalKeyDown}");
    expect(source).toContain("window.location.assign(joinHref)");
    expect(source).toContain('video.addEventListener("error", markVideoFallback)');
    expect(source).toContain("JOIN2_FALLBACK_TIMEOUT_MS");
  });

  it("keeps the mobile source free of duplicated route-panel copy", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/auth/join2-cinematic-entry.tsx"),
      "utf8"
    );

    expect(source).toContain("setPortalReady(true)");
    removedJoinMobilePanelText.forEach((text) => {
      expect(source).not.toContain(text);
    });
    expect(source).not.toContain(["fallback", "Actions"].join(""));
    expect(source).not.toContain(["shouldShowJoin2", "FallbackActions"].join(""));
  });

  it("uses the lower portal alignment for the Step Inside overlay", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/auth/join2-cinematic-entry.tsx"),
      "utf8"
    );
    const styles = readFileSync(
      join(process.cwd(), "src/components/auth/join2-cinematic-entry.module.css"),
      "utf8"
    );

    expect(source).toContain("centerY: 0.445");
    expect(styles).toContain("--join2-portal-top: 44.5%");
    expect(styles).toContain("--join2-portal-top: 44.2%");
    expect(styles).toContain("--join2-portal-top: 44.7%");
    expect(styles).toContain("--join2-portal-top: 45.2%");
  });

  it("keeps the Step Inside label slightly enlarged without changing the portal ring", () => {
    const styles = readFileSync(
      join(process.cwd(), "src/components/auth/join2-cinematic-entry.module.css"),
      "utf8"
    );

    expect(styles).toContain("padding: 0.9rem 1.3rem;");
    expect(styles).toContain("font-size: 0.7rem;");
    expect(styles).toContain("padding: 0.78rem 1.04rem;");
    expect(styles).toContain("font-size: 0.61rem;");
  });
});
