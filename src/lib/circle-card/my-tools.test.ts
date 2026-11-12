import { describe, expect, it } from "vitest";
import {
  CIRCLE_CARD_MY_TOOLS,
  isMyToolId,
  myToolEditorHref,
  readMyToolsShelf,
  updateMyToolsShelf
} from "@/lib/circle-card/my-tools";

describe("Circle Card My Tools: one accessible cross-category workspace", () => {
  it("exposes both category filters with unique tool IDs", () => {
    expect(new Set(CIRCLE_CARD_MY_TOOLS.map((item) => item.id)).size).toBe(CIRCLE_CARD_MY_TOOLS.length);
    expect(CIRCLE_CARD_MY_TOOLS.some((tool) => tool.family === "CREATOR")).toBe(true);
    expect(CIRCLE_CARD_MY_TOOLS.some((tool) => tool.family === "BUSINESS")).toBe(true);
    expect(CIRCLE_CARD_MY_TOOLS.find((tool) => tool.id === "wish-lists")?.stage).toBe("future");
  });

  it("recovers a saved shelf while ignoring unknown IDs and duplicates", () => {
    expect(readMyToolsShelf({
      myTools: { pinned: ["featured-content", "services", "services", "__bad__", 12, "scan-card"] }
    })).toEqual(["featured-content", "services", "scan-card"]);
    expect(readMyToolsShelf(null)).toEqual([]);
    expect(isMyToolId("unexpected-token")).toBe(false);
  });

  it("does not delete or rewrite existing business/creator blocks or metadata", () => {
    const original = {
      creator: { MEDIA_KIT: { followers: "100" } },
      business: { SERVICES: { items: [{ id: "one" }] } },
      existingKey: { keep: true },
      myTools: { version: 1, customSetting: "preserve", pinned: ["featured-content"] }
    };
    const updated = updateMyToolsShelf(original, "products", "pin");
    expect(updated.creator).toEqual(original.creator);
    expect(updated.business).toEqual(original.business);
    expect(updated.existingKey).toEqual(original.existingKey);
    expect((updated.myTools as Record<string, unknown>).customSetting).toBe("preserve");
    expect(readMyToolsShelf(updated)).toEqual(["featured-content", "products"]);
    expect(readMyToolsShelf(updateMyToolsShelf(updated, "featured-content", "unpin"))).toEqual(["products"]);
    expect(readMyToolsShelf(original)).toEqual(["featured-content"]);
  });

  it("makes tool selection independent of creator/business category", () => {
    const saved = updateMyToolsShelf({ myTools: { pinned: ["featured-content"] } }, "services", "pin");
    expect(readMyToolsShelf(saved)).toEqual(["featured-content", "services"]);
  });

  it("does not expose disabled, future, locked, or incompatible editors", () => {
    const get = (id: string) => CIRCLE_CARD_MY_TOOLS.find((t) => t.id === id)!;
    expect(myToolEditorHref(get("files"), "cm12345678901234", "BUSINESS", true)).toBeNull();
    expect(myToolEditorHref(get("wish-lists"), "cm12345678901234", "CREATOR", true)).toBeNull();
    expect(myToolEditorHref(get("services"), "cm12345678901234", "BUSINESS", false)).toBeNull();
    expect(myToolEditorHref(get("services"), "cm12345678901234", "CREATOR", true)).toBeNull();
    expect(myToolEditorHref(get("services"), "cm12345678901234", "BUSINESS", true))
      .toBe("/dashboard/circle-card?section=business&cardId=cm12345678901234#business-card-services");
    expect(myToolEditorHref(get("scan-card"), "cm12345678901234", "CREATOR", false))
      .toBe("/dashboard/circle-card?section=network&cardId=cm12345678901234#connect-hub");
  });
});
