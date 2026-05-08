import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("admin launch command centre structure", () => {
  it("adds the admin launch route and keeps it admin-only", () => {
    const page = readSource("src/app/(admin)/admin/launch/page.tsx");

    expect(page).toContain("Launch Command Centre");
    expect(page).toContain("await requireAdmin()");
    expect(page).toContain("getLaunchCommandCentreData");
    expect(page).toContain("path: \"/admin/launch\"");
  });

  it("shows key launch sections", () => {
    const page = readSource("src/app/(admin)/admin/launch/page.tsx");

    expect(page).toContain("Latest paid members");
    expect(page).toContain("Pending testimonial approvals");
    expect(page).toContain("Founder service requests");
    expect(page).toContain("Audit and conversion event structure");
    expect(page).toContain("Manual action list");
  });

  it("prepares analytics and conversion signals without schema changes", () => {
    const service = readSource("src/server/admin/launch-command.service.ts");

    expect(service).toContain("ANALYTICS_EVENTS.auditStart");
    expect(service).toContain("ANALYTICS_EVENTS.auditComplete");
    expect(service).toContain("ANALYTICS_EVENTS.checkoutStarted");
    expect(service).toContain("ANALYTICS_EVENTS.registrationStarted");
    expect(service).toContain("ANALYTICS_EVENTS.profileSaved");
    expect(service).toContain("ANALYTICS_EVENTS.founderServiceRequestSubmitted");
    expect(service).toContain("storage not connected yet");
  });

  it("adds Launch Command to admin navigation", () => {
    const siteConfig = readSource("src/config/site.ts");

    expect(siteConfig).toContain("Launch Command");
    expect(siteConfig).toContain("/admin/launch");
  });
});
