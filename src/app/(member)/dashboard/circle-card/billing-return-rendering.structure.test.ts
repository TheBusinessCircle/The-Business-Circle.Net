import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Circle Card billing return render ordering", () => {
  it.each([
    "src/app/(member)/dashboard/circle-card/page.tsx",
    "src/app/(member)/dashboard/circle-card/studio/page.tsx"
  ])("reconciles before loading displayed access in %s", (path) => {
    const page = source(path);
    const reconcileAt = page.indexOf("await reconcileCircleCardBillingReturn(");
    const accessAt = page.indexOf("loadCircleCardAccessForUser(");

    expect(reconcileAt).toBeGreaterThan(-1);
    expect(accessAt).toBeGreaterThan(reconcileAt);
  });

  it("keeps clean and legacy routes on the same reconciled implementations", () => {
    expect(source("src/app/(member)/app/page.tsx")).toContain(
      '@/app/(member)/dashboard/circle-card/page'
    );
    expect(source("src/app/(member)/app/studio/page.tsx")).toContain(
      '@/app/(member)/dashboard/circle-card/studio/page'
    );
  });
});
