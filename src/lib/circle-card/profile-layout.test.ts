import { describe, expect, it } from "vitest";
import type { CircleCardProfileLayout, CircleCardType } from "@prisma/client";
import { resolvePublicCircleCardLayout } from "@/lib/circle-card/profile-layout";

describe("resolvePublicCircleCardLayout", () => {
  it.each([
    ["PERSONAL", "CLASSIC"],
    ["BUSINESS", "BUSINESS"],
    ["CREATOR", "CREATOR"]
  ] satisfies Array<[CircleCardType, CircleCardProfileLayout]>) (
    "uses persisted %s cardType for the %s public layout",
    (cardType, expectedLayout) => {
      expect(resolvePublicCircleCardLayout(cardType)).toBe(expectedLayout);
    }
  );
});
