import { MembershipTier } from "@prisma/client";

export type DashboardOnboardingAction = {
  title: string;
  description: string;
  href: string;
  label: string;
};

export type DashboardOnboardingExperience = {
  eyebrow: string;
  title: string;
  description: string;
  emphasis: string;
  actions: DashboardOnboardingAction[];
  profileTitle: string;
  profileDescription: string;
  profileBenefits: string[];
  profileHref: string;
  profileLabel: string;
  engagementTitle: string;
  engagementDescription: string;
  momentumTitle: string;
  momentumDescription: string;
  momentumItems: Array<{
    label: string;
    value: string;
    description: string;
  }>;
};

type DashboardOnboardingInput = {
  membershipTier: MembershipTier;
  profileCompletion: number;
  hasPosted: boolean;
  hasCommented: boolean;
  activeDiscussionCount: number;
  contributingMemberCount: number;
  recentWinCount: number;
  featuredDiscussionHref?: string | null;
  featuredResourceHref?: string | null;
};

function onboardingTone(tier: MembershipTier) {
  if (tier === MembershipTier.CORE) {
    return {
      title: "You are in the right place for the most strategic layer of the Circle",
      description:
        "Keep the first few minutes simple. Open one strategic thread, read one relevant resource, and let the room do its work around the real decision in front of you.",
      emphasis:
        "Core works best when you bring one serious question into a quieter, higher-trust room."
    };
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return {
      title: "You are in the right place for a more focused room",
      description:
        "Use the first few minutes to step into the stronger signal: one discussion, one useful resource, and a profile that gives people better context around you.",
      emphasis:
        "Inner Circle becomes valuable quickly when you use the focused rooms with clear intent."
    };
  }

  return {
    title: "You are in the right place to build inside a serious business environment",
    description:
      "Start calmly. Use one discussion, one structured resource, and a clearer profile to make the platform feel relevant without trying to do everything at once.",
    emphasis:
      "Foundation is designed to orient you quickly, then let the right parts of the ecosystem become useful in sequence."
  };
}

export function getDashboardOnboardingExperience(
  input: DashboardOnboardingInput
): DashboardOnboardingExperience {
  const tone = onboardingTone(input.membershipTier);
  const profileIncomplete = input.profileCompletion < 85;
  const communityHref = input.featuredDiscussionHref ?? "/community";
  const resourceHref = input.featuredResourceHref ?? "/dashboard/resources";

  return {
    eyebrow: "Start here",
    title: tone.title,
    description: tone.description,
    emphasis: tone.emphasis,
    actions: [
      {
        title:
          input.membershipTier === MembershipTier.FOUNDATION
            ? "Join one useful discussion"
            : input.membershipTier === MembershipTier.INNER_CIRCLE
              ? "Step into a more focused conversation"
              : "Open one strategic thread",
        description:
          !input.hasPosted && !input.hasCommented
            ? "Replying once is enough to make the platform feel more relevant."
            : "Return to the room that already has the strongest signal for you.",
        href: communityHref,
        label: !input.hasPosted && !input.hasCommented ? "Open discussion" : "Return to discussion"
      },
      {
        title: "Read one structured resource",
        description:
          "Use one relevant piece to sharpen thinking before you do anything heavier.",
        href: resourceHref,
        label: "Open resource"
      },
      {
        title: profileIncomplete ? "Complete your profile" : "Keep your profile sharp",
        description: profileIncomplete
          ? "A better profile improves relevance, trust, and the quality of introductions."
          : "A current profile helps the right members understand your focus quickly.",
        href: "/profile",
        label: profileIncomplete ? "Finish profile" : "Review profile"
      }
    ],
    profileTitle: "Why profile setup matters",
    profileDescription:
      "The stronger your profile is, the easier it is for the right people to understand what you do, where you are heading, and how they should engage with you.",
    profileBenefits: [
      "Better introductions and directory context",
      "More relevant conversations and recommendations",
      "Stronger trust before a conversation even starts"
    ],
    profileHref: "/profile",
    profileLabel: profileIncomplete ? "Complete profile now" : "Review profile",
    engagementTitle: "Low-pressure first move",
    engagementDescription:
      !input.hasPosted && !input.hasCommented
        ? "Start with a reply, not a perfect post. One useful response is enough to begin."
        : "Keep the first return simple. One reply or one reaction is often enough to re-enter the rhythm.",
    momentumTitle: "What is already moving around you",
    momentumDescription:
      "The Circle should feel alive quickly. These signals make the room visible without making it noisy.",
    momentumItems: [
      {
        label: "Active now",
        value: String(input.activeDiscussionCount),
        description: "Discussions already carrying current movement."
      },
      {
        label: "Members contributing",
        value: String(input.contributingMemberCount),
        description: "Recent visible contribution across the Circle."
      },
      {
        label: "Recent wins",
        value: String(input.recentWinCount),
        description: "Quiet proof that useful activity is turning into outcomes."
      }
    ]
  };
}
