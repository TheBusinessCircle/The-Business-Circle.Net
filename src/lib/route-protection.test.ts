import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_CONFIG } from "@/config/site";

const middlewareSource = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
const robotsSource = readFileSync(join(process.cwd(), "src/app/robots.ts"), "utf8");
const intentionallyPublicMemberNavLinks = new Set(["/founder"]);

const privateRoutes = [
  "/blueprint",
  "/dashboard",
  "/dashboard/resources",
  "/community",
  "/messages",
  "/directory",
  "/events",
  "/calls",
  "/wins",
  "/profile",
  "/inner-circle",
  "/member",
  "/member/bcn-updates",
  "/admin"
] as const;

describe("route protection coverage", () => {
  it("keeps member and admin routes covered by middleware or member layout protection", () => {
    for (const route of privateRoutes) {
      const topLevelRoute = `/${route.split("/").filter(Boolean)[0]}`;
      expect(middlewareSource).toContain(topLevelRoute);
    }

    expect(middlewareSource).toContain("Admin-only routes are enforced here");
    expect(middlewareSource).toContain("member route groups also call requireUser");
  });

  it("keeps current member navigation destinations covered when they are private", () => {
    for (const item of SITE_CONFIG.memberNavigation) {
      if (intentionallyPublicMemberNavLinks.has(item.href)) {
        continue;
      }

      const topLevelRoute = `/${item.href.split("/").filter(Boolean)[0]}`;
      expect(middlewareSource).toContain(topLevelRoute);
    }
  });

  it("keeps private routes disallowed for crawlers", () => {
    for (const route of privateRoutes) {
      const topLevelRoute = `/${route.split("/").filter(Boolean)[0]}`;
      expect(robotsSource).toContain(`"${topLevelRoute}"`);
    }

    expect(robotsSource).toContain("\"/members\"");
  });
});
