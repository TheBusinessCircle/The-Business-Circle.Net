import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { validateRuntimeOriginEnvironment } from "@/config/runtime-origin";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { getCircleCardRoutes } from "@/lib/circle-card/routes";
import { getTrustedRuntimeOrigins } from "@/lib/security/origin";

describe("same-build dual-runtime readiness", () => {
  it("resolves both production processes independently after one module import", () => {
    const bcn = {
      APP_BRAND: "bcn",
      APP_URL: "https://thebusinesscircle.net",
      AUTH_URL: "https://thebusinesscircle.net",
      NEXTAUTH_URL: "https://thebusinesscircle.net",
      NODE_ENV: "production"
    };
    const circleCard = {
      APP_BRAND: "circle-card",
      APP_URL: "https://circlecard.co.uk",
      AUTH_URL: "https://circlecard.co.uk",
      NEXTAUTH_URL: "https://circlecard.co.uk",
      NODE_ENV: "production"
    };

    expect(validateRuntimeOriginEnvironment(bcn).issues).toEqual([]);
    expect(validateRuntimeOriginEnvironment(circleCard).issues).toEqual([]);
    expect(getRuntimeBrand(bcn).key).toBe("bcn");
    expect(getRuntimeBrand(circleCard).key).toBe("circle-card");
    expect(getCircleCardRoutes("bcn").dashboard).toBe("/dashboard/circle-card");
    expect(getCircleCardRoutes("circle-card").dashboard).toBe("/app");
    expect([...getTrustedRuntimeOrigins(bcn)]).toEqual([
      "https://thebusinesscircle.net"
    ]);
    expect([...getTrustedRuntimeOrigins(circleCard)]).toEqual([
      "https://circlecard.co.uk"
    ]);
  });

  it("builds explicit clean Circle Card metadata without APP_BRAND capture", () => {
    const metadata = createCircleCardPageMetadata(
      {
        title: "Circle Card Pro",
        description: "Circle Card Pro",
        path: "/pro"
      },
      "circle-card"
    );

    expect(metadata.metadataBase?.toString()).toBe("https://circlecard.co.uk/");
    expect(metadata.openGraph).toMatchObject({
      url: "https://circlecard.co.uk/pro"
    });
  });

  it("contains no public browser-controlled brand environment setting", () => {
    const sources = [
      "src/config/runtime-brand.ts",
      "src/config/runtime-origin.ts",
      "src/middleware.ts",
      "src/components/providers.tsx"
    ].map((path) => readFileSync(join(process.cwd(), path), "utf8"));

    expect(sources.join("\n")).not.toMatch(/NEXT_PUBLIC_(?:APP_)?BRAND/);
    expect(sources.join("\n")).not.toMatch(/window\.(?:localStorage|sessionStorage).*brand/i);
  });
});
