import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const publicStackPages = [
  "src/app/(public)/home/page.tsx",
  "src/app/(public)/about/page.tsx",
  "src/app/(public)/membership/page.tsx",
  "src/app/(public)/audit/page.tsx",
  "src/app/(public)/founder/page.tsx",
  "src/app/(public)/founder/services/[slug]/page.tsx",
  "src/app/(public)/insights/page.tsx",
  "src/app/(public)/insights/[slug]/page.tsx",
  "src/app/(public)/insights/topic/[clusterSlug]/page.tsx",
  "src/app/(public)/contact/page.tsx",
  "src/app/(public)/faq/page.tsx",
  "src/app/(public)/dpia/page.tsx"
] as const;

const memberStackPages = [
  "src/app/(member)/dashboard/page.tsx",
  "src/app/(member)/profile/page.tsx",
  "src/app/(member)/directory/page.tsx",
  "src/app/(member)/community/page.tsx",
  "src/app/(member)/community/post/[postId]/page.tsx",
  "src/app/(member)/messages/page.tsx",
  "src/app/(member)/messages/[threadId]/page.tsx",
  "src/app/(member)/messages/requests/page.tsx",
  "src/app/(member)/dashboard/resources/page.tsx",
  "src/app/(member)/dashboard/resources/[slug]/page.tsx",
  "src/app/(member)/blueprint/page.tsx",
  "src/app/(member)/inner-circle/page.tsx",
  "src/app/(member)/core/page.tsx",
  "src/app/(member)/member/growth-architect/page.tsx",
  "src/app/(member)/member/growth-architect/services/[slug]/page.tsx",
  "src/app/(member)/member/bcn-updates/page.tsx",
  "src/app/(member)/events/page.tsx",
  "src/app/(member)/calls/page.tsx",
  "src/app/(member)/wins/page.tsx",
  "src/app/(member)/wins/new/page.tsx",
  "src/app/(member)/wins/[slug]/page.tsx"
] as const;

describe("BCN shared layout utilities", () => {
  it("keeps global shell and width utilities available", () => {
    const globals = readSource("src/app/globals.css");

    for (const className of [
      ".bcn-page-shell",
      ".bcn-section",
      ".bcn-section-tight",
      ".bcn-container",
      ".bcn-container-wide",
      ".bcn-container-readable",
      ".bcn-full-bleed",
      ".member-page-stack"
    ]) {
      expect(globals).toContain(className);
    }
  });

  it("uses the shared shell containers in public and member chrome", () => {
    expect(readSource("src/components/public/public-site-shell.tsx")).toContain("bcn-page-shell");
    expect(readSource("src/components/public/navbar-client.tsx")).toContain("bcn-container");
    expect(readSource("src/components/public/footer.tsx")).toContain("bcn-container");
    expect(readSource("src/components/shell/app-shell.tsx")).toContain("bcn-container-wide");
    expect(readSource("src/components/member/member-footer.tsx")).toContain("bcn-container-wide");
    expect(readSource("src/app/(member)/layout.tsx")).toContain("bcn-container-wide");
  });

  it.each(publicStackPages)("keeps %s on the public page stack", (path) => {
    expect(readSource(path)).toContain("public-page-stack");
  });

  it.each(memberStackPages)("keeps %s on the member page stack", (path) => {
    expect(readSource(path)).toContain("member-page-stack");
  });

  it("keeps legacy oversized public spacing out of primary public route files", () => {
    for (const path of publicStackPages) {
      const source = readSource(path);

      expect(source).not.toContain("space-y-20 pb-28");
      expect(source).not.toContain("lg:space-y-28");
      expect(source).not.toContain("py-28");
      expect(source).not.toContain("lg:py-36");
    }
  });
});
