export type FounderAuditScore = 1 | 2 | 3;

export type FounderAuditAnswer = {
  label: string;
  score: FounderAuditScore;
};

export type FounderAuditQuestion = {
  id: string;
  question: string;
  answers: readonly FounderAuditAnswer[];
};

export type FounderAuditCategory =
  | "Direction"
  | "Structure"
  | "Decision-making"
  | "Environment"
  | "Momentum"
  | "Visibility"
  | "Support"
  | "Growth readiness"
  | "Collaboration"
  | "Owner pressure";

export type FounderAuditBottleneck = {
  questionId: string;
  category: FounderAuditCategory;
  score: number;
  signal: string;
};

export type FounderAuditResult = {
  tierSlug: "foundation" | "inner-circle" | "core";
  tierName: "Foundation" | "Inner Circle" | "Core";
  phase: "Foundation phase" | "Momentum phase" | "Core phase";
  headline: string;
  summary: string;
  phaseRisk: string;
  tierFit: string;
  roomChange: string;
  firstSevenDays: readonly string[];
  primaryCta: string;
  membershipHref: string;
};

export const FOUNDER_AUDIT_QUESTIONS = [
  {
    id: "direction",
    question: "How clear is your current direction in business?",
    answers: [
      { label: "I know exactly where I am going and why", score: 3 },
      { label: "I have direction, but there are still gaps", score: 2 },
      { label: "I am working hard, but the direction feels unclear", score: 1 }
    ]
  },
  {
    id: "structure",
    question: "If someone looked at your business today, how structured would it feel?",
    answers: [
      { label: "Clear, intentional, and well organised", score: 3 },
      { label: "Functional, but some parts feel messy", score: 2 },
      { label: "Mostly held together day by day", score: 1 }
    ]
  },
  {
    id: "decisions",
    question: "How confident are you when making business decisions?",
    answers: [
      { label: "Confident, because I have enough clarity and context", score: 3 },
      { label: "Usually confident, but I still second-guess important moves", score: 2 },
      { label: "I often feel like I am deciding in isolation", score: 1 }
    ]
  },
  {
    id: "circle",
    question: "Who are you regularly around when it comes to business growth?",
    answers: [
      { label: "Other serious business owners and operators", score: 3 },
      { label: "A mixed group, but not always the right conversations", score: 2 },
      { label: "Mostly myself", score: 1 }
    ]
  },
  {
    id: "momentum",
    question: "Does your business currently feel like it is moving forward?",
    answers: [
      { label: "Yes, there is clear progress and momentum", score: 3 },
      { label: "Some progress, but it is inconsistent", score: 2 },
      { label: "It feels more reactive than progressive", score: 1 }
    ]
  },
  {
    id: "market-clarity",
    question: "How clear is your business to the outside world?",
    answers: [
      { label: "People understand what I do and why it matters", score: 3 },
      { label: "Some people get it, but the message could be sharper", score: 2 },
      { label: "I know it needs to be clearer", score: 1 }
    ]
  },
  {
    id: "challenge-support",
    question: "When you face a business challenge, what usually happens?",
    answers: [
      { label: "I have trusted people I can speak to", score: 3 },
      { label: "I can sometimes get input, but it is not consistent", score: 2 },
      { label: "I usually have to figure it out alone", score: 1 }
    ]
  },
  {
    id: "opportunity-readiness",
    question: "If the right opportunity appeared, would your business be ready to handle it?",
    answers: [
      { label: "Yes, I am ready for bigger opportunities", score: 3 },
      { label: "Partly, but I would need more structure", score: 2 },
      { label: "Not yet, I still need to stabilise things first", score: 1 }
    ]
  },
  {
    id: "network-opportunity",
    question: "How often do meaningful business opportunities come through your current network?",
    answers: [
      { label: "Regularly, through strong relationships", score: 3 },
      { label: "Occasionally, but not consistently", score: 2 },
      { label: "Rarely or not at all", score: 1 }
    ]
  },
  {
    id: "current-reality",
    question: "Which statement feels closest to your current reality?",
    answers: [
      {
        label: "I am building with control, clarity, and the right conversations around me",
        score: 3
      },
      {
        label: "I am making progress, but I know the right environment would sharpen things",
        score: 2
      },
      {
        label: "I am carrying too much alone and need better structure around me",
        score: 1
      }
    ]
  }
] as const satisfies readonly FounderAuditQuestion[];

type FounderAuditQuestionId = (typeof FOUNDER_AUDIT_QUESTIONS)[number]["id"];

export const FOUNDER_AUDIT_CATEGORY_MAP = {
  direction: {
    category: "Direction",
    signal:
      "The next move is not specific enough yet, so effort can scatter across too many priorities."
  },
  structure: {
    category: "Structure",
    signal:
      "The business may be working, but too much of the operating rhythm is being held by memory and pressure."
  },
  decisions: {
    category: "Decision-making",
    signal:
      "Important decisions may be happening without enough context, comparison, or calm outside perspective."
  },
  circle: {
    category: "Environment",
    signal:
      "The people and conversations around the business are not consistently sharpening the work."
  },
  momentum: {
    category: "Momentum",
    signal:
      "Progress is showing up in bursts, but the business has not created a stable rhythm of movement."
  },
  "market-clarity": {
    category: "Visibility",
    signal:
      "The outside market may not understand the offer clearly enough to respond with confidence."
  },
  "challenge-support": {
    category: "Support",
    signal:
      "Too many challenges are being processed alone, which slows clarity and increases founder load."
  },
  "opportunity-readiness": {
    category: "Growth readiness",
    signal:
      "The business may not yet be ready to absorb better opportunities without creating strain."
  },
  "network-opportunity": {
    category: "Collaboration",
    signal:
      "Your current network is not reliably creating useful opportunities, introductions, or feedback."
  },
  "current-reality": {
    category: "Owner pressure",
    signal:
      "The owner is carrying too much of the structure, pace, and decision weight personally."
  }
} as const satisfies Record<
  FounderAuditQuestionId,
  {
    category: FounderAuditCategory;
    signal: string;
  }
>;

export const FOUNDER_AUDIT_RESULTS = {
  foundation: {
    tierSlug: "foundation",
    tierName: "Foundation",
    phase: "Foundation phase",
    headline: "You are in the Foundation phase",
    summary:
      "You are not short on effort. The main gap is structure, clarity, and the right environment around you.",
    phaseRisk:
      "Staying here without the right room can keep the business asking for more effort before it has enough direction, structure, or useful outside context.",
    tierFit:
      "Foundation is the strongest starting point because it gives you access to the room, the resources, and the structure needed to stop building in isolation.",
    roomChange:
      "You move from carrying the business alone to having a calmer member base, practical resources, and a clearer place to ask the next question.",
    firstSevenDays: [
      "Complete your profile so the room understands the business quickly.",
      "Use the starting resources to name the main constraint.",
      "Join one discussion and vote on the Blueprint so your first action is visible."
    ],
    primaryCta: "Continue with Foundation",
    membershipHref: "/membership?tier=foundation&source=audit"
  },
  innerCircle: {
    tierSlug: "inner-circle",
    tierName: "Inner Circle",
    phase: "Momentum phase",
    headline: "You are in the Momentum phase",
    summary:
      "You have movement, but your next level will come from sharper conversations, better perspective, and more consistent strategic input.",
    phaseRisk:
      "Staying here without the right room can turn progress into stop-start momentum, where useful weeks are followed by drift, second-guessing, and avoidable delay.",
    tierFit:
      "Inner Circle is your strongest fit because you are past needing basic direction. You need better rooms, better conversations, and stronger momentum.",
    roomChange:
      "You get closer to the conversations, rooms, and member context that help turn existing movement into a cleaner rhythm.",
    firstSevenDays: [
      "Set your profile and context so introductions start from the right place.",
      "Enter the most relevant room and bring one live business question.",
      "Use resources and discussion feedback to decide the next focused move."
    ],
    primaryCta: "Continue with Inner Circle",
    membershipHref: "/membership?tier=inner-circle&source=audit"
  },
  core: {
    tierSlug: "core",
    tierName: "Core",
    phase: "Core phase",
    headline: "You are in the Core phase",
    summary:
      "You already have direction and momentum. The opportunity now is to operate around serious owners, sharper opportunities, and higher-level conversations.",
    phaseRisk:
      "Staying here without a sharper room can leave opportunity ahead of perspective, with bigger decisions still being made without enough senior context around them.",
    tierFit:
      "Core is your strongest fit because you are ready for the deeper rooms, stronger access, and more focused business environment inside The Business Circle.",
    roomChange:
      "You enter the highest-signal member environment, where owner-level conversations, collaboration, and Growth Architect access can support bigger decisions.",
    firstSevenDays: [
      "Complete your profile with enough context for serious owner-level matching.",
      "Review Growth Architect access and identify the highest-leverage support route.",
      "Join a deeper room, contribute to the Blueprint, and surface one strategic opportunity."
    ],
    primaryCta: "Continue with Core",
    membershipHref: "/membership?tier=core&source=audit"
  }
} as const satisfies Record<string, FounderAuditResult>;

export function calculateFounderAuditScore(scores: readonly number[]) {
  return scores.reduce((total, score) => total + score, 0);
}

export function getFounderAuditRecommendation(score: number): FounderAuditResult {
  if (score <= 15) {
    return FOUNDER_AUDIT_RESULTS.foundation;
  }

  if (score <= 23) {
    return FOUNDER_AUDIT_RESULTS.innerCircle;
  }

  return FOUNDER_AUDIT_RESULTS.core;
}

export function getFounderAuditBottleneck(
  answers: readonly (number | undefined)[]
): FounderAuditBottleneck {
  let lowest: FounderAuditBottleneck | null = null;

  FOUNDER_AUDIT_QUESTIONS.forEach((question, index) => {
    const score = answers[index];

    if (typeof score !== "number") {
      return;
    }

    const category = FOUNDER_AUDIT_CATEGORY_MAP[question.id];
    const candidate: FounderAuditBottleneck = {
      questionId: question.id,
      category: category.category,
      score,
      signal: category.signal
    };

    if (!lowest || candidate.score < lowest.score) {
      lowest = candidate;
    }
  });

  if (lowest) {
    return lowest;
  }

  const fallback = FOUNDER_AUDIT_CATEGORY_MAP.direction;

  return {
    questionId: "direction",
    category: fallback.category,
    score: 0,
    signal: fallback.signal
  };
}
