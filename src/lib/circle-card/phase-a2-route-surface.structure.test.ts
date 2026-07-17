import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

describe("Phase A2 route surface structure", () => {
  it.each([
    ["src/app/(public)/pro/page.tsx", "@/app/(public)/circle-card/pro/page"],
    ["src/app/(public)/teams/page.tsx", "@/app/(public)/circle-card/teams/page"],
    [
      "src/app/(public)/community-standards/page.tsx",
      "@/app/(public)/circle-card/community-standards/page"
    ],
    ["src/app/(member)/app/page.tsx", "@/app/(member)/dashboard/circle-card/page"],
    [
      "src/app/(member)/app/onboarding/page.tsx",
      "@/app/(member)/dashboard/circle-card/onboarding/page"
    ],
    [
      "src/app/(member)/app/studio/page.tsx",
      "@/app/(member)/dashboard/circle-card/studio/page"
    ],
    [
      "src/app/(member)/app/wallet/page.tsx",
      "@/app/(member)/dashboard/circle-card/wallet/page"
    ],
    [
      "src/app/(member)/app/testimonial/page.tsx",
      "@/app/(member)/dashboard/circle-card/testimonial/page"
    ]
  ])("aliases %s to the existing implementation", (path, implementation) => {
    expect(source(path)).toContain(implementation);
  });

  it("uses brand-selected public and auth shells while retaining BCN shells", () => {
    const publicLayout = source("src/app/(public)/layout.tsx");
    const authLayout = source("src/app/(auth)/layout.tsx");
    expect(publicLayout).toContain("<CircleCardPublicShell>");
    expect(publicLayout).toContain("<PublicSiteShell>");
    expect(authLayout).toContain("<CircleCardPublicShell>");
    expect(authLayout).toContain("<AuthAreaShell>");
  });

  it("keeps the root page's BCN journey and selects the current Circle Card landing", () => {
    const rootPage = source("src/app/(public)/page.tsx");
    expect(rootPage).toContain("<CircleCardLandingPage");
    expect(rootPage).toContain('shouldUseMobileJoin(headersList) ? "/join-mobile" : "/join-desktop"');
    expect(rootPage).toContain("redirect(destination)");
  });

  it("selects clean Circle Card login and registration return paths by runtime brand", () => {
    const loginPage = source("src/app/(auth)/login/page.tsx");
    const registerPage = source("src/app/(auth)/register/page.tsx");
    const registerForm = source("src/components/auth/circle-card-register-form.tsx");
    expect(loginPage).toContain("resolveCircleCardAuthReturnPath(");
    expect(registerPage).toContain("circleCardRoutes.onboarding");
    expect(registerForm).toContain("resolveCircleCardAuthReturnPath(");
  });

  it("uses runtime-brand support details without linking Circle Card users to the denied BCN contact page", () => {
    const communityStandards = source(
      "src/app/(public)/circle-card/community-standards/page.tsx"
    );
    const dpia = source("src/app/(public)/dpia/page.tsx");

    expect(communityStandards).toContain("`mailto:${runtimeBrand.supportEmail}`");
    expect(dpia).toContain("runtimeBrand.supportEmail");
    expect(dpia).toContain(
      'const contactHref = circleCardRuntime ? `mailto:${publicSupportEmail}` : "/contact"'
    );
  });
});
