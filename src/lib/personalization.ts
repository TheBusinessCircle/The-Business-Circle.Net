import { MembershipTier } from "@prisma/client";

export type PersonalisedRecommendation = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

type DashboardPersonalisationInput = {
  membershipTier: MembershipTier;
  profileCompletion: number;
  hasPosted: boolean;
  hasCommented: boolean;
  hasUpcomingEvent: boolean;
  recentChannelName?: string | null;
  recentChannelHref?: string | null;
  featuredDiscussionTitle?: string | null;
  featuredDiscussionHref?: string | null;
  featuredResourceTitle?: string | null;
  featuredResourceHref?: string | null;
};

type ResourcePersonalisationInput = {
  membershipTier: MembershipTier;
  profileCompletion: number;
  hasPosted: boolean;
  hasCommented: boolean;
  recommendedResourceTitle?: string | null;
  recommendedResourceHref?: string | null;
};

function tierExplorationCopy(tier: MembershipTier) {
  if (tier === MembershipTier.CORE) {
    return {
      title: "You have not explored the highest-value room fully yet",
      description:
        "Core works best when resources, strategy discussions, and the quieter private rooms are used together."
    };
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return {
      title: "There is more private context available on your tier",
      description:
        "Inner Circle becomes more useful when you return to the focused rooms and use the stronger signal there regularly."
    };
  }

  return {
    title: "You have not explored the full Foundation rhythm yet",
    description:
      "Foundation becomes more valuable when you use resources, community, and directory visibility together rather than one at a time."
  };
}

export function getDashboardPersonalisation(input: DashboardPersonalisationInput) {
  const basedOnActivity: PersonalisedRecommendation =
    !input.hasPosted && !input.hasCommented
      ? {
          eyebrow: "Based on your activity",
          title: "You have not contributed in community yet",
          description:
            "The easiest way to make the platform feel more relevant is to add one useful post or reply in the right room.",
          href: input.featuredDiscussionHref ?? "/community",
          label: input.featuredDiscussionHref ? "Join the discussion" : "Open community"
        }
      : input.recentChannelHref && input.recentChannelName
        ? {
            eyebrow: "Based on your activity",
            title: `You already have signal in ${input.recentChannelName}`,
            description:
              "Return to the room where you have already been active and keep the conversation compounding instead of starting from cold again.",
            href: input.recentChannelHref,
            label: "Return to that room"
          }
      : {
          eyebrow: "Based on your activity",
          title: "Your recent momentum points toward one clearer next move",
          description:
            "Keep using the strongest part of the platform first, then let the rest support it.",
          href: input.featuredDiscussionHref ?? "/community",
          label: input.featuredDiscussionHref ? "Open the current discussion" : "Open community"
        };

  const unexplored: PersonalisedRecommendation =
    input.profileCompletion < 80
      ? {
          eyebrow: "You have not explored this yet",
          title: "A fuller profile still makes the platform work harder for you",
          description:
            "Completion improves directory visibility, trust, and the quality of the conversations that start around your business.",
          href: "/profile",
          label: "Finish profile"
        }
      : input.hasUpcomingEvent
        ? {
          eyebrow: "You have not explored this yet",
          title: "Use the live layer more deliberately",
          description:
            "One event can create better context for the next conversation, introduction, or decision you need to make.",
          href: "/events",
          label: "Review events"
        }
        : {
            eyebrow: "You have not explored this yet",
            title: tierExplorationCopy(input.membershipTier).title,
            description: tierExplorationCopy(input.membershipTier).description,
            href:
              input.membershipTier === MembershipTier.FOUNDATION
                ? "/dashboard/resources"
                : "/inner-circle",
            label:
              input.membershipTier === MembershipTier.FOUNDATION
                ? "Use your tier more fully"
                : "Open private access"
          };

  return {
    basedOnActivity,
    unexplored
  };
}

export function getResourcePersonalisation(input: ResourcePersonalisationInput) {
  const basedOnActivity: PersonalisedRecommendation =
    !input.hasPosted && !input.hasCommented
      ? {
          eyebrow: "Based on your activity",
          title: "Read one resource, then bring one question into community",
          description:
            "The library works best when one useful idea moves directly into a discussion, not when reading stays isolated.",
          href: "/community",
          label: "Open community"
        }
      : {
          eyebrow: "Based on your activity",
          title: "Keep using the library as context for the next conversation",
          description:
            "Use one resource to sharpen your thinking, then take the stronger question or decision back into the room.",
          href: input.recommendedResourceHref ?? "/dashboard/resources",
          label: input.recommendedResourceHref ? "Read the next resource" : "Stay in resources"
        };

  const nextStep: PersonalisedRecommendation =
    input.profileCompletion < 80
      ? {
          eyebrow: "Good next step",
          title: "Strengthen your profile before you need the right introduction",
          description:
            "A clearer business profile helps the directory, discussions, and referrals carry better context around you.",
          href: "/profile",
          label: "Refine profile"
        }
      : input.membershipTier === MembershipTier.CORE
        ? {
            eyebrow: "Good next step",
            title: "Use Core resources around a live strategic question",
            description:
              "The strongest value comes when you read with one decision in mind, not as background material.",
            href: "/inner-circle",
            label: "Open Core access"
          }
        : input.membershipTier === MembershipTier.INNER_CIRCLE
          ? {
              eyebrow: "Good next step",
              title: "Bring stronger context into the private rooms",
              description:
                "Inner Circle resources become more valuable when they feed straight into more focused discussion.",
              href: "/inner-circle",
              label: "Open Inner Circle"
            }
          : {
              eyebrow: "Good next step",
              title: "Use Foundation to create one cleaner next move",
              description:
                "Choose one resource, one discussion, and one practical change rather than trying to consume too much at once.",
              href: input.recommendedResourceHref ?? "/dashboard/resources",
              label: input.recommendedResourceTitle ? "Read with intent" : "Browse the library"
            };

  return {
    basedOnActivity,
    nextStep
  };
}
