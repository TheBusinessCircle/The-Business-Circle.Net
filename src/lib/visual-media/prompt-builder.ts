import type {
  VisualMediaPlacementDefinition,
  VisualMediaUploadMode
} from "@/lib/visual-media/types";

const BCN_STYLE_REQUIREMENTS = [
  "BCN visual style: premium dark editorial business atmosphere, royal blue depth, subtle gold and silver accents, calm authority, high trust, commercially serious.",
  "Avoid: text, typography, words, logos, watermarks, cheesy stock imagery, cartoon style, plastic AI-looking scenes, exaggerated glow, bright generic SaaS graphics."
].join("\n");

const GENERIC_VISUAL_MEDIA_PROMPT =
  "Create a premium editorial business image for The Business Circle Network. Dark royal blue atmosphere, subtle gold/silver accents, calm authority, high-trust founder/business environment, clean composition, no text, no logos, no cartoon, no cheesy stock photography.";

function sentenceList(items: string[]) {
  return items.filter(Boolean).join("; ");
}

function modeComposition(mode: VisualMediaUploadMode) {
  return mode === "mobile"
    ? "Mobile variant: keep the main subject central, clean, and crop-safe for narrow screens."
    : "Desktop variant: compose as a wide editorial image with clean negative space and strong visual balance.";
}

export function applyVisualMediaBcnStyle(prompt: string) {
  const trimmed = prompt.trim() || GENERIC_VISUAL_MEDIA_PROMPT;

  if (trimmed.includes("BCN visual style:")) {
    return trimmed;
  }

  return `${trimmed}\n\n${BCN_STYLE_REQUIREMENTS}`;
}

export function buildVisualMediaImagePrompt(input: {
  definition: VisualMediaPlacementDefinition | null | undefined;
  mode: VisualMediaUploadMode;
}) {
  const { definition, mode } = input;

  if (!definition) {
    return applyVisualMediaBcnStyle(`${GENERIC_VISUAL_MEDIA_PROMPT}\n\n${modeComposition(mode)}`);
  }

  const template = definition.promptTemplate;
  const prompt = [
    "Create a premium editorial business image for The Business Circle Network.",
    "",
    `Placement: ${definition.label}`,
    `Slot purpose: ${definition.imagePurpose}`,
    `Direction: ${definition.longAdminGuidance}`,
    `Best image type: ${definition.bestImageType}`,
    `Scene: ${template.sceneType}`,
    `Subject: ${template.subject}`,
    `Recommended subject matter: ${sentenceList(definition.recommendedSubjectMatter)}`,
    `Environment: ${template.environment}`,
    `Composition: ${template.cameraComposition}`,
    `Composition guidance: ${sentenceList(definition.recommendedComposition)}`,
    modeComposition(mode),
    `Lighting: ${template.lighting}`,
    `Lighting and mood: ${sentenceList(definition.recommendedLightingMood)}`,
    `Emotional tone: ${sentenceList(definition.emotionalTone)}`,
    `Style: ${template.style}`,
    `Quality: ${template.qualityTags}`,
    `Avoid: ${sentenceList([...definition.avoid, template.negativePrompt])}`,
    definition.contentLayerNote ? `Content-layer guardrail: ${definition.contentLayerNote}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  return applyVisualMediaBcnStyle(prompt);
}
