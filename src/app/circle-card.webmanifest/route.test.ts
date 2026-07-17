import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/circle-card.webmanifest/route";
import { getRuntimeManifestPath } from "@/lib/circle-card/metadata";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Circle Card PWA manifest", () => {
  it("preserves the BCN start URL when APP_BRAND is absent", async () => {
    vi.stubEnv("APP_BRAND", undefined);
    const manifest = await GET().json();
    expect(manifest.start_url).toBe("/dashboard/circle-card");
  });

  it("uses the clean start URL for the Circle Card runtime", async () => {
    vi.stubEnv("APP_BRAND", "circle-card");
    const manifest = await GET().json();
    expect(manifest.start_url).toBe("/app");
  });

  it("prevents a dynamic manifest response being reused across runtime hosts", () => {
    const response = GET();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("Vary")).toBe("Host");
  });

  it("selects the correct metadata manifest without changing the BCN default", () => {
    expect(getRuntimeManifestPath("bcn")).toBe("/manifest.webmanifest");
    expect(getRuntimeManifestPath("circle-card")).toBe("/circle-card.webmanifest");
  });
});
