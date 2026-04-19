import { describe, expect, it } from "vitest";
import { MembershipTier } from "@prisma/client";
import {
  BCN_UPDATES_CHANNEL_SLUG,
  BCN_UPDATES_MEMBER_ROUTE,
  getCommunityChannelBlueprintBySlug,
  getStandaloneCommunityChannelPath,
  isStandaloneCommunityChannelSlug
} from "@/config/community";

describe("community channel configuration", () => {
  it("exposes BCN Updates as a Foundation-visible curated lane", () => {
    const channel = getCommunityChannelBlueprintBySlug(BCN_UPDATES_CHANNEL_SLUG);

    expect(channel).toMatchObject({
      slug: BCN_UPDATES_CHANNEL_SLUG,
      accessTier: MembershipTier.FOUNDATION,
      allowMemberPosts: false,
      isAutomatedFeed: true,
      allowAutomatedPrompts: false,
      standalonePath: BCN_UPDATES_MEMBER_ROUTE
    });
  });

  it("marks BCN Updates as a standalone destination outside the main community room list", () => {
    expect(isStandaloneCommunityChannelSlug(BCN_UPDATES_CHANNEL_SLUG)).toBe(true);
    expect(getStandaloneCommunityChannelPath(BCN_UPDATES_CHANNEL_SLUG)).toBe(
      BCN_UPDATES_MEMBER_ROUTE
    );
    expect(isStandaloneCommunityChannelSlug("introductions")).toBe(false);
  });
});
