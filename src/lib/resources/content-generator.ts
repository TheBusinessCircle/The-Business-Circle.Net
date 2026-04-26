import { ResourceTier, ResourceType } from "@prisma/client";
import { getResourceTierLabel, getResourceTypeLabel } from "@/config/resources";

export type ResourceDraftSpec = {
  title: string;
  slug: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  focus: string;
};

export type GeneratedResourceDraft = ResourceDraftSpec & {
  excerpt: string;
  content: string;
  wordCount: number;
  estimatedReadMinutes: number;
};

type CategoryLens = {
  surface: string;
  cause: string;
  consequence: string;
  firstMove: string;
  practicalTest: string;
};

type TypeLens = {
  opening: string[];
  compensation: string;
  root: string;
  shift: string;
  nextStep: string;
};

const DEFAULT_CATEGORY_LENS: CategoryLens = {
  surface: "the business is carrying a decision or operating condition that has not been made clear enough",
  cause: "the owner has not turned the issue into a simple enough commercial rule",
  consequence: "energy gets spent compensating for confusion instead of moving the business forward cleanly",
  firstMove: "name the decision, remove one source of confusion, and make the next move visible",
  practicalTest: "the issue should be easier to explain, easier to own, and easier to act on this week"
};

const CATEGORY_LENSES: Record<string, CategoryLens> = {
  "Getting Started": {
    surface: "the owner is trying to build too many moving parts before the business has earned that complexity",
    cause: "there is no hard filter yet for what matters now and what can wait",
    consequence: "good effort gets spread thin and early confidence drops faster than it should",
    firstMove: "strip the business back to the smallest version that can still create a real result for a real buyer",
    practicalTest: "if the business disappeared for a week, you should still be able to explain the offer and the next move in one minute"
  },
  "Business Foundations": {
    surface: "important decisions live in memory instead of in a visible operating rhythm",
    cause: "the business has activity, but it does not yet have simple rules for money, delivery, and review",
    consequence: "the owner ends up carrying avoidable weight because the basics are never settled",
    firstMove: "build a simple weekly structure for numbers, priorities, delivery checks, and decisions",
    practicalTest: "someone close to the business should be able to see what happened this week and what matters next without a long explanation"
  },
  "Offer Clarity": {
    surface: "the offer is described in pieces instead of in one clean commercial promise",
    cause: "the business is trying to sound flexible, so the message gets wider and weaker",
    consequence: "buyers hesitate because they cannot tell what result they are actually buying",
    firstMove: "reduce the message until the buyer, problem, and result are easy to see in one pass",
    practicalTest: "a good prospect should be able to repeat the offer back to you without adding their own guesswork"
  },
  "Basic Marketing": {
    surface: "marketing changes shape too often to build signal",
    cause: "the message, channel, and call to action are not being held steady long enough to read properly",
    consequence: "the owner stays busy without learning which work is actually pulling people forward",
    firstMove: "choose one message and one channel long enough to measure what happens",
    practicalTest: "you should be able to point to one clear route from attention to enquiry without talking around it"
  },
  "Direction and Thinking": {
    surface: "noise keeps taking the place of judgement",
    cause: "the business has not named the current problem cleanly enough to guide decisions",
    consequence: "energy gets spent on motion, recovery, and rethinking instead of forward movement",
    firstMove: "write the real problem in a sentence plain enough that it changes what you do this week",
    practicalTest: "if the team asked what matters most right now, the answer should be short and consistent"
  },
  "Offer Positioning": {
    surface: "the business sounds competent but not distinct",
    cause: "the message describes the work without showing why the work matters in commercial terms",
    consequence: "good prospects compare on price because the difference is not being carried clearly enough",
    firstMove: "anchor the offer around a sharper problem, sharper buyer, and sharper commercial outcome",
    practicalTest: "the right prospect should know why you are a better fit before they know everything you do"
  },
  "Website and Conversion": {
    surface: "the site contains information but not enough decision support",
    cause: "pages are written to explain the business instead of helping a buyer decide what to do next",
    consequence: "traffic leaks away because attention is not being turned into momentum",
    firstMove: "rebuild the page around what the buyer needs to believe before they act",
    practicalTest: "a good visitor should know who the offer is for, what changes, and what to do next within seconds"
  },
  "Customer Journey": {
    surface: "interest fades in the handoff between steps",
    cause: "the journey has hidden friction, mixed signals, or gaps in ownership",
    consequence: "conversion falls even when the offer itself is strong",
    firstMove: "map the journey from first contact to delivered result and remove the points where momentum drops",
    practicalTest: "you should be able to explain where prospects stall, what they need there, and who owns that moment"
  },
  "Pricing and Value": {
    surface: "pricing conversations feel heavier than they should",
    cause: "value is either not clear enough or not being held confidently enough in the conversation",
    consequence: "the business works too hard for revenue that does not fully support the model",
    firstMove: "tie the price back to the cost of the problem, the value of the result, and the confidence of the delivery",
    practicalTest: "if the price was removed from the page, the value case should still feel commercially strong"
  },
  "Fixing Problems": {
    surface: "the business keeps reacting to symptoms",
    cause: "people are changing visible friction without tracing the pattern back to the real source",
    consequence: "the same issue returns in slightly different clothes and drains confidence",
    firstMove: "slow the diagnosis down enough to separate the pattern, the trigger, and the root weakness",
    practicalTest: "if you fix one thing, you should be able to say what second order problem it is meant to remove"
  },
  "Scaling and Structure": {
    surface: "growth is asking more from the business than the current structure can carry cleanly",
    cause: "roles, decisions, and operating rules have not grown at the same pace as demand",
    consequence: "more revenue creates more drag instead of more leverage",
    firstMove: "decide what must become standard before the next layer of growth lands",
    practicalTest: "if volume increased next quarter, you should know exactly where strain would show first"
  },
  "Decision Making": {
    surface: "important choices are being delayed, rushed, or made without a stable frame",
    cause: "the decision process is too dependent on pressure, personality, or incomplete context",
    consequence: "speed falls, trust falls, or expensive judgement errors multiply",
    firstMove: "define the criteria, owner, and timing before the pressure of the decision peaks",
    practicalTest: "two capable leaders should reach a similar conclusion from the same decision frame"
  },
  "Time and Energy": {
    surface: "the calendar is absorbing energy that the business needs elsewhere",
    cause: "the owner has not protected enough space for thinking, design, and high value work",
    consequence: "important work gets handled with tired judgement and shallow attention",
    firstMove: "treat time and energy as operating capacity, not as something to squeeze after everything else",
    practicalTest: "your strongest hours should be recognisable on the calendar and tied to the work that changes the business"
  },
  Systems: {
    surface: "the business has processes, but they do not stay useful under pressure",
    cause: "systems were added to solve yesterday's friction without being shaped around real use",
    consequence: "people work around the system and the business pays twice for the same job",
    firstMove: "simplify the process until it supports the work people actually do",
    practicalTest: "a strong system should make the right move easier than the wrong one on an ordinary week"
  },
  "Long Term Growth": {
    surface: "short term decisions are quietly shaping the future model",
    cause: "the business is reacting to immediate opportunities without enough regard for long term direction",
    consequence: "revenue may rise while strategic quality falls",
    firstMove: "judge new growth moves against the business you are trying to build, not only the revenue they could create now",
    practicalTest: "your next growth decision should strengthen the future model rather than borrow against it"
  },
  Positioning: {
    surface: "the business sounds capable but not sharp enough to be chosen quickly",
    cause: "the market difference is described too broadly",
    consequence: "buyers compare on price, convenience, or familiarity instead of fit and value",
    firstMove: "tighten the buyer, the problem, and the commercial outcome until the difference is visible",
    practicalTest: "the right prospect should feel why this is a better fit before hearing the full explanation"
  },
  Leadership: {
    surface: "important expectations are living in the founder's head instead of in the business",
    cause: "leadership clarity has not been translated into visible standards",
    consequence: "people wait, guess, or over-rely on the founder for decisions they should be able to make",
    firstMove: "turn one repeated expectation into a visible standard",
    practicalTest: "people should be able to make a better decision without needing the founder in the room"
  },
  Operations: {
    surface: "the work is happening, but the operating rhythm is not carrying it cleanly",
    cause: "ownership, timing, or review points are too loose",
    consequence: "small misses compound into drag, delay, and avoidable founder involvement",
    firstMove: "clarify one operating rhythm that removes repeated friction",
    practicalTest: "the right person should know what happens, when it happens, and what good looks like"
  },
  Sales: {
    surface: "sales conversations are doing too much heavy lifting too late",
    cause: "the business has not prepared enough trust, value, and next-step clarity before the conversation",
    consequence: "good prospects stall, negotiate harder, or need repeated reassurance",
    firstMove: "tighten the path from enquiry to decision around buyer confidence",
    practicalTest: "a prospect should arrive with the right problem, the right expectation, and a clear next step"
  },
  Messaging: {
    surface: "the message is accurate but not decisive enough",
    cause: "it describes the business more than it names the buyer's real pressure",
    consequence: "good prospects recognise parts of the offer without feeling enough urgency or fit",
    firstMove: "write the message around the problem people already feel and the result they can understand",
    practicalTest: "the right person should be able to repeat the point back without needing extra explanation"
  },
  "Team Clarity": {
    surface: "people are busy but not always pointed at the same standard",
    cause: "roles, decisions, or handoffs are not plain enough",
    consequence: "the business pays for confusion through rework, delay, and founder correction",
    firstMove: "clarify one responsibility boundary that keeps recurring work out of the grey",
    practicalTest: "two people should not need to negotiate who owns the same moment every week"
  },
  "Strategic Direction": {
    surface: "the business is moving, but not every move strengthens the direction",
    cause: "near-term opportunities are being judged without a strong enough strategic filter",
    consequence: "growth becomes busy and expensive instead of coherent",
    firstMove: "name the direction clearly enough to say no to work that does not support it",
    practicalTest: "the next decision should make the business easier to understand and harder to distract"
  },
  "Founder Pressure": {
    surface: "pressure is shaping the founder's read of the business",
    cause: "too much judgement is happening inside urgency, fatigue, or responsibility",
    consequence: "the founder either over-corrects, delays, or carries decisions that should be systematised",
    firstMove: "separate the feeling of pressure from the evidence in the business",
    practicalTest: "the next decision should still look sensible when the pressure is lower"
  },
  "Growth Systems": {
    surface: "growth depends too much on effort and not enough on repeatable conditions",
    cause: "the business has not turned proven movement into a system people can use",
    consequence: "progress relies on memory, intensity, or founder presence",
    firstMove: "standardise the part of growth that already works before adding another channel or tactic",
    practicalTest: "a good system should make the right growth behaviour easier to repeat"
  },
  "Trust and Credibility": {
    surface: "the business asks for trust before enough evidence has been made visible",
    cause: "proof, process, and standards are not presented in the moments where doubt naturally appears",
    consequence: "buyers hesitate even when the offer is strong",
    firstMove: "place one credible proof point exactly where the buyer's risk increases",
    practicalTest: "a buyer should feel less uncertainty without needing a long reassurance conversation"
  },
  Pricing: {
    surface: "price is being discussed before value has been properly held",
    cause: "the commercial case is not clear enough around the cost of the problem and the value of the result",
    consequence: "the business discounts, over-explains, or attracts poorly fitted demand",
    firstMove: "connect price to consequence, outcome, and delivery confidence",
    practicalTest: "the price should feel connected to a business result, not only to a list of tasks"
  },
  "Client Experience": {
    surface: "the client experience depends too much on goodwill and improvisation",
    cause: "expectations, communication, and handoffs are not designed tightly enough",
    consequence: "delivery quality varies and the owner has to rescue confidence manually",
    firstMove: "define the moment where clients most need certainty and build a better signal there",
    practicalTest: "clients should know what is happening, why it matters, and what comes next"
  },
  Delivery: {
    surface: "delivery is producing the work, but not always protecting the standard",
    cause: "the business has not made quality, ownership, and review simple enough to repeat",
    consequence: "margin, trust, and team confidence get squeezed by avoidable friction",
    firstMove: "name the delivery standard and remove one repeat point of confusion",
    practicalTest: "the same quality should be easier to produce next time, not harder"
  },
  Retention: {
    surface: "the business is not always giving clients a strong enough reason to continue",
    cause: "value, progress, and next-stage relevance are not being made visible soon enough",
    consequence: "good relationships end earlier than they should or need extra founder energy to hold",
    firstMove: "show the client what has changed and what the next useful stage requires",
    practicalTest: "continuation should feel commercially sensible, not emotionally negotiated"
  },
  "Focus and Prioritisation": {
    surface: "too many priorities are competing for the same attention",
    cause: "the business has not chosen the constraint that matters most right now",
    consequence: "important work gets thinned out until nothing receives enough force",
    firstMove: "choose the decision or constraint that would make the week cleaner if it moved",
    practicalTest: "the priority should be obvious enough to protect when attractive distractions appear"
  }
};

const TYPE_LENSES: Record<ResourceType, TypeLens> = {
  CLARITY: {
    opening: [
      "If {focus} feels blurry, the rest of the business will keep paying for that blur.",
      "Most people do not need more noise around {focus}. They need a cleaner view of what is actually true.",
      "When {focus} is unclear, good work starts carrying avoidable weight."
    ],
    compensation: "People usually compensate by adding more detail, more explanation, or more moving parts than the situation can actually carry.",
    root: "The real issue is usually not effort. It is that the business has not reduced the decision far enough to make it obvious.",
    shift: "The shift is to reduce the issue until the right choice becomes easier to name, teach, and repeat.",
    nextStep: "Your next move should make the truth easier to see, not simply add more information."
  },
  STRATEGY: {
    opening: [
      "Better outcomes with {focus} usually come from better sequence, not more effort.",
      "The business often does not need a bigger plan around {focus}. It needs the next few decisions in the right order.",
      "Strategy becomes useful when it removes noise from {focus}, not when it makes the picture look clever."
    ],
    compensation: "When sequence is weak, people try to push harder on everything at once and mistake pressure for progress.",
    root: "The underlying issue is usually that the business has not chosen the order in which this problem should be solved.",
    shift: "The shift is to decide what has to be true first, what can wait, and what should not be touched yet.",
    nextStep: "Your next move should create leverage, not just another task."
  },
  OBSERVATION: {
    opening: [
      "The obvious problem with {focus} is not always the real one.",
      "What looks like a problem with {focus} often points to something quieter underneath it.",
      "Businesses usually misread {focus} the first time because the visible signal is only part of the story."
    ],
    compensation: "The first reaction is usually aimed at the visible symptom because that is the part creating discomfort.",
    root: "The real pattern sits underneath the symptom, which is why surface fixes feel busy but do not last.",
    shift: "The shift is to read the pattern before you try to solve it.",
    nextStep: "Your next move should help you see the pattern more clearly before you act on it."
  },
  MINDSET: {
    opening: [
      "Pressure changes how owners read {focus}, and that distortion gets expensive.",
      "Mindset issues around {focus} are rarely abstract. They usually show up as bad reads of real business conditions.",
      "The business can be steady while your read of {focus} becomes unstable under pressure."
    ],
    compensation: "Under pressure, people either overreact, delay, or look for certainty that business rarely offers in clean form.",
    root: "The deeper issue is not personality. It is that pressure is shaping interpretation more than evidence is.",
    shift: "The shift is to replace emotional over-reading with a steadier business frame.",
    nextStep: "Your next move should give you a calmer way to read the situation, not just a motivational push."
  },
  ACTION: {
    opening: [
      "You do not need a bigger plan before you improve {focus}. You need a cleaner next move.",
      "Action around {focus} gets lighter once the next practical step is obvious.",
      "Progress with {focus} usually comes from a well chosen move, not a dramatic reset."
    ],
    compensation: "When the next move is not clear, people either wait too long or rush into work that feels productive but changes very little.",
    root: "The real problem is usually not capability. It is that the business has not turned the issue into an actionable step.",
    shift: "The shift is to translate the issue into work that can be done, checked, and learned from this week.",
    nextStep: "Your next move should be concrete enough to complete and useful enough to teach you something."
  }
};

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function selectTemplate(value: string, entries: string[]) {
  return entries[hashString(value) % entries.length];
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function buildOpeningLine(spec: ResourceDraftSpec) {
  const typeLens = TYPE_LENSES[spec.type];
  return selectTemplate(spec.slug, typeLens.opening).replace("{focus}", spec.focus);
}

export function deriveFocusFromTitle(title: string) {
  return title
    .trim()
    .replace(/^(how to|why|what)\s+/i, "")
    .replace(/\s+actually\s+/gi, " ")
    .replace(/\?$/, "")
    .toLowerCase();
}

function buildExcerpt(spec: ResourceDraftSpec) {
  return `A ${getResourceTypeLabel(spec.type).toLowerCase()} piece on ${spec.focus} so you can see what is happening, why it keeps happening, and what to do next without adding more noise.`;
}

function buildRealityParagraphs(spec: ResourceDraftSpec) {
  const categoryLens = CATEGORY_LENSES[spec.category] ?? DEFAULT_CATEGORY_LENS;
  const typeLens = TYPE_LENSES[spec.type];
  const tierLabel = getResourceTierLabel(spec.tier).toLowerCase();

  return [
    `What is usually happening is simple. ${sentenceCase(spec.focus)} is being felt at the surface, but the pressure underneath it is coming from the way the business is designed right now. In ${spec.category.toLowerCase()}, that usually means ${categoryLens.surface}. The issue feels bigger than it needs to because the business is trying to carry complexity that has not been earned yet.`,
    `${typeLens.compensation} That makes the problem look active even when the real movement is shallow. At ${tierLabel} tier, the job is not to sound clever about it. The job is to get honest about where this is costing time, margin, confidence, or decision quality in the day to day running of the business.`
  ];
}

function buildBreakdownParagraphs(spec: ResourceDraftSpec) {
  const categoryLens = CATEGORY_LENSES[spec.category] ?? DEFAULT_CATEGORY_LENS;
  const typeLens = TYPE_LENSES[spec.type];

  return [
    `### What people usually misread\n\nThe first thing people notice is the visible friction around ${spec.focus}. That is normal. The visible part is what interrupts the week. The mistake is assuming the visible part is the full problem. ${typeLens.root} In practice, the business usually keeps circling because the same unclear condition is being carried into conversations, pages, offers, meetings, or delivery choices without being cleaned up properly.`,
    `### Why it keeps happening\n\n${sentenceCase(categoryLens.cause)} Once that happens, the business starts creating work to manage the confusion it created itself. People need extra explanation. Decisions keep coming back for another pass. Buyers or team members fill the gaps with their own interpretation. None of that feels dramatic in isolation, but it quietly lowers quality and makes good operators look less decisive than they really are.`,
    `### What it costs\n\nThe cost is not only lost time. It is lost signal. The business becomes harder to read from the inside and harder to trust from the outside. ${sentenceCase(categoryLens.consequence)} When this goes on for long enough, owners start treating the drag as normal and build routines around it. That is when an ordinary issue becomes a structural one.`
  ];
}

function buildShiftParagraphs(spec: ResourceDraftSpec) {
  const categoryLens = CATEGORY_LENSES[spec.category] ?? DEFAULT_CATEGORY_LENS;
  const typeLens = TYPE_LENSES[spec.type];

  return [
    `${typeLens.shift} That usually means getting closer to the commercial truth, not further away from it. If ${spec.focus} is real, you should be able to explain it plainly, show where it appears in the business, and name the decision that clears it up. If you cannot do that yet, the business is still carrying too much blur.`,
    `The better shift is usually smaller than people expect. ${sentenceCase(categoryLens.firstMove)} Once that is in place, the business gets lighter because fewer decisions need rescuing later. ${sentenceCase(categoryLens.practicalTest)} If it does not, you are probably still dealing with a partial answer rather than a clean one.`
  ];
}

function buildNextSteps(spec: ResourceDraftSpec) {
  const categoryLens = CATEGORY_LENSES[spec.category] ?? DEFAULT_CATEGORY_LENS;
  const typeLens = TYPE_LENSES[spec.type];

  return {
    intro: `${typeLens.nextStep} Keep it practical. The aim is to create a cleaner operating condition, not a prettier explanation.`,
    items: [
      `Write down where ${spec.focus} is showing up right now and be specific about the cost it is creating in the business.`,
      `Choose one rule, page, decision, or routine to simplify this week so the business does not have to keep compensating for the same blur.`,
      `Use ${categoryLens.practicalTest.toLowerCase()} as the check for whether the change is genuinely helping or only sounding better on paper.`
    ]
  };
}

function joinParagraphs(paragraphs: string[]) {
  return paragraphs.join("\n\n");
}

export function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function generateResourceDraft(spec: ResourceDraftSpec): GeneratedResourceDraft {
  const openingLine = buildOpeningLine(spec);
  const reality = joinParagraphs(buildRealityParagraphs(spec));
  const breakdown = joinParagraphs(buildBreakdownParagraphs(spec));
  const shift = joinParagraphs(buildShiftParagraphs(spec));
  const nextSteps = buildNextSteps(spec);

  const content = [
    openingLine,
    "## Reality",
    reality,
    "## Breakdown",
    breakdown,
    "## Shift",
    shift,
    "## Next step",
    `${nextSteps.intro}\n\n1. ${nextSteps.items[0]}\n2. ${nextSteps.items[1]}\n3. ${nextSteps.items[2]}`
  ].join("\n\n");

  const wordCount = countWords(content);
  const estimatedReadMinutes = Math.max(3, Math.ceil(wordCount / 220));

  return {
    ...spec,
    excerpt: buildExcerpt(spec),
    content,
    wordCount,
    estimatedReadMinutes
  };
}

export function generateResourceDraftFromTitle(input: {
  title: string;
  slug: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
}) {
  return generateResourceDraft({
    ...input,
    focus: deriveFocusFromTitle(input.title)
  });
}
