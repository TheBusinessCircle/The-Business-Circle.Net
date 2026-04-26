import { ResourceTier, ResourceType } from "@prisma/client";
import { getResourceTierLabel, getResourceTypeLabel } from "@/config/resources";

export type ResourceImagePromptInput = {
  title: string;
  excerpt: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  imageDirection?: string | null;
};

const TYPE_VISUAL_LANGUAGE: Record<ResourceType, string> = {
  CLARITY:
    "clean desk-level composition with one clear focal point, subtle structured notes, and a sense of decision becoming simpler",
  OBSERVATION:
    "quiet analytical composition with layered signals, subtle evidence, and a business pattern being noticed without visual clutter",
  STRATEGY:
    "restrained strategic workspace with mapped sequence, ordered materials, and a sense of calm commercial direction",
  MINDSET:
    "serious founder atmosphere with pressure, discipline, and reflective judgement shown through posture, light, and space",
  ACTION:
    "practical implementation scene with a clean next-step signal, organised tools, and understated operational movement"
};

const TIER_DEPTH: Record<ResourceTier, string> = {
  FOUNDATION:
    "accessible, grounded, practical business-owner context with no beginner or classroom feeling",
  INNER:
    "more strategic operator context, sharper business friction, and visible structure without looking corporate-generic",
  CORE:
    "founder and CEO-level commercial atmosphere with mature judgement, leadership pressure, and strategic consequence"
};

export function buildResourceImageDirection(input: ResourceImagePromptInput) {
  const tierLabel = getResourceTierLabel(input.tier);
  const typeLabel = getResourceTypeLabel(input.type);

  return [
    `${tierLabel} ${typeLabel} editorial resource cover.`,
    `Topic: ${input.category}.`,
    TYPE_VISUAL_LANGUAGE[input.type],
    TIER_DEPTH[input.tier]
  ].join(" ");
}

export function buildResourceImagePrompt(input: ResourceImagePromptInput) {
  const direction = input.imageDirection?.trim() || buildResourceImageDirection(input);

  return [
    `Premium editorial business image for a private business-owner resource titled "${input.title}".`,
    `The resource is about ${input.category.toLowerCase()} and should visually support this excerpt: ${input.excerpt}`,
    direction,
    "Use a dark royal blue atmosphere with restrained gold or silver accents, cinematic but calm lighting, modern high-trust business setting, clean composition for wide and card crops.",
    "The image must be visual atmosphere only. No text, no readable words, no logos, no watermarks, no cartoon, no bright startup graphics, no cheesy stock photo feel, no generic boardroom cliche unless directly relevant."
  ].join(" ");
}
