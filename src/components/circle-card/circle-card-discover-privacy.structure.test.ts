import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Circle Card Discover privacy controls", () => {
  it("keeps Discover visibility default-hidden in schema and migration", () => {
    const schema = readSource("prisma/schema.prisma");
    const migration = readSource(
      "prisma/migrations/20260623100000_add_circle_card_discover_visibility/migration.sql"
    );

    expect(schema).toMatch(/showInDiscover\s+Boolean\s+@default\(false\)/);
    expect(schema).toMatch(/discoverOptedInAt\s+DateTime\?/);
    expect(migration).toContain('"showInDiscover" BOOLEAN NOT NULL DEFAULT false');
    expect(migration).toContain('"discoverOptedInAt" TIMESTAMP(3)');
  });

  it("requires opt-in for Discover while preserving public card sharing", () => {
    const privacy = readSource("src/lib/circle-card/privacy.ts");
    const dashboard = readSource("src/app/(member)/dashboard/circle-card/page.tsx");
    const onboardingAction = readSource("src/actions/circle-card-onboarding.actions.ts");

    expect(privacy).toContain("showInDiscover: true");
    expect(privacy).toContain("showContactMethods");
    expect(privacy).toContain("Your public card still works when shared.");
    expect(dashboard).toContain("...CIRCLE_CARD_DISCOVER_VISIBLE_WHERE");
    expect(dashboard).toContain("Show my Circle Card in Discover");
    expect(dashboard).toContain("CIRCLE_CARD_DISCOVER_SETTING_COPY");
    expect(onboardingAction).toContain("showInDiscover: false");
  });

  it("shows Discover privacy visibility in the admin command centre", () => {
    const service = readSource("src/server/admin/circle-card-command-centre.service.ts");
    const adminPage = readSource("src/app/(admin)/admin/circle-card/page.tsx");

    expect(service).toContain("loadDiscoverPrivacySnapshot");
    expect(service).toContain("recentlyOptedInCards");
    expect(adminPage).toContain("Discover Privacy");
    expect(adminPage).toContain("Discover visible users");
    expect(adminPage).toContain("Discover hidden users");
    expect(adminPage).toContain("Recently opted-in users");
  });
});
