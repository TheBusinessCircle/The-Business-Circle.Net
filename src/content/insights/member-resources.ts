import type { ResourceTier, ResourceType } from "@prisma/client";
import { PUBLIC_INSIGHTS } from "@/content/insights/public-insights";

export type MemberInsightBodySection = {
  heading: string;
  paragraphs: string[];
};

export type MemberInsightResource = {
  resourceSlug: string;
  linkedPublicInsightSlug: string;
  resourceTitle: string;
  resourceSummary: string;
  resourceCategory: string;
  resourceType: ResourceType;
  minimumTier: ResourceTier;
  publishedAt: string;
  readingTime: number;
  fullBodySections: MemberInsightBodySection[];
  actionSteps: string[];
  founderQuestions: string[];
  implementationChecklist: string[];
  practicalApplication: string;
  relatedResources: string[];
  suggestedRoomOrDiscussionPrompt: string;
  ctaLabel: string;
  ctaHref: string;
};

function tierName(tier: ResourceTier) {
  if (tier === "CORE") {
    return "Core";
  }

  if (tier === "INNER") {
    return "Inner Circle";
  }

  return "Foundation";
}

function tierDepth(tier: ResourceTier) {
  if (tier === "CORE") {
    return {
      strategy:
        "At Core level, treat this as a business architecture issue. Look across positioning, operating rhythm, visibility, decision flow and the dependencies that would make execution fragile.",
      nextStep:
        "Turn the insight into a short implementation roadmap with owners, sequencing, review signals and one decision that should be made before the next layer is added."
    };
  }

  if (tier === "INNER") {
    return {
      strategy:
        "At Inner Circle level, treat this as a strategic visibility, positioning or operating habit issue. Look at how the signal shows up across conversations, public presence and the owner's weekly rhythm.",
      nextStep:
        "Turn the insight into one focused improvement, then use the relevant room or discussion prompt to test the decision with better context."
    };
  }

  return {
    strategy:
      "At Foundation level, treat this as a clarity issue first. The job is to see the pattern, remove unnecessary noise and choose one practical action that improves the week.",
    nextStep:
      "Turn the insight into one clear review question, one small action and one point to revisit before the end of the week."
  };
}

function buildActionSteps(title: string, category: string, tier: ResourceTier) {
  const depth = tierDepth(tier);

  return [
    `Write the issue in one sentence using this frame: ${title}.`,
    `List where this shows up in the business right now, especially across decisions, conversations, visibility and delivery.`,
    "Separate facts from interpretation so the owner can see what is known, what is assumed and what still needs testing.",
    depth.nextStep,
    `Choose one owner-level action that would make ${category.toLowerCase()} clearer within the next seven days.`
  ];
}

function buildFounderQuestions(title: string, category: string) {
  return [
    `Where is ${title.toLowerCase()} already visible in the business?`,
    "What part of this issue keeps returning even when the surface problem changes?",
    "What is the owner currently carrying that should be made clearer, shared or structured?",
    `Which decision would become easier if ${category.toLowerCase()} had a cleaner signal?`,
    "What would a calmer, more serious room help the owner see before acting?"
  ];
}

function buildChecklist(category: string, tier: ResourceTier) {
  const tierLabel = tierName(tier);

  return [
    "The real signal has been named in plain language.",
    "The owner has separated urgency from importance.",
    "The next action is small enough to complete and meaningful enough to matter.",
    "The business knows what will be reviewed next.",
    `The action fits the ${tierLabel} level of depth and does not expose higher-tier material to lower tiers.`,
    `The ${category.toLowerCase()} lesson has been connected to one relevant conversation, page, resource or operating habit.`
  ];
}

export const MEMBER_INSIGHT_RESOURCES: MemberInsightResource[] = PUBLIC_INSIGHTS.map((insight) => {
  const tierLabel = tierName(insight.minimumTier);
  const depth = tierDepth(insight.minimumTier);
  const relatedResources = insight.relatedInsightSlugs.map((slug) => `insight-resource-${slug}`);

  return {
    resourceSlug: insight.memberResourceSlug,
    linkedPublicInsightSlug: insight.slug,
    resourceTitle: `${insight.title}: full member resource`,
    resourceSummary: `A ${tierLabel} member resource expanding the public insight into practical action, founder questions, implementation guidance and a clearer next step.`,
    resourceCategory: insight.category,
    resourceType: insight.resourceType,
    minimumTier: insight.minimumTier,
    publishedAt: insight.publishedAt,
    readingTime: insight.readingTime + 5,
    fullBodySections: [
      {
        heading: "Full explanation",
        paragraphs: [
          insight.aeoSummary,
          `The public version names the signal. Inside membership, the work is to connect that signal to the actual decisions, conversations and operating habits around the owner.`,
          depth.strategy
        ]
      },
      {
        heading: "Why it matters",
        paragraphs: [
          `This matters because ${insight.category.toLowerCase()} affects how the business is read by the owner, the team, the market and the room around it.`,
          "When the issue stays vague, the owner can end up treating symptoms as strategy. That creates more activity without improving judgement.",
          "The member version slows the issue down enough to make it practical, then turns it back into movement."
        ]
      },
      {
        heading: "What to do next",
        paragraphs: [
          "Start by identifying where the pattern appears most clearly. Do not try to fix every related issue at once.",
          "Then decide what would make the next conversation, public signal, operating rhythm or owner decision cleaner.",
          depth.nextStep
        ]
      }
    ],
    actionSteps: buildActionSteps(insight.title, insight.category, insight.minimumTier),
    founderQuestions: buildFounderQuestions(insight.title, insight.category),
    implementationChecklist: buildChecklist(insight.category, insight.minimumTier),
    practicalApplication: `Use this resource as a working note. Read it once for the signal, then use the questions and checklist to decide what should change in the business this week. The aim is not to consume more content. The aim is to make ${insight.category.toLowerCase()} clearer in practice.`,
    relatedResources,
    suggestedRoomOrDiscussionPrompt: `Where are you seeing this inside your business right now, and what context would help the room give you a more useful response?`,
    ctaLabel: "Open the relevant member discussion",
    ctaHref: "/community"
  };
});

export const MEMBER_INSIGHT_RESOURCE_COUNT = MEMBER_INSIGHT_RESOURCES.length;
