import { afterEach, describe, expect, it, vi } from "vitest";
import { generateMetadata as cookieMetadata } from "@/app/(public)/cookie-policy/page";
import { generateMetadata as dpiaMetadata } from "@/app/(public)/dpia/page";
import { generateMetadata as privacyMetadata } from "@/app/(public)/privacy-policy/page";
import { generateMetadata as termsMetadata } from "@/app/(public)/terms-of-service/page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("shared legal page runtime metadata", () => {
  it.each([
    ["privacy", privacyMetadata, "/privacy-policy"],
    ["terms", termsMetadata, "/terms-of-service"],
    ["cookie", cookieMetadata, "/cookie-policy"],
    ["DPIA", dpiaMetadata, "/dpia"]
  ])("uses Circle Card canonical metadata for %s", (_name, createMetadata, path) => {
    vi.stubEnv("APP_BRAND", "circle-card");

    const metadata = createMetadata();
    const serialized = JSON.stringify(metadata);

    expect(metadata.metadataBase?.toString()).toBe("https://circlecard.co.uk/");
    expect(metadata.alternates).toMatchObject({ canonical: path });
    expect(serialized).not.toContain("thebusinesscircle.net");
  });

  it("preserves BCN legal metadata when APP_BRAND is absent", () => {
    delete process.env.APP_BRAND;

    const metadata = privacyMetadata();

    expect(metadata.metadataBase?.toString()).toBe("https://thebusinesscircle.net/");
    expect(metadata.alternates).toMatchObject({ canonical: "/privacy-policy" });
  });
});
