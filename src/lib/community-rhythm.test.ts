import { MembershipTier } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  getCommunityRhythmBucket,
  getFreshnessSignal,
  getSuggestedConversationPrompts
} from "@/lib/community-rhythm";

describe("community rhythm", () => {
  it("uses a quiet weekly cadence bucket", () => {
    expect(getCommunityRhythmBucket(new Date("2026-03-23T09:00:00.000Z"))).toBe("start");
    expect(getCommunityRhythmBucket(new Date("2026-03-25T09:00:00.000Z"))).toBe("mid");
    expect(getCommunityRhythmBucket(new Date("2026-03-28T09:00:00.000Z"))).toBe("end");
  });

  it("returns subtle freshness labels", () => {
    const now = new Date("2026-03-24T12:00:00.000Z");

    expect(
      getFreshnessSignal("2026-03-24T08:00:00.000Z", { withinDayLabel: "Active today" }, now).label
    ).toBe("Active today");
    expect(
      getFreshnessSignal(
        "2026-03-21T08:00:00.000Z",
        { withinWeekLabel: "Updated this week" },
        now
      ).label
    ).toBe("Updated this week");
  });

  it("surfaces prompt suggestions for the current cadence without returning none", () => {
    const prompts = getSuggestedConversationPrompts({
      membershipTier: MembershipTier.FOUNDATION,
      limit: 2,
      now: new Date("2026-03-28T09:00:00.000Z")
    });

    expect(prompts).toHaveLength(2);
    expect(prompts[0]?.title).toBeTruthy();
  });
});
