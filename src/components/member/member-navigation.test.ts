import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_CONFIG } from "@/config/site";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("member mobile navigation structure", () => {
  it("keeps the mobile burger in the member header and removes the standalone strip", () => {
    const layout = readSource("src/app/(member)/layout.tsx");
    const navigation = readSource("src/components/member/member-navigation.tsx");

    const headerStart = layout.indexOf("<header");
    const headerEnd = layout.indexOf("</header>");
    const mobileNavigationTrigger = layout.indexOf('orientation="horizontal"');

    expect(headerStart).toBeGreaterThan(-1);
    expect(headerEnd).toBeGreaterThan(headerStart);
    expect(mobileNavigationTrigger).toBeGreaterThan(headerStart);
    expect(mobileNavigationTrigger).toBeLessThan(headerEnd);

    expect(layout).not.toContain("border-y border-[#28123d]");
    expect(layout).not.toContain('triggerVariant="icon"');
    expect(layout).toContain("const mobileNavItems = showCircleCardShell");
    expect(layout).toContain("items={mobileNavItems}");
    expect(layout).toContain("items={visibleNavItems}");

    expect(navigation).not.toContain(["MEMBER", "MENU"].join(" "));
    expect(navigation).not.toContain(["Member", "menu"].join(" "));
    expect(navigation).not.toContain("activeItem");
    expect(navigation).not.toContain("flex min-h-12 w-full items-center justify-between");
  });

  it("keeps the full-screen drawer and member nav links available", () => {
    const navigation = readSource("src/components/member/member-navigation.tsx");

    expect(navigation).toContain("createPortal(mobileDrawer, document.body)");
    expect(navigation).toContain("fixed inset-0 z-[9999]");
    expect(navigation).toContain("overflow-y-auto");
    expect(navigation).toContain("document.body.style.overflow = \"hidden\"");
    expect(navigation).toContain("items.map(renderMobileNavLink)");

    expect(SITE_CONFIG.memberNavigation.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        "Dashboard",
        "Circle Blueprint",
        "Community",
        "Messages",
        "Directory",
        "Events",
        "Calls",
        "Resources",
        "Wins",
        "BCN Intelligence",
        "Profile",
        "Inner Circle",
        "Founder | Trev"
      ])
    );
  });

  it("keeps Circle Card routes inside Circle Card workspace navigation", () => {
    const layout = readSource("src/app/(member)/layout.tsx");
    const navigation = readSource("src/components/member/member-navigation.tsx");

    expect(layout).toContain("const isCircleCardWorkspaceRoute = isCircleCardDashboardPath(currentPathname)");
    expect(layout).toContain("const showCircleCardShell = isCircleCardWorkspaceRoute || circleCardFree");
    expect(layout).toContain('label: "My Circle Card"');
    expect(layout).toContain('label: "Wallet"');
    expect(layout).toContain('label: "Analytics"');
    expect(layout).toContain('label: "Settings"');
    expect(layout).toContain('label: "Public card"');
    expect(layout).toContain('label: "Discover"');
    expect(layout).toContain('workspaceBrand={showCircleCardShell ? "circle-card" : "bcn"}');
    expect(layout).toContain(
      'footer={<MemberFooter variant={showCircleCardShell ? "circle-card-free" : "member"} />}'
    );

    expect(navigation).toContain('href.includes("/dashboard/circle-card/wallet")');
    expect(navigation).toContain('href.includes("#analytics")');
    expect(navigation).toContain('href.includes("section=settings")');
    expect(navigation).toContain('href.includes("#discover")');
  });
});
