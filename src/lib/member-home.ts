import { MembershipTier } from "@prisma/client";

type MemberHomeNextActionInput = {
  completionPercentage: number;
  membershipTier: MembershipTier;
  hasRecentDiscussion: boolean;
  hasUpcomingEvent: boolean;
  hasPosted?: boolean;
  hasCommented?: boolean;
  hasClearOffer?: boolean;
  hasClearAsk?: boolean;
  hasReadResource?: boolean;
  hasTrustSignal?: boolean;
  hasSharedWin?: boolean;
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

  if (!input.hasClearOffer) {
    return {
      eyebrow: "Next best move",
      title: "Share one clear offer",
      description:
        "Tell the room what you can help with so useful introductions and collaboration opportunities have something specific to attach to.",
      href: "/profile",
      label: "Add your offer"
    };
  }

  if (!input.hasClearAsk) {
    return {
      eyebrow: "Next best move",
      title: "Post one clear ask",
      description:
        "A clear ask helps the room help you faster. Keep it practical, specific and easy for another owner to respond to.",
      href: "/profile",
      label: "Add your ask"
    };
  }

  if (!input.hasPosted) {
    return {
      eyebrow: "Next best move",
      title: "Introduce yourself properly",
      description:
        "The fastest way to settle in is to make one thoughtful introduction with enough context for other owners to understand you.",
      href: "/community",
      label: "Open community"
    };
  }

  if (!input.hasCommented && input.hasRecentDiscussion) {
    return {
      eyebrow: "Next best move",
      title: "Join one useful conversation",
      description:
        "Reply once where you can add context, encouragement or a practical lesson. BCN becomes more valuable as useful signal is added.",
      href: "/community",
      label: "Find a conversation"
    };
  }

  if (!input.hasReadResource) {
    return {
      eyebrow: "Next best move",
      title: "Browse the latest insight before your next decision",
      description:
        "Use one structured resource to sharpen your thinking, then bring the useful part back into the room.",
      href: "/dashboard/resources",
      label: "Open resources"
    };
  }

  if (!input.hasTrustSignal) {
    return {
      eyebrow: "Next best move",
      title: "Add one trust signal to your profile",
      description:
        "A stronger trust profile helps other owners understand who you are, what you do and why a conversation may be worthwhile.",
      href: "/profile",
      label: "Strengthen profile"
    };
  }

  if (!input.hasSharedWin) {
    return {
      eyebrow: "Next best move",
      title: "Share one useful lesson or win from this week",
      description:
        "Short, specific progress helps the room learn what is moving and gives other owners a better reason to engage.",
      href: "/wins/new",
      label: "Share a win"
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
