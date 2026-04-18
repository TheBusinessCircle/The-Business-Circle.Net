import { describe, expect, it } from "vitest";
import { MembershipTier } from "@prisma/client";
import { BCN_UPDATES_CHANNEL_SLUG, getCommunityChannelBlueprintBySlug } from "@/config/community";

describe("community channel configuration", () => {
  it("exposes BCN Updates as a Foundation-visible curated lane", () => {
    const channel = getCommunityChannelBlueprintBySlug(BCN_UPDATES_CHANNEL_SLUG);

    expect(channel).toMatchObject({
      slug: BCN_UPDATES_CHANNEL_SLUG,
      accessTier: MembershipTier.FOUNDATION,
      allowMemberPosts: false,
      isAutomatedFeed: true,
      allowAutomatedPrompts: false
    });
  });
});
