export const WEEKLY_CONVERSATION_STARTER =
  "What is one thing in your business you are trying to make clearer right now?";

export type FirstThreeMovesInput = {
  hasIntroduced: boolean;
  hasStartedUsefulPost: boolean;
  hasSupportedAnotherMember: boolean;
  introductionsHref?: string;
  startPostHref?: string;
  exploreHref?: string | null;
};

export type FirstThreeMove = {
  title: string;
  description: string;
  href: string;
  label: string;
  complete: boolean;
};

export type FirstThreeMovesActivation = {
  title: string;
  description: string;
  completedCount: number;
  isComplete: boolean;
  weeklyPrompt: string;
  steps: FirstThreeMove[];
};

export function buildFirstThreeMovesActivation(
  input: FirstThreeMovesInput
): FirstThreeMovesActivation {
  const introductionsHref = input.introductionsHref ?? "/community?channel=introductions";
  const startPostHref = input.startPostHref ?? "/community?channel=general-chat#start-community-post";
  const exploreHref = input.exploreHref ?? "/community?channel=introductions";

  const steps: FirstThreeMove[] = [
    {
      title: "Introduce yourself",
      description:
        "Let other members quickly understand who you are, what you do and what kind of connections would be useful.",
      href: introductionsHref,
      label: "Go to Introductions",
      complete: input.hasIntroduced
    },
    {
      title: "Start one useful conversation",
      description:
        "Ask for feedback, share something you are working on, or post a small business question.",
      href: startPostHref,
      label: "Start a post",
      complete: input.hasStartedUsefulPost
    },
    {
      title: "Look for one person to support",
      description:
        "BCN works best when members do not just wait to be seen. Find one post, intro or question where you can add a useful thought.",
      href: exploreHref,
      label: "Explore the room",
      complete: input.hasSupportedAnotherMember
    }
  ];
  const completedCount = steps.filter((step) => step.complete).length;

  return {
    title: "Your First 3 Moves Inside BCN",
    description:
      "A calm way to begin. BCN grows through useful conversation, not passive browsing, so these first moves help the room understand you and give you somewhere sensible to start.",
    completedCount,
    isComplete: completedCount === steps.length,
    weeklyPrompt: WEEKLY_CONVERSATION_STARTER,
    steps
  };
}
