import { describe, expect, it } from "vitest";
import {
  CIRCLE_CARD_LINK_TYPES,
  circleCardLinkFormSchema,
  isSafeCircleCardLinkDestination
} from "@/lib/circle-card/schema";

const cardId = "clx0000000000000000000001";

function smartLink(overrides: Record<string, unknown> = {}) {
  return {
    cardId,
    linkId: "",
    type: "GENERAL",
    label: "Useful link",
    url: "https://example.com/path",
    description: "",
    icon: "",
    imageUrl: "",
    fileUrl: "",
    fileName: "",
    fileMimeType: "",
    buttonText: "",
    expiresAt: "",
    actionMode: "AUTO",
    visibility: "PUBLIC",
    accessCodePlain: "",
    accessCodeHint: "",
    sortOrder: "0",
    isActive: "on",
    ...overrides
  };
}

describe("Circle Card smart-link URL contract", () => {
  it.each([
    "https://discord.gg/bEBeyukW8",
    "https://www.discord.gg/code",
    "https://discord.com/invite/code",
    "https://www.discord.com/invite/code",
    "https://chat.whatsapp.com/code",
    "https://wa.me/447700900000",
    "https://t.me/group",
    "https://telegram.me/group",
    "https://facebook.com/groups/example",
    "https://www.facebook.com/groups/example",
    "https://www.skool.com/example",
    "https://skool.com/example",
    "https://reddit.com/r/example",
    "https://www.reddit.com/r/example",
    "https://community.example.org/invite"
  ])("accepts the safe community URL %s", (url) => {
    const result = circleCardLinkFormSchema.parse(
      smartLink({ type: "COMMUNITY", label: "Our community", url })
    );

    expect(result.url).toBe(url);
  });

  it.each([
    ["discord.gg/code", "https://discord.gg/code"],
    ["www.discord.gg/code", "https://www.discord.gg/code"]
  ])("normalises %s to %s", (url, expected) => {
    const result = circleCardLinkFormSchema.parse(
      smartLink({ type: "COMMUNITY", label: "Discord", url })
    );

    expect(result.url).toBe(expected);
  });

  it.each(["javascript:alert(1)", "data:text/html,test", "ftp://example.com/file", "not a url"])(
    "rejects the unsafe or malformed URL %s",
    (url) => {
      expect(circleCardLinkFormSchema.safeParse(smartLink({ url })).success).toBe(false);
    }
  );

  it("rejects credential-bearing and non-HTTPS URLs", () => {
    expect(
      circleCardLinkFormSchema.safeParse(
        smartLink({ url: "https://user:password@example.com/private" })
      ).success
    ).toBe(false);
    expect(
      circleCardLinkFormSchema.safeParse(smartLink({ url: "http://example.com/insecure" })).success
    ).toBe(false);
  });

  it.each(CIRCLE_CARD_LINK_TYPES)("accepts the supported %s type", (type) => {
    const result = circleCardLinkFormSchema.safeParse(
      smartLink({ type, label: `${type} link` })
    );

    expect(result.success).toBe(true);
  });

  it("preserves image and managed file fields", () => {
    const result = circleCardLinkFormSchema.parse(
      smartLink({
        type: "DOWNLOAD",
        url: "",
        label: "Download brochure",
        imageUrl: "/uploads/circle-card/brochure.webp",
        fileUrl: "/api/circle-card/link-file/brochure.pdf",
        fileName: "brochure.pdf",
        fileMimeType: "application/pdf"
      })
    );

    expect(result.imageUrl).toBe("/uploads/circle-card/brochure.webp");
    expect(result.fileUrl).toBe("/api/circle-card/link-file/brochure.pdf");
    expect(result.fileName).toBe("brochure.pdf");
  });

  it("rejects unsafe public destinations while allowing managed files", () => {
    expect(isSafeCircleCardLinkDestination("javascript:alert(1)")).toBe(false);
    expect(isSafeCircleCardLinkDestination("https://user:pass@example.com")).toBe(false);
    expect(isSafeCircleCardLinkDestination("/api/circle-card/link-file/brochure.pdf")).toBe(true);
  });
});
