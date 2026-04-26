import { ResourceTier, ResourceType } from "@prisma/client";
import { getResourceTierLabel, getResourceTypeLabel } from "@/config/resources";
import type {
  DailyResourcePlanItem,
  RecentResourceForGeneration
} from "@/server/resources/resource-generation-guards";

export type ResourceContentPromptInput = {
  planItem: DailyResourcePlanItem;
  generationDateKey: string;
  sameDayExclusions: Array<{
    tier: ResourceTier;
    category: string;
    type: ResourceType;
    angle: string;
  }>;
  recentHistory: RecentResourceForGeneration[];
};

const TIER_GUIDANCE: Record<ResourceTier, string> = {
  FOUNDATION:
    "Foundation must be practical, accessible, direct, useful for business owners at different stages, and focused on immediate clarity and action. It must not feel basic or patronising.",
  INNER:
    "Inner Circle must be sharper, more strategic, more developed, and focused on improvement, structure, better decisions, and business friction.",
  CORE:
    "Core must be the highest level: commercially sharp, founder/CEO-level thinking, advanced decision-making, leadership pressure, business model clarity, scale thinking, and strategic direction. It must not simply be longer than Foundation."
};

const TYPE_GUIDANCE: Record<ResourceType, string> = {
  CLARITY: "Clarity simplifies a confusing business issue without flattening the commercial reality.",
  OBSERVATION: "Observation reveals a pattern many business owners miss before trying to solve it.",
  STRATEGY: "Strategy shows a better structure, sequence, or decision path.",
  MINDSET:
    "Mindset covers founder pressure, leadership reality, discipline, responsibility, and emotional business load. Keep it grounded and commercial, never motivational.",
  ACTION: "Action gives practical next steps, implementation movement, or operational progress."
};

function historySummary(history: RecentResourceForGeneration[]) {
  if (!history.length) {
    return "No recent resource history was found.";
  }

  return history
    .slice(0, 18)
    .map((item) => {
      const date =
        item.generationDate?.toISOString().slice(0, 10) ??
        item.publishedAt?.toISOString().slice(0, 10) ??
        item.createdAt?.toISOString().slice(0, 10) ??
        "unknown date";

      return `- ${date}: ${getResourceTierLabel(item.tier)} | ${item.category} | ${getResourceTypeLabel(item.type)} | ${item.title}`;
    })
    .join("\n");
}

function sameDaySummary(exclusions: ResourceContentPromptInput["sameDayExclusions"]) {
  if (!exclusions.length) {
    return "This is the first resource in the daily set.";
  }

  return exclusions
    .map(
      (item) =>
        `- ${getResourceTierLabel(item.tier)} already uses ${item.category} / ${getResourceTypeLabel(item.type)} with angle: ${item.angle}`
    )
    .join("\n");
}

export function buildResourceContentPrompt(input: ResourceContentPromptInput) {
  const { planItem } = input;
  const tierLabel = getResourceTierLabel(planItem.tier);
  const typeLabel = getResourceTypeLabel(planItem.type);

  return `You are writing for The Business Circle Network, a private business-owner resource library.

Create one premium editorial resource for ${tierLabel}.

Planned resource:
- Tier: ${tierLabel} (${planItem.tier})
- Category: ${planItem.category}
- Type: ${typeLabel} (${planItem.type})
- Required angle: ${planItem.angle}
- Generation date: ${input.generationDateKey}

Tier guidance:
${TIER_GUIDANCE[planItem.tier]}

Type guidance:
${TYPE_GUIDANCE[planItem.type]}

BCN voice:
- calm authority
- direct
- serious
- practical
- UK English
- no hype
- no emojis
- no motivational cliches
- no generic SaaS tone
- no "unlock your potential"
- no "game changer"
- no fake guru language
- no over-promising
- do not use em dashes

Required article structure:
Opening line: a strong plain-English opener that names the issue.

Then use these exact markdown headings:
## Reality
## Breakdown
### What people usually miss
### Why it keeps happening
### What it costs
## Shift
## Next step

Depth:
- Foundation: 650 to 850 words, direct and immediately useful.
- Inner Circle: 800 to 1000 words, more developed and strategic.
- Core: 900 to 1150 words, commercially mature and founder-level.

Daily set exclusions:
${sameDaySummary(input.sameDayExclusions)}

Recent history exclusions from the last 7 to 14 days:
${historySummary(input.recentHistory)}

Tier awareness:
- Higher-tier members can read lower-tier resources, so Inner Circle and Core resources must not repeat the Foundation resource from the same day.
- Core members can also read Inner Circle, so Core must add a distinct strategic layer rather than a more intense version of the same lesson.
- Keep the three daily resources complementary: same theme family is acceptable only when the category, type, angle, and practical takeaway are clearly different.

Rules:
- Do not repeat recent titles, angles, opening concepts, or the same core lesson.
- Do not create a weaker version of a recent resource.
- Do not change the planned tier, category, or type.
- The title must be specific and not sound like SEO blog content.
- The excerpt must be plain and useful, not promotional.
- The image direction and prompt must be visual atmosphere only, with no text or logos in the image.

Return only valid JSON in this exact shape:
{
  "title": "string",
  "excerpt": "string",
  "category": "${planItem.category}",
  "type": "${planItem.type}",
  "tier": "${planItem.tier}",
  "content": "markdown string",
  "imageDirection": "string",
  "imagePrompt": "string",
  "estimatedReadTime": 5
}`;
}
