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

export type FounderAuditResult = {
  tierSlug: "foundation" | "inner-circle" | "core";
  tierName: "Foundation" | "Inner Circle" | "Core";
  phase: "Foundation phase" | "Momentum phase" | "Core phase";
  headline: string;
  summary: string;
  tierFit: string;
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

export const FOUNDER_AUDIT_RESULTS = {
  foundation: {
    tierSlug: "foundation",
    tierName: "Foundation",
    phase: "Foundation phase",
    headline: "You are in the Foundation phase",
    summary:
      "You are not short on effort. The main gap is structure, clarity, and the right environment around you.",
    tierFit:
      "Foundation is the strongest starting point because it gives you access to the room, the resources, and the structure needed to stop building in isolation.",
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
    tierFit:
      "Inner Circle is your strongest fit because you are past needing basic direction. You need better rooms, better conversations, and stronger momentum.",
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
    tierFit:
      "Core is your strongest fit because you are ready for the deeper rooms, stronger access, and more focused business environment inside The Business Circle.",
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
