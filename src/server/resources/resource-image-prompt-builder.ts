import { ResourceTier, ResourceType } from "@prisma/client";
import { getResourceTierLabel, getResourceTypeLabel } from "@/config/resources";

export type ResourceImagePromptInput = {
  title: string;
  excerpt: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  imageDirection?: string | null;
  content?: string | null;
};

type VisualMapping = {
  situation: string;
  subjects: string;
  avoid?: string;
};

const RELATABLE_PROMPT_SIGNATURE =
  "Create a premium editorial business cover image for a private business-owner resource.";

const CATEGORY_VISUAL_MAPPINGS: Record<string, VisualMapping> = {
  "offer clarity": {
    situation:
      "a business owner simplifying an overcrowded service or offer board into a few clear commercial choices",
    subjects:
      "service cards, a refined offer board, customer notes, pricing markers, and narrowed choice pathways",
    avoid: "random product mockups or abstract service icons"
  },
  "customer journey": {
    situation:
      "a founder tracing where a customer enquiry moves from website visit to email, call, proposal, and follow-up",
    subjects:
      "an enquiry email, phone, website journey notes, touchpoint cards, and a calm conversion path map",
    avoid: "generic funnel diagrams unless the scene clearly needs one"
  },
  "decision making": {
    situation:
      "a founder weighing a practical trade-off with numbers, notes, market signals, and one clear next decision",
    subjects:
      "decision notes, financial snapshots, trade-off cards, a notebook, and restrained analytical materials"
  },
  "website and conversion": {
    situation:
      "a business owner reviewing a website conversion path and spotting where visitors lose confidence",
    subjects:
      "a laptop with an indistinct website layout, analytics shapes, visitor path notes, and CTA planning cards",
    avoid: "readable screens, fake brand marks, or oversized charts"
  },
  positioning: {
    situation:
      "a founder clarifying where the business sits in the market and what should stand apart",
    subjects:
      "a market map, competitor landscape cards, positioning notes, audience cues, and one highlighted direction"
  },
  leadership: {
    situation:
      "a founder or senior operator holding quiet responsibility while setting clearer direction for others",
    subjects:
      "a refined leadership desk, team direction notes, responsibility markers, and a calm planning board"
  },
  operations: {
    situation:
      "an operator finding a bottleneck in the delivery workflow and shaping a cleaner operating rhythm",
    subjects:
      "workflow map, delivery stages, process board, operational notes, and structured handoff markers"
  },
  sales: {
    situation:
      "a business owner reviewing a sales conversation, proposal, follow-up moment, or pipeline friction",
    subjects:
      "proposal papers, follow-up notes, phone, pipeline cards, and a calm commercial conversation setting",
    avoid: "pushy sales imagery or handshake cliches"
  },
  messaging: {
    situation:
      "a founder refining customer language so the message feels clearer and more commercially useful",
    subjects:
      "copy review notes, customer language cards, message options, and a focused editing workspace",
    avoid: "readable copy on the page"
  },
  "founder pressure": {
    situation:
      "a founder working through quiet pressure at a late premium desk without melodrama",
    subjects:
      "decision notes, open notebook, muted laptop glow, responsibility cues, and a still dark workspace"
  },
  "strategic direction": {
    situation:
      "a founder setting a longer-term direction from several possible paths into one deliberate route",
    subjects:
      "roadmap cards, route planning materials, long-term signals, and a refined strategic decision board"
  },
  "business foundations": {
    situation:
      "a practical founder organising the basics of the business into a clearer working structure",
    subjects:
      "simple planning cards, customer notes, offer basics, calendar cues, and a tidy working desk"
  },
  "basic marketing": {
    situation:
      "a founder choosing a simple marketing focus from too many possible activities",
    subjects:
      "campaign notes, channel cards, customer cues, and one practical action plan"
  },
  "direction and thinking": {
    situation:
      "a founder turning scattered priorities into one clearer direction",
    subjects:
      "priority notes, a directional planning board, calm desk materials, and one highlighted route"
  },
  pricing: {
    situation:
      "a business owner reviewing price, value, scope, and commercial confidence with care",
    subjects:
      "pricing cards, value notes, proposal materials, calculator, and restrained financial cues"
  },
  "pricing and value": {
    situation:
      "a founder connecting value, price, client outcome, and scope into a clearer commercial offer",
    subjects:
      "value map, pricing notes, client outcome cards, and premium proposal materials"
  },
  "client experience": {
    situation:
      "a business owner improving the client journey after purchase so delivery feels smoother and more trusted",
    subjects:
      "client touchpoint cards, onboarding notes, delivery plan, and calm service experience cues"
  },
  delivery: {
    situation:
      "a business owner tightening delivery so the work feels consistent, clear, and easier to trust",
    subjects:
      "delivery workflow, handoff cards, quality checklist, and structured implementation notes"
  },
  retention: {
    situation:
      "a founder reviewing why customers stay, renew, or quietly drift away",
    subjects:
      "relationship notes, renewal cues, client value markers, and a calm follow-up planning scene"
  },
  "growth systems": {
    situation:
      "a founder connecting repeatable growth activities into a system that can be trusted",
    subjects:
      "growth loop notes, operating cadence board, customer path materials, and measured progress cues"
  },
  "scaling and structure": {
    situation:
      "a leadership-level founder simplifying complexity so the business can scale without becoming chaotic",
    subjects:
      "structure board, operating model notes, responsibility map, and mature planning materials"
  },
  "time and energy": {
    situation:
      "a founder protecting attention and energy by choosing what matters most",
    subjects:
      "calendar blocks, priority notes, quiet workspace, and one clear protected focus area"
  },
  systems: {
    situation:
      "a founder turning repeated work into a visible system with fewer gaps and clearer ownership",
    subjects:
      "system map, process cards, ownership notes, and clean operational structure"
  },
  "long term growth": {
    situation:
      "a founder reviewing long-term growth signals and choosing a steadier commercial path",
    subjects:
      "long-range roadmap, market notes, financial cues, and a calm strategic workspace"
  },
  "fixing problems": {
    situation:
      "a business owner diagnosing a recurring commercial problem and separating symptoms from the real cause",
    subjects:
      "issue notes, root-cause cards, process fragments, and one focused repair path"
  },
  "trust and credibility": {
    situation:
      "a founder strengthening proof, clarity, and credibility around the business offer",
    subjects:
      "client proof markers, credibility notes, refined proposal material, and trust-building cues"
  },
  "team clarity": {
    situation:
      "a team aligning around who owns what and how decisions should move",
    subjects:
      "role cards, decision board, responsibility notes, and a composed workshop table"
  },
  "focus and prioritisation": {
    situation:
      "a founder narrowing scattered priorities into one clean commercial path",
    subjects:
      "scattered priority notes being reduced to a small set, calendar markers, and one highlighted next move"
  }
};

const TYPE_VISUAL_LANGUAGE: Record<ResourceType, string> = {
  CLARITY:
    "show the moment a messy situation becomes simpler, with one clear focal point and practical visual evidence",
  OBSERVATION:
    "show a business pattern being noticed through subtle evidence, signals, and calm analytical attention",
  STRATEGY:
    "show structured commercial direction, sequencing, trade-offs, and deliberate choices",
  MINDSET:
    "show serious founder reality, pressure, discipline, judgement, and inner composure without melodrama",
  ACTION:
    "show practical implementation, next-step movement, and an organised path into execution"
};

const TIER_DEPTH: Record<ResourceTier, string> = {
  FOUNDATION:
    "Foundation tier: practical, accessible, grounded, useful for an owner improving the business today",
  INNER:
    "Inner Circle tier: more strategic, developed, commercially sharper, with visible structure and operator maturity",
  CORE:
    "Core tier: advanced founder and CEO-level atmosphere, serious commercial judgement, leadership consequence, and mature decision weight"
};

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

export function getResourceCategoryVisualMapping(category: string): VisualMapping {
  const normalized = normalizeCategory(category);
  return (
    CATEGORY_VISUAL_MAPPINGS[normalized] ?? {
      situation:
        "a business owner working through the specific commercial issue behind this resource with practical notes and a focused next decision",
      subjects:
        "founder desk, resource-specific planning materials, business notes, customer evidence, and a clear decision cue",
      avoid: "generic abstract business symbolism"
    }
  );
}

function titleSpecificScene(title: string, mapping: VisualMapping) {
  const normalizedTitle = title.toLowerCase();

  if (/(lead|leads|enquiry|enquiries|inquiry|inquiries|drop off|follow.?up)/i.test(normalizedTitle)) {
    return "a quiet founder's desk with an unanswered enquiry email, phone beside notes, customer journey cards, and a visible point where follow-up has stalled";
  }

  if (/(more services|too many services|services can make|offer|offers|overcrowded)/i.test(normalizedTitle)) {
    return "a business owner simplifying an overcrowded services board into fewer clearer options, with removed cards set aside and one clean offer path emerging";
  }

  if (/(commercial judgement|judgment|numbers|market signals|trade.?off)/i.test(normalizedTitle)) {
    return "a founder reviewing numbers, decision notes, customer evidence, and market signals at a dark premium desk";
  }

  if (/(decision process|team can trust|team trust|decisions your team)/i.test(normalizedTitle)) {
    return "a refined team decision board with clear process stages, ownership markers, and a calm workshop table";
  }

  if (/(everything feels important|priorit|direction|focus)/i.test(normalizedTitle)) {
    return "a founder's desk with scattered priority notes being narrowed into one clear path, with the less important notes moved aside";
  }

  if (/(website|conversion|visitors|cta|homepage)/i.test(normalizedTitle)) {
    return "a founder reviewing a muted website layout, visitor path notes, analytics cues, and a clear conversion gap";
  }

  if (/(pricing|price|value|scope)/i.test(normalizedTitle)) {
    return "a business owner comparing price, scope, value, and client outcome cards with calm commercial seriousness";
  }

  if (/(pressure|overwhelm|stuck|busy|capacity|energy)/i.test(normalizedTitle)) {
    return "a late premium founder workspace with quiet pressure, decision notes, calendar blocks, and one calm next move";
  }

  return mapping.situation;
}

function cleanSnippet(value: string | null | undefined, maxLength: number) {
  const cleaned = (value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_>`~\-[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength).trim()}...`;
}

function articleSignal(input: ResourceImagePromptInput) {
  const contentSignal = cleanSnippet(input.content, 360);
  if (contentSignal) {
    return contentSignal;
  }

  return cleanSnippet(input.excerpt, 260);
}

export function isRelatableResourceImagePrompt(value: string | null | undefined) {
  const prompt = value?.trim() ?? "";
  return (
    prompt.includes(RELATABLE_PROMPT_SIGNATURE) &&
    prompt.includes("Business situation:") &&
    prompt.includes("Avoid:")
  );
}

export function buildResourceImageDirection(input: ResourceImagePromptInput) {
  const tierLabel = getResourceTierLabel(input.tier);
  const typeLabel = getResourceTypeLabel(input.type);
  const mapping = getResourceCategoryVisualMapping(input.category);
  const scene = titleSpecificScene(input.title, mapping);

  return [
    `${tierLabel} ${typeLabel} resource cover.`,
    `Use a real photographic editorial scene, not abstract graphics: ${scene}.`,
    `Visual themes: ${mapping.subjects}.`,
    TYPE_VISUAL_LANGUAGE[input.type],
    TIER_DEPTH[input.tier]
  ].join(" ");
}

export function buildResourceImagePrompt(input: ResourceImagePromptInput) {
  const mapping = getResourceCategoryVisualMapping(input.category);
  const direction = input.imageDirection?.trim() || buildResourceImageDirection(input);
  const scene = titleSpecificScene(input.title, mapping);
  const signal = articleSignal(input);

  return [
    RELATABLE_PROMPT_SIGNATURE,
    "",
    `Topic: ${input.title}`,
    `Category: ${input.category}`,
    `Type: ${getResourceTypeLabel(input.type)}`,
    `Tier: ${getResourceTierLabel(input.tier)}`,
    "",
    `Business situation: ${scene}. The image must feel specifically connected to this topic, not like a generic business placeholder.`,
    `Visual subject: ${mapping.subjects}. Include concrete business objects and contextual details that make the resource idea legible without using written words.`,
    `Resource signal: ${signal}`,
    `Direction: ${direction}`,
    "",
    "Tone: calm authority, serious founder reality, commercially focused, premium and restrained.",
    "Environment: premium dark workspace or refined business setting, dark BCN tone, royal blue atmosphere, subtle gold and silver accents, realistic materials, credible UK business-owner feel.",
    "Composition: wide editorial cover crop, clear focal point, clean negative space for card crops, not crowded, no hero text area, no decorative abstract-only composition.",
    "Lighting: cinematic low-key lighting, soft gold or silver highlights, natural shadows, realistic depth of field, high-end editorial photography.",
    `Avoid: text, readable words, logos, watermarks, cartoons, illustrations, generic abstract SaaS graphics, AI-looking plastic scenes, cheesy stock-photo smiling teams, random charts unless the topic calls for them, ${mapping.avoid ?? "anything unrelated to the resource topic"}.`
  ].join("\n");
}
