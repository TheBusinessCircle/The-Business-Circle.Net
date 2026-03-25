import { MembershipTier } from "@prisma/client";

type MemberHomeNextActionInput = {
  completionPercentage: number;
  membershipTier: MembershipTier;
  hasRecentDiscussion: boolean;
  hasUpcomingEvent: boolean;
};

export function getMemberHomeNextAction(input: MemberHomeNextActionInput) {
  if (input.completionPercentage < 80) {
    return {
      eyebrow: "Next best move",
      title: "Complete the profile members can rely on",
      description:
        "A clear profile improves directory visibility and gives the right people more confidence to start a useful conversation.",
      href: "/profile",
      label: "Finish profile"
    };
  }

  if (!input.hasRecentDiscussion) {
    return {
      eyebrow: "Next best move",
      title: "Open the community and add one thoughtful post",
      description:
        "The fastest way to settle in here is to contribute something useful in the right room.",
      href: "/community",
      label: "Open community"
    };
  }

  if (input.hasUpcomingEvent) {
    return {
      eyebrow: "Next best move",
      title: "Use the next event as a practical point of connection",
      description:
        "Live sessions work best when you arrive with one question, one introduction target, or one decision you want to move forward.",
      href: "/events",
      label: "Review events"
    };
  }

  if (input.membershipTier === MembershipTier.FOUNDATION) {
    return {
      eyebrow: "Next best move",
      title: "Use Foundation fully before deciding whether to go deeper",
      description:
        "Use the resource hub, participate in discussion, and approach the directory with more intent before making your next membership decision.",
      href: "/dashboard/resources",
      label: "Open resource hub"
    };
  }

  return {
    eyebrow: "Next best move",
    title: "Stay close to the parts of the ecosystem that compound",
    description:
      "Keep using resources, discussions, and events together so relationships and decisions keep building on each other.",
    href: "/dashboard/resources",
    label: "Continue in resources"
  };
}

export function getTierHomeGuidance(tier: MembershipTier) {
  if (tier === MembershipTier.CORE) {
    return {
      title: "Core gives you the calmest room and the highest strategic proximity.",
      description:
        "Use it for sharper decisions, deeper discussion, and the moments where better judgement matters more than more information."
    };
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return {
      title: "Inner Circle is where the ecosystem becomes more focused.",
      description:
        "Use the private layers for more nuanced discussion, stronger signal, and a steadier rhythm around your next phase."
    };
  }

  return {
    title: "Foundation is your base inside the ecosystem.",
    description:
      "Use it to build momentum through resources, community, events, and trusted introductions before deciding whether you need deeper access."
  };
}
