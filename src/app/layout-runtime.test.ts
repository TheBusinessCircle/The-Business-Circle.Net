import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Plus_Jakarta_Sans: () => ({ variable: "--font-jakarta" }),
  Sora: () => ({ variable: "--font-sora" })
}));

import { generateMetadata } from "./layout";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("same-build root metadata", () => {
  it("preserves BCN metadata when APP_BRAND is absent", () => {
    delete process.env.APP_BRAND;

    const metadata = generateMetadata();

    expect(metadata.metadataBase?.toString()).toBe("https://thebusinesscircle.net/");
    expect(metadata.applicationName).toBe("The Business Circle Network");
    expect(metadata.manifest).toBe("/manifest.webmanifest");
  });

  it("resolves Circle Card metadata at process runtime from the same module", () => {
    vi.stubEnv("APP_BRAND", "circle-card");

    const metadata = generateMetadata();
    const serialized = JSON.stringify(metadata);

    expect(metadata.metadataBase?.toString()).toBe("https://circlecard.co.uk/");
    expect(metadata.applicationName).toBe("Circle Card");
    expect(metadata.manifest).toBe("/circle-card.webmanifest");
    expect(serialized).toContain("https://circlecard.co.uk");
    expect(serialized).not.toContain("thebusinesscircle.net");
  });
});
