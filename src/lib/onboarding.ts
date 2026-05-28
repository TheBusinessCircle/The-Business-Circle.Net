import { MembershipTier } from "@prisma/client";

export type DashboardOnboardingAction = {
  title: string;
  description: string;
  href: string;
  label: string;
};

export type DashboardOnboardingChecklistItem = {
  title: string;
  description: string;
  href: string;
  label: string;
  complete: boolean;
  optional?: boolean;
};

export type DashboardOnboardingExperience = {
  eyebrow: string;
  title: string;
  description: string;
  emphasis: string;
  checklistTitle: string;
  checklistDescription: string;
  checklist: DashboardOnboardingChecklistItem[];
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
  hasAcceptedRules: boolean;
  hasAccentTheme: boolean;
  hasReadResource: boolean;
  hasBlueprintVote: boolean;
  activeDiscussionCount: number;
  contributingMemberCount: number;
  recentWinCount: number;
  featuredDiscussionHref?: string | null;
  featuredResourceHref?: string | null;
  showGrowthArchitectAccess?: boolean;
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
  const resourceHref = input.featuredResourceHref ?? "/dashboard/resources";
  const hasJoinedFirstDiscussion = input.hasPosted || input.hasCommented;
  const introductionsHref = "/community?channel=introductions";
  const communityHref = input.featuredDiscussionHref ?? (hasJoinedFirstDiscussion ? "/community" : introductionsHref);
  const checklist: DashboardOnboardingChecklistItem[] = [
    {
      title: "Accept BCN Rules",
      description: input.hasAcceptedRules
        ? "Rules accepted. Conversation access can open normally."
        : "Accept the standards that protect the room before normal member use.",
      href: "/profile#bcn-rules",
      label: input.hasAcceptedRules ? "Review rules" : "Accept rules",
      complete: input.hasAcceptedRules
    },
    {
      title: "Complete profile",
      description:
        input.profileCompletion >= 85
          ? "Your profile has enough context for stronger member discovery."
          : "Add the business context members need before they connect.",
      href: "/profile",
      label: input.profileCompletion >= 85 ? "Review profile" : "Complete profile",
      complete: input.profileCompletion >= 85
    },
    {
      title: "Choose accent theme",
      description: input.hasAccentTheme
        ? "Your member workspace theme has been chosen."
        : "Pick the accent that makes the workspace feel like yours.",
      href: "/profile",
      label: input.hasAccentTheme ? "Review theme" : "Choose theme",
      complete: input.hasAccentTheme
    },
    {
      title: "Visit Directory",
      description:
        "Open the directory once to understand who is already inside.",
      href: "/directory",
      label: "Open directory",
      complete: false
    },
    {
      title: hasJoinedFirstDiscussion ? "Return to the discussion rooms" : "Introduce yourself",
      description: hasJoinedFirstDiscussion
        ? "You have already posted or replied inside the Circle."
        : "Start by introducing yourself so other members can see who you are and what you are building.",
      href: hasJoinedFirstDiscussion ? communityHref : introductionsHref,
      label: hasJoinedFirstDiscussion ? "Return to discussion" : "Go to Introductions",
      complete: hasJoinedFirstDiscussion
    },
    {
      title: "View resources",
      description: input.hasReadResource
        ? "You have marked at least one resource as read."
        : "Open one resource and mark it as read when it has helped.",
      href: resourceHref,
      label: input.hasReadResource ? "Open resources" : "View resources",
      complete: input.hasReadResource
    },
    {
      title: "Vote on the Blueprint",
      description: input.hasBlueprintVote
        ? "Your Blueprint signal has been saved."
        : input.membershipTier === MembershipTier.FOUNDATION
          ? "Foundation can preview the Blueprint; voting opens in Inner Circle and Core."
          : "Cast one build signal to help shape what gets prioritised next.",
      href: "/blueprint",
      label: input.hasBlueprintVote ? "View Blueprint" : "Open Blueprint",
      complete: input.hasBlueprintVote,
      optional: input.membershipTier === MembershipTier.FOUNDATION
    }
  ];

  if (input.showGrowthArchitectAccess) {
    checklist.push({
      title: "Read Growth Architect access",
      description:
        "Review the member Growth Architect route before you need deeper support.",
      href: "/member/growth-architect",
      label: "Open access",
      complete: false,
      optional: true
    });
  }

  return {
    eyebrow: "Start here",
    title: tone.title,
    description: tone.description,
    emphasis: tone.emphasis,
    checklistTitle: "First-entry checklist",
    checklistDescription:
      "A simple path for the first visit, using the member progress BCN can confirm cleanly today.",
    checklist,
    actions: [
      {
        title:
          !input.hasPosted && !input.hasCommented
            ? "Introduce yourself first"
            : input.membershipTier === MembershipTier.FOUNDATION
            ? "Join one useful discussion"
            : input.membershipTier === MembershipTier.INNER_CIRCLE
              ? "Step into a more focused conversation"
              : "Open one strategic thread",
        description:
          !input.hasPosted && !input.hasCommented
            ? "Start in the introductions room so members can understand who you are, what you do and what you are building."
            : "Return to the room that already has the strongest signal for you.",
        href: communityHref,
        label: !input.hasPosted && !input.hasCommented ? "Go to Introductions" : "Return to discussion"
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
