import { MembershipTier } from "@prisma/client";

export type CommunityQuietPrompt = {
  id: string;
  tier: MembershipTier;
  title: string;
  prompt: string;
  channelSlugs: string[];
  type: "reflection" | "strategy" | "operations" | "visibility" | "connections" | "momentum";
  cooldownDays: number;
  active: boolean;
};

export const COMMUNITY_PROMPT_WEEKLY_LIMIT = 3;
export const COMMUNITY_PROMPT_MIN_HOURS_BETWEEN_POSTS = 48;
export const COMMUNITY_PROMPT_RECENT_FOUNDER_POST_HOURS = 72;
export const COMMUNITY_PROMPT_INACTIVITY_HOURS_BY_TIER: Record<MembershipTier, number> = {
  FOUNDATION: 24 * 7,
  INNER_CIRCLE: 24 * 9,
  CORE: 24 * 10
};

export const COMMUNITY_QUIET_PROMPTS: CommunityQuietPrompt[] = [
  {
    id: "foundation-fix-keeps-waiting",
    tier: MembershipTier.FOUNDATION,
    title: "Question for the room",
    prompt: "What is something in the business you know needs fixing, but it keeps getting pushed back?",
    channelSlugs: ["business-support", "general-chat"],
    type: "operations",
    cooldownDays: 28,
    active: true
  },
  {
    id: "foundation-taking-longer",
    tier: MembershipTier.FOUNDATION,
    title: "Worth discussing",
    prompt: "What has taken more time than expected in the business so far?",
    channelSlugs: ["general-chat", "wins-and-progress"],
    type: "reflection",
    cooldownDays: 28,
    active: true
  },
  {
    id: "foundation-one-focus-week",
    tier: MembershipTier.FOUNDATION,
    title: "This week's focus",
    prompt: "If you had to simplify the business down to one focus this week, what would it be?",
    channelSlugs: ["wins-and-progress", "general-chat"],
    type: "momentum",
    cooldownDays: 21,
    active: true
  },
  {
    id: "foundation-what-working-on-now",
    tier: MembershipTier.FOUNDATION,
    title: "What are you working on right now?",
    prompt: "What are you working on right now that would benefit from a clearer conversation this week?",
    channelSlugs: ["general-chat", "wins-and-progress"],
    type: "momentum",
    cooldownDays: 21,
    active: true
  },
  {
    id: "foundation-where-stuck",
    tier: MembershipTier.FOUNDATION,
    title: "Where are you stuck?",
    prompt: "Where are you stuck right now: demand, delivery, operations, confidence, or a decision that needs better thinking?",
    channelSlugs: ["business-support", "general-chat"],
    type: "operations",
    cooldownDays: 21,
    active: true
  },
  {
    id: "foundation-improve-this-week",
    tier: MembershipTier.FOUNDATION,
    title: "What are you trying to improve this week?",
    prompt: "What are you trying to improve this week, and what would make progress feel meaningful by Friday?",
    channelSlugs: ["wins-and-progress", "general-chat"],
    type: "strategy",
    cooldownDays: 21,
    active: true
  },
  {
    id: "foundation-not-clicking",
    tier: MembershipTier.FOUNDATION,
    title: "Open question",
    prompt: "Where do you feel things are not quite clicking right now?",
    channelSlugs: ["business-support", "general-chat"],
    type: "reflection",
    cooldownDays: 28,
    active: true
  },
  {
    id: "foundation-recent-change-helped",
    tier: MembershipTier.FOUNDATION,
    title: "Share what worked",
    prompt: "What is one change you made recently that actually improved something important?",
    channelSlugs: ["wins-and-progress", "general-chat"],
    type: "momentum",
    cooldownDays: 21,
    active: true
  },
  {
    id: "foundation-clarity-needed",
    tier: MembershipTier.FOUNDATION,
    title: "Clearer thinking",
    prompt: "What part of the business needs more clarity before you can move properly?",
    channelSlugs: ["general-chat", "business-support"],
    type: "strategy",
    cooldownDays: 28,
    active: true
  },
  {
    id: "foundation-conversation-avoiding",
    tier: MembershipTier.FOUNDATION,
    title: "Something worth naming",
    prompt: "What conversation do you keep avoiding because you are not sure how to handle it yet?",
    channelSlugs: ["general-chat", "collaboration"],
    type: "reflection",
    cooldownDays: 28,
    active: true
  },
  {
    id: "foundation-simple-improvement",
    tier: MembershipTier.FOUNDATION,
    title: "Simple improvement",
    prompt: "What is one small improvement that would make the business feel easier to run next month?",
    channelSlugs: ["business-support", "marketing"],
    type: "operations",
    cooldownDays: 21,
    active: true
  },
  {
    id: "foundation-bottleneck-now",
    tier: MembershipTier.FOUNDATION,
    title: "Current bottleneck",
    prompt: "What feels like the main bottleneck in the business right now: demand, delivery, time, confidence, or something else?",
    channelSlugs: ["business-support", "general-chat"],
    type: "operations",
    cooldownDays: 21,
    active: true
  },
  {
    id: "foundation-assumption-testing",
    tier: MembershipTier.FOUNDATION,
    title: "Worth testing",
    prompt: "What assumption are you currently making about your market that you probably need to test properly?",
    channelSlugs: ["marketing", "general-chat"],
    type: "visibility",
    cooldownDays: 28,
    active: true
  },
  {
    id: "foundation-easier-than-expected",
    tier: MembershipTier.FOUNDATION,
    title: "A useful surprise",
    prompt: "What has been easier than expected once you actually committed to it?",
    channelSlugs: ["wins-and-progress", "general-chat"],
    type: "reflection",
    cooldownDays: 28,
    active: true
  },
  {
    id: "foundation-hardest-part",
    tier: MembershipTier.FOUNDATION,
    title: "Founders only know this",
    prompt: "What has been the hardest part of carrying responsibility in the business that people outside it would not see?",
    channelSlugs: ["introductions", "general-chat"],
    type: "reflection",
    cooldownDays: 35,
    active: true
  },
  {
    id: "foundation-repeat-task",
    tier: MembershipTier.FOUNDATION,
    title: "Operational question",
    prompt: "What are you still doing manually every week that probably needs a better system around it?",
    channelSlugs: ["business-support"],
    type: "operations",
    cooldownDays: 21,
    active: true
  },
  {
    id: "foundation-need-intro",
    tier: MembershipTier.FOUNDATION,
    title: "Connection request",
    prompt: "Who or what kind of business would be genuinely useful for you to be introduced to right now?",
    channelSlugs: ["collaboration"],
    type: "connections",
    cooldownDays: 28,
    active: true
  },
  {
    id: "foundation-useful-connection-happened",
    tier: MembershipTier.FOUNDATION,
    title: "A useful connection",
    prompt: "Has anything useful come from a connection here yet, whether it was a conversation, an idea, or a collaboration you did not expect?",
    channelSlugs: ["wins-and-progress", "collaboration"],
    type: "connections",
    cooldownDays: 28,
    active: true
  },
  {
    id: "foundation-what-improved-recently",
    tier: MembershipTier.FOUNDATION,
    title: "What has improved recently?",
    prompt: "What has improved for you recently, and what changed to make that shift possible?",
    channelSlugs: ["wins-and-progress", "general-chat"],
    type: "reflection",
    cooldownDays: 21,
    active: true
  },
  {
    id: "foundation-stop-doing",
    tier: MembershipTier.FOUNDATION,
    title: "A cleaner week",
    prompt: "What would you stop doing this week if you were forced to protect time for the most important work?",
    channelSlugs: ["wins-and-progress", "business-support"],
    type: "momentum",
    cooldownDays: 21,
    active: true
  },
  {
    id: "inner-circle-pricing-confidence",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Inner Circle question",
    prompt: "Where are you still under-confident in pricing, even though the business probably needs firmer decisions there?",
    channelSlugs: ["inner-circle-chat", "founder-strategy"],
    type: "strategy",
    cooldownDays: 28,
    active: true
  },
  {
    id: "inner-circle-sales-leak",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Sales reality check",
    prompt: "What part of the sales process feels less repeatable than it should be right now?",
    channelSlugs: ["inner-circle-chat", "founder-strategy"],
    type: "operations",
    cooldownDays: 21,
    active: true
  },
  {
    id: "inner-circle-offer-focus",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Offer focus",
    prompt: "What part of the offer is still too broad, too unclear, or too hard to explain quickly?",
    channelSlugs: ["inner-circle-chat", "founder-strategy"],
    type: "strategy",
    cooldownDays: 21,
    active: true
  },
  {
    id: "inner-circle-capacity",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Capacity question",
    prompt: "Where is capacity starting to get stretched in a way that could quietly affect quality?",
    channelSlugs: ["inner-circle-chat"],
    type: "operations",
    cooldownDays: 21,
    active: true
  },
  {
    id: "inner-circle-lead-quality",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Lead quality",
    prompt: "Are you attracting enough of the right demand, or are you still spending too much time filtering poor-fit leads?",
    channelSlugs: ["inner-circle-chat"],
    type: "visibility",
    cooldownDays: 28,
    active: true
  },
  {
    id: "inner-circle-delayed-decision",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Decision being delayed",
    prompt: "What decision have you already gathered enough information for, but still have not made?",
    channelSlugs: ["founder-strategy", "inner-circle-chat"],
    type: "strategy",
    cooldownDays: 28,
    active: true
  },
  {
    id: "inner-circle-client-boundary",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Boundary question",
    prompt: "Where do client expectations need firmer boundaries so the business can operate better?",
    channelSlugs: ["inner-circle-chat"],
    type: "operations",
    cooldownDays: 28,
    active: true
  },
  {
    id: "inner-circle-referral-engine",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Growth engine",
    prompt: "What would need to change for referrals to become a more reliable growth channel for you?",
    channelSlugs: ["inner-circle-chat"],
    type: "connections",
    cooldownDays: 28,
    active: true
  },
  {
    id: "inner-circle-strongest-metric",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Metric that matters",
    prompt: "What is one operating number you know the business should track more closely than it does today?",
    channelSlugs: ["founder-strategy"],
    type: "operations",
    cooldownDays: 21,
    active: true
  },
  {
    id: "inner-circle-visibility-gap",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Visibility gap",
    prompt: "Where is the market still misunderstanding what you actually do or the level you operate at?",
    channelSlugs: ["inner-circle-chat"],
    type: "visibility",
    cooldownDays: 28,
    active: true
  },
  {
    id: "inner-circle-growth-bet",
    tier: MembershipTier.INNER_CIRCLE,
    title: "One growth bet",
    prompt: "If you had to make one focused growth bet over the next 90 days, where would it go?",
    channelSlugs: ["founder-strategy"],
    type: "strategy",
    cooldownDays: 21,
    active: true
  },
  {
    id: "inner-circle-hiring-readiness",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Hiring or not",
    prompt: "What would need to be true before hiring or outsourcing becomes the right move rather than a premature one?",
    channelSlugs: ["founder-strategy", "inner-circle-chat"],
    type: "operations",
    cooldownDays: 28,
    active: true
  },
  {
    id: "inner-circle-promise-sharpening",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Sharpen the promise",
    prompt: "What result or promise does the business deliver well, but still communicate too softly?",
    channelSlugs: ["inner-circle-chat"],
    type: "visibility",
    cooldownDays: 28,
    active: true
  },
  {
    id: "inner-circle-repeatable-process",
    tier: MembershipTier.INNER_CIRCLE,
    title: "System pressure",
    prompt: "What is working now because of your personal effort, but would break if the business had to scale it tomorrow?",
    channelSlugs: ["founder-strategy"],
    type: "operations",
    cooldownDays: 28,
    active: true
  },
  {
    id: "inner-circle-not-enough-attention",
    tier: MembershipTier.INNER_CIRCLE,
    title: "Attention allocation",
    prompt: "What part of the business is not getting enough senior attention, even though it probably deserves more?",
    channelSlugs: ["founder-strategy", "inner-circle-chat"],
    type: "strategy",
    cooldownDays: 28,
    active: true
  },
  {
    id: "core-strategic-bet",
    tier: MembershipTier.CORE,
    title: "Core discussion",
    prompt: "What is the highest-consequence strategic bet in front of you right now?",
    channelSlugs: ["premium-discussions"],
    type: "strategy",
    cooldownDays: 21,
    active: true
  },
  {
    id: "core-protect-margin",
    tier: MembershipTier.CORE,
    title: "Margin question",
    prompt: "Where could the business protect margin more intelligently without damaging trust or delivery?",
    channelSlugs: ["premium-discussions"],
    type: "strategy",
    cooldownDays: 28,
    active: true
  },
  {
    id: "core-complexity-creep",
    tier: MembershipTier.CORE,
    title: "Complexity check",
    prompt: "Where is complexity creeping into the business in a way that could become expensive later?",
    channelSlugs: ["premium-discussions"],
    type: "operations",
    cooldownDays: 28,
    active: true
  },
  {
    id: "core-avoid-regret",
    tier: MembershipTier.CORE,
    title: "Decision pressure",
    prompt: "What decision would you most regret still avoiding six months from now?",
    channelSlugs: ["premium-discussions"],
    type: "strategy",
    cooldownDays: 28,
    active: true
  },
  {
    id: "core-market-shift",
    tier: MembershipTier.CORE,
    title: "Market movement",
    prompt: "What change in the market do you think other businesses are underestimating at the moment?",
    channelSlugs: ["premium-discussions"],
    type: "visibility",
    cooldownDays: 35,
    active: true
  },
  {
    id: "core-say-no",
    tier: MembershipTier.CORE,
    title: "Protect the business",
    prompt: "What does the business need to say no to more clearly right now?",
    channelSlugs: ["premium-discussions"],
    type: "strategy",
    cooldownDays: 21,
    active: true
  },
  {
    id: "core-leadership-bottleneck",
    tier: MembershipTier.CORE,
    title: "Leadership bottleneck",
    prompt: "Where is founder dependence still acting as a ceiling on the business?",
    channelSlugs: ["premium-discussions"],
    type: "operations",
    cooldownDays: 28,
    active: true
  },
  {
    id: "core-capital-allocation",
    tier: MembershipTier.CORE,
    title: "Allocation question",
    prompt: "If you had to reallocate time or capital this quarter, what would lose budget and what would gain it?",
    channelSlugs: ["premium-discussions"],
    type: "strategy",
    cooldownDays: 28,
    active: true
  },
  {
    id: "core-partnership-standard",
    tier: MembershipTier.CORE,
    title: "Partnership standard",
    prompt: "What kind of partnership would genuinely move the business forward, and what would make it worth doing properly?",
    channelSlugs: ["premium-discussions"],
    type: "connections",
    cooldownDays: 35,
    active: true
  },
  {
    id: "core-model-tension",
    tier: MembershipTier.CORE,
    title: "Model tension",
    prompt: "Where does the current business model create friction between revenue, quality, and sustainability?",
    channelSlugs: ["premium-discussions"],
    type: "strategy",
    cooldownDays: 28,
    active: true
  },
  {
    id: "core-risk-not-discussed",
    tier: MembershipTier.CORE,
    title: "Quiet risk",
    prompt: "What risk in the business deserves more honest discussion than it is getting right now?",
    channelSlugs: ["premium-discussions"],
    type: "strategy",
    cooldownDays: 35,
    active: true
  },
  {
    id: "core-simplify-plan",
    tier: MembershipTier.CORE,
    title: "Simplify the plan",
    prompt: "What part of the current plan needs stripping back because it has become too complicated to execute well?",
    channelSlugs: ["premium-discussions"],
    type: "operations",
    cooldownDays: 28,
    active: true
  },
  {
    id: "core-founder-time",
    tier: MembershipTier.CORE,
    title: "Time allocation",
    prompt: "Where is founder time still being spent below the level the business now needs?",
    channelSlugs: ["premium-discussions"],
    type: "operations",
    cooldownDays: 21,
    active: true
  },
  {
    id: "core-redesign-needed",
    tier: MembershipTier.CORE,
    title: "Needs redesign",
    prompt: "What part of the business would you redesign from scratch if you had to build it again today?",
    channelSlugs: ["premium-discussions"],
    type: "strategy",
    cooldownDays: 35,
    active: true
  },
  {
    id: "core-next-phase-standard",
    tier: MembershipTier.CORE,
    title: "Next phase",
    prompt: "What standard does the business need to rise to if it is going to operate at the next level credibly?",
    channelSlugs: ["premium-discussions"],
    type: "strategy",
    cooldownDays: 28,
    active: true
  }
];
