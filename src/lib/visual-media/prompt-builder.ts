import type {
  VisualMediaGenerationTarget,
  VisualMediaPlacementDefinition
} from "@/lib/visual-media/types";

const BCN_BASE_STYLE =
  "Premium cinematic business environment for The Business Circle Network. Dark editorial atmosphere with deep royal blue tones, warm gold lighting accents, high contrast shadows, soft directional lighting, luxury interior, modern executive setting. Clean, minimal, high-trust composition. Realistic photography style. 35mm lens look. Depth of field.";

const STRICT_EXCLUSIONS = [
  "no text",
  "no logos",
  "no branding marks",
  "no UI elements",
  "no dashboards",
  "no graphs",
  "no overlays",
  "no cartoon style",
  "no exaggerated AI look",
  "no generic stock photo feel",
  "no bright white office",
  "no smiling team looking at camera"
];

const COMPOSITION_RULES = [
  "cinematic framing",
  "strong foreground, subject, and background depth",
  "negative space suitable for web cropping",
  "warm lighting accents",
  "calm, not busy",
  "one clear subject or moment",
  "flexible crop for responsive layouts",
  "no important visual information too close to the edges"
];

const GENERIC_VISUAL_MEDIA_PROMPT =
  "Create a premium editorial business image for The Business Circle Network. Show a high-trust founder or business-owner environment inside a refined dark executive workspace, with calm authority and a clean composition.";

const DISALLOWED_POSITIVE_TERMS = /\b(dashboard|dashboards|graph|graphs|ui|user interface|logo|logos|text overlay|watermark)\b/i;

function sentenceList(items: string[]) {
  return items.filter(Boolean).join("; ");
}

function safeSlotCues(items: string[]) {
  return items.filter((item) => !DISALLOWED_POSITIVE_TERMS.test(item));
}

function targetComposition(target: VisualMediaGenerationTarget) {
  if (target === "both") {
    return "Create a composition that works for both desktop and mobile crops. Keep the main subject central with enough negative space around it. Avoid important details at the edges.";
  }

  if (target === "mobile") {
    return "Mobile crop guidance: keep the main subject central, clean, and crop-safe for narrow screens.";
  }

  return "Desktop crop guidance: compose as a wide editorial image with clean negative space and strong visual balance.";
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function buildTopicScene(definition: VisualMediaPlacementDefinition) {
  const context = [
    definition.label,
    definition.page,
    definition.section,
    definition.imagePurpose,
    definition.longAdminGuidance,
    ...definition.recommendedSubjectMatter,
    ...definition.emotionalTone
  ]
    .join(" ")
    .toLowerCase();

  if (includesAny(context, ["decision", "judgement", "choice", "priorit"])) {
    return "business owner reviewing notes, pen in hand, focused expression, decision-making moment, notebook and documents on desk";
  }

  if (includesAny(context, ["strategy", "strategic", "roadmap", "direction", "positioning"])) {
    return "planning session, structured desk layout, diagrams on paper, thinking posture, controlled executive workspace";
  }

  if (includesAny(context, ["operation", "process", "workflow", "system", "delivery"])) {
    return "organised workspace, process boards, systems thinking, tools arranged neatly, calm operational structure";
  }

  if (includesAny(context, ["growth", "scale", "momentum", "expanding"])) {
    return "expanding workspace, multiple screens with no visible interface detail, controlled scaling energy, founder reviewing movement and direction";
  }

  if (includesAny(context, ["leadership", "trust", "conversation", "connection", "founder-led"])) {
    return "conversation between two professionals, calm authority, trust-building discussion, serious but composed atmosphere";
  }

  if (includesAny(context, ["focus", "clarity", "priority", "noise"])) {
    return "single subject, minimal desk, isolated lighting, deep thinking moment, quiet business pressure";
  }

  if (includesAny(context, ["community", "member", "network", "private room"])) {
    return "premium private business room, calm conversation, owners connecting with purpose, no crowd, high-trust atmosphere";
  }

  if (includesAny(context, ["event", "roundtable", "room"])) {
    return "premium roundtable setting, warm lighting, thoughtful conversation, private business event atmosphere";
  }

  if (includesAny(context, ["resource", "library", "insight", "intelligence"])) {
    return "quiet premium reading and planning workspace, notebook, laptop with no visible interface detail, calm library-like business atmosphere";
  }

  if (includesAny(context, ["founder service", "advisory", "service offer", "methodology"])) {
    return "focused one-to-one advisory setting, notes, laptop, strategic conversation, premium private office";
  }

  return "refined founder/business-owner moment in a private executive workspace, calm commercial focus, serious but composed atmosphere";
}

function buildSlotSceneLayer(definition: VisualMediaPlacementDefinition) {
  const template = definition.promptTemplate;
  const safeSubjects = safeSlotCues([
    template.subject,
    ...definition.recommendedSubjectMatter
  ]);
  const safeComposition = safeSlotCues([
    template.cameraComposition,
    ...definition.recommendedComposition
  ]);

  return [
    `Slot title: ${definition.label}`,
    `Page context: ${definition.page.toLowerCase()} / ${definition.section}`,
    `Slot direction: ${definition.longAdminGuidance}`,
    `Scene: ${buildTopicScene(definition)}`,
    safeSubjects.length ? `Slot-specific subject cues: ${sentenceList(safeSubjects)}` : "",
    `Environment: ${template.environment}`,
    safeComposition.length ? `Composition guidance: ${sentenceList(safeComposition)}` : "",
    `Lighting and mood: ${sentenceList([
      template.lighting,
      template.mood,
      ...definition.recommendedLightingMood,
      ...definition.emotionalTone
    ])}`,
    `Avoid for this slot: ${sentenceList([
      ...definition.avoid,
      template.negativePrompt,
      ...STRICT_EXCLUSIONS
    ])}`,
    definition.contentLayerNote ? `Content-layer guardrail: ${definition.contentLayerNote}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function applyVisualMediaBcnStyle(
  prompt: string,
  options: { target?: VisualMediaGenerationTarget } = {}
) {
  const trimmed = prompt.trim() || GENERIC_VISUAL_MEDIA_PROMPT;
  const target = options.target ?? "desktop";

  if (trimmed.includes("BCN BASE STYLE") && trimmed.includes("COMPOSITION RULES")) {
    return trimmed;
  }

  return [
    trimmed,
    "",
    "BCN BASE STYLE",
    BCN_BASE_STYLE,
    "",
    "COMPOSITION RULES",
    sentenceList([...COMPOSITION_RULES, targetComposition(target)]),
    "",
    "STRICT EXCLUSIONS",
    sentenceList(STRICT_EXCLUSIONS)
  ].join("\n");
}

export function buildVisualMediaImagePrompt(input: {
  definition: VisualMediaPlacementDefinition | null | undefined;
  target: VisualMediaGenerationTarget;
}) {
  const { definition, target } = input;

  if (!definition) {
    return applyVisualMediaBcnStyle(GENERIC_VISUAL_MEDIA_PROMPT, { target });
  }

  return [
    "Create a premium editorial business image for a BCN visual media placement.",
    "",
    "BCN BASE STYLE",
    BCN_BASE_STYLE,
    "",
    "TOPIC / SLOT SCENE LAYER",
    buildSlotSceneLayer(definition),
    "",
    "COMPOSITION RULES",
    sentenceList([...COMPOSITION_RULES, targetComposition(target)]),
    "",
    "STRICT EXCLUSIONS",
    sentenceList(STRICT_EXCLUSIONS)
  ].join("\n");
}
