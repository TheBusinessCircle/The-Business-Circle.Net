import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_CONFIG } from "@/config/site";
import {
  SOCIAL_SHARE_IMAGE,
  createPageMetadata,
  getOpenGraphShareImage,
  getSocialShareImageUrl,
  getTwitterShareImage
} from "@/lib/seo";

describe("social share metadata", () => {
  it("uses a static 1200x630 PNG for social previews", () => {
    expect(SOCIAL_SHARE_IMAGE).toMatchObject({
      path: "/social-share.png",
      width: 1200,
      height: 630,
      type: "image/png"
    });
    expect(existsSync(join(process.cwd(), "public", "social-share.png"))).toBe(true);
    expect(getSocialShareImageUrl()).toBe(`${SITE_CONFIG.url}/social-share.png`);
  });

  it("adds complete Open Graph and Twitter image descriptors to page metadata", () => {
    const metadata = createPageMetadata({
      title: "Membership",
      description: "Join The Business Circle Network.",
      path: "/membership"
    });

    expect(metadata.openGraph).toMatchObject({
      images: [getOpenGraphShareImage()]
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [getTwitterShareImage()]
    });
  });
});
