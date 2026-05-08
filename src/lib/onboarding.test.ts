import { MembershipTier } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getDashboardOnboardingExperience } from "@/lib/onboarding";

describe("dashboard onboarding checklist", () => {
  it("builds the first-entry checklist from existing member signals", () => {
    const experience = getDashboardOnboardingExperience({
      membershipTier: MembershipTier.INNER_CIRCLE,
      profileCompletion: 90,
      hasPosted: false,
      hasCommented: true,
      hasAcceptedRules: true,
      hasAccentTheme: true,
      hasReadResource: false,
      hasBlueprintVote: true,
      activeDiscussionCount: 2,
      contributingMemberCount: 1,
      recentWinCount: 0,
      featuredDiscussionHref: "/community/post/post_1",
      featuredResourceHref: "/dashboard/resources/resource-1",
      showGrowthArchitectAccess: true
    });

    expect(experience.checklist.map((item) => item.title)).toEqual([
      "Accept BCN Rules",
      "Complete profile",
      "Choose accent theme",
      "Visit Directory",
      "Join first discussion",
      "View resources",
      "Vote on the Blueprint",
      "Read Growth Architect access"
    ]);
    expect(experience.checklist.find((item) => item.title === "Accept BCN Rules")?.complete).toBe(true);
    expect(experience.checklist.find((item) => item.title === "View resources")?.complete).toBe(false);
  });
});
