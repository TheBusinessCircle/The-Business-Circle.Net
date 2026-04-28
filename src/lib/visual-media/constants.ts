import type {
  VisualMediaOverlayStyle,
  VisualMediaPage
} from "@prisma/client";
import type {
  VisualMediaImageFamilyTag,
  VisualMediaPlacementDefinition,
  VisualMediaPromptTemplate
} from "@/lib/visual-media/types";

type RegistryItem = VisualMediaPlacementDefinition & {
  defaultOverlayStyle?: VisualMediaOverlayStyle;
};

function buildQualityChecklist(input: {
  imageFamilyTag: VisualMediaImageFamilyTag;
  isHero?: boolean;
}) {
  const items = [
    "Matches the slot purpose",
    "Fits BCN premium tone",
    "Subject matter is relevant",
    "Not too bright or noisy",
    "Feels credible and high-trust",
    "No watermarks",
    "Not obviously cheesy stock imagery"
  ];

  if (input.isHero) {
    items.push("Text will remain readable over the image");
    items.push("Crops well on mobile");
  }

  if (input.imageFamilyTag === "platform-mockup" || input.imageFamilyTag === "editorial-insight") {
    items.push("Composition feels clean and structured");
  }

  return items;
}

function createPromptTemplate(template: VisualMediaPromptTemplate) {
  return template;
}

export const VISUAL_MEDIA_PLACEMENTS = {
  HOME_HERO: {
    key: "home.hero",
    label: "Homepage - Top Visual",
    page: "HOME",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Used as the first visual section above the homepage content.",
    imageFamilyTag: "cinematic-atmosphere",
    adminPreviewFamily: "hero",
    imagePurpose: "Set the tone for the whole BCN experience immediately.",
    bestImageType: "Cinematic premium atmosphere.",
    emotionalTone: ["private", "premium", "calm power", "authority", "entry into a serious environment"],
    recommendedSubjectMatter: [
      "dark luxury office",
      "skyline view from a premium interior",
      "executive environment",
      "refined business setting",
      "high-end workspace with depth",
      "serious founder-world energy"
    ],
    recommendedComposition: [
      "strong wide composition",
      "enough negative space for headline and CTA readability",
      "avoid overcrowded detail behind text",
      "focal point should support the page, not dominate it"
    ],
    recommendedLightingMood: [
      "dark premium",
      "moody",
      "editorial",
      "elegant highlights",
      "not neon-heavy"
    ],
    avoid: [
      "bright coworking spaces",
      "cheesy smiling teams",
      "handshake imagery",
      "generic laptops on white desks",
      "exaggerated AI glow",
      "anything too busy behind hero text"
    ],
    longAdminGuidance:
      "Choose an image that feels like entering a serious private business environment. This is not a generic startup hero. It should feel premium, quiet, and powerful, with room for readable headline text.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "cinematic-atmosphere",
      isHero: true
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Cinematic premium atmosphere that introduces the platform.",
      sceneType: "Cinematic luxury business environment.",
      subject:
        "High-end office interior overlooking a city skyline at night, with minimal people or silhouettes only.",
      environment:
        "Modern executive setting with clean glass reflections and subtle architectural detail.",
      lighting: "Dark moody lighting with soft highlights.",
      mood: "Calm and powerful atmosphere.",
      style: "Editorial photography style, ultra realistic, high dynamic range.",
      cameraComposition:
        "Professional 16:9 wide shot with deep depth of field and negative space for headline and CTA text.",
      qualityTags:
        "Premium brand aesthetic, realistic detail, no watermark, no text in image, polished cinematic finish.",
      negativePrompt:
        "bright office, busy crowd, smiling team, cartoon style, low quality, watermark, text overlay, cluttered background"
    }),
    defaultOverlayStyle: "CINEMATIC"
  },
  HOME_CONNECTION: {
    key: "home.section.connection",
    label: "Homepage - Founder / Trust Section",
    page: "HOME",
    section: "connection",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Supports the founder-led trust section near the end of the homepage.",
    imageFamilyTag: "founder-conversation",
    adminPreviewFamily: "human",
    imagePurpose:
      "Support the emotional message of real connection, trust, and meaningful conversation.",
    bestImageType: "Founder interaction or strategic conversation.",
    emotionalTone: ["trust", "depth", "real conversation", "human credibility", "support without noise"],
    recommendedSubjectMatter: [
      "two or three serious people in discussion",
      "private meeting moment",
      "thoughtful strategic conversation",
      "founder collaboration",
      "calm trust-based interaction"
    ],
    recommendedComposition: [
      "medium shot or environmental portrait style",
      "should feel natural, not overly posed",
      "image should sit well beside text",
      "avoid visual clutter"
    ],
    recommendedLightingMood: ["warm-dark premium", "calm", "grounded", "editorial realism"],
    avoid: [
      "big corporate teams",
      "staged laughing stock imagery",
      "fake office celebration scenes",
      "obvious call-centre energy"
    ],
    longAdminGuidance:
      "This image should reinforce that BCN is built around real conversations and serious interaction. Choose something that feels human, credible, and intentional rather than flashy or generic.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "founder-conversation"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Real, meaningful founder conversation and trust.",
      sceneType: "Founder interaction and strategic conversation scene.",
      subject:
        "Two or three business professionals in a quiet, focused conversation with serious expressions and subtle gestures.",
      environment:
        "Seated in a modern premium workspace with a realistic, uncluttered environment.",
      lighting: "Soft warm lighting.",
      mood: "Intimate, professional, calm, and credible.",
      style: "Documentary editorial style, ultra realistic.",
      cameraComposition:
        "Clean medium-shot composition with shallow depth of field that sits comfortably beside supporting text.",
      qualityTags:
        "High-end business tone, natural interaction, no exaggerated emotion, no watermark, no text in image.",
      negativePrompt:
        "large group, fake smiling, corporate stock pose, call center, bright lighting, chaotic scene"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  HOME_PLATFORM: {
    key: "home.section.platform",
    label: "Homepage - Inside The Network",
    page: "HOME",
    section: "platform",
    variant: "SECTION",
    sortOrder: 30,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Visual showing the BCN ecosystem, member environment, and structured platform.",
    imageFamilyTag: "platform-mockup",
    adminPreviewFamily: "editorial",
    imagePurpose: "Show the structured ecosystem and digital side of BCN.",
    bestImageType: "Platform mockup, ecosystem preview, or premium product-led visual.",
    emotionalTone: ["clarity", "structure", "sophistication", "credibility", "modern premium function"],
    recommendedSubjectMatter: [
      "desktop and mobile platform mockup",
      "refined dashboard view",
      "dark premium member environment",
      "ecosystem interface",
      "structured digital experience"
    ],
    recommendedComposition: [
      "clean framing",
      "crisp details",
      "not too many tiny unreadable UI elements",
      "visual should feel premium and believable"
    ],
    recommendedLightingMood: ["sharp", "clean", "restrained", "polished"],
    avoid: [
      "cluttered dashboards",
      "rainbow SaaS UI",
      "low-quality fake dashboard renders",
      "cartoon app illustrations"
    ],
    longAdminGuidance:
      "Use this slot to show that BCN is a real structured environment, not just an idea. Mockups should feel premium, dark, and editorial rather than overly technical or gimmicky.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "platform-mockup"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium platform and ecosystem visual.",
      sceneType: "Premium product-led platform mockup.",
      subject:
        "High-end dark premium business dashboard displayed on a modern laptop and mobile device.",
      environment:
        "Clean premium interface environment with glassmorphism elements, minimal layout, and controlled reflections.",
      lighting: "Cinematic lighting with sharp screen detail.",
      mood: "Structured, sophisticated, and credible.",
      style: "Realistic product-shot style, ultra clean composition.",
      cameraComposition:
        "Balanced device framing with shallow depth of field and a sharp focal plane on the interface.",
      qualityTags:
        "High resolution, premium fintech aesthetic, believable UI, no watermark, no text baked into the image.",
      negativePrompt:
        "colorful cluttered UI, cartoon interface, fake UI, low resolution, watermark"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  HOME_JOIN: {
    key: "home.section.join",
    label: "Homepage - What Happens When You Join",
    page: "HOME",
    section: "join",
    variant: "SECTION",
    sortOrder: 25,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Visual showing the member environment, resources, calls, collaborations, and owner activity.",
    imageFamilyTag: "platform-mockup",
    adminPreviewFamily: "editorial",
    imagePurpose:
      "Show what membership feels like in practice once someone steps inside the network.",
    bestImageType: "Premium member-environment visual or refined platform-led story scene.",
    emotionalTone: [
      "clarity",
      "activity with control",
      "serious participation",
      "premium structure",
      "credible momentum"
    ],
    recommendedSubjectMatter: [
      "dark-mode workspace or member environment",
      "platform mockup with discussion, resources, and calls visible",
      "owner activity shown in a calm premium way",
      "collaboration or resource-led visual storytelling",
      "structured ecosystem moment"
    ],
    recommendedComposition: [
      "wide composition that feels premium and easy to read",
      "show enough structure to feel real without becoming cluttered",
      "should support adjacent cards or explanatory copy",
      "avoid tiny unreadable UI detail"
    ],
    recommendedLightingMood: ["dark premium", "clean", "structured", "editorial realism"],
    avoid: [
      "cartoon dashboard renders",
      "generic networking events",
      "chaotic multi-screen overload",
      "rainbow SaaS visuals"
    ],
    longAdminGuidance:
      "Use this slot to make membership feel tangible. It should show what happens once a member joins: structured rooms, useful resources, live discussion, and visible movement inside a premium environment.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "platform-mockup"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium visual storytelling for what happens when someone joins BCN.",
      sceneType: "Member-environment and ecosystem story visual.",
      subject:
        "Dark premium business platform environment showing discussion rooms, resource access, calls, and collaboration in a believable way.",
      environment:
        "Refined founder-world workspace with laptop and mobile context, subtle interface detail, and a calm premium atmosphere.",
      lighting: "Controlled moody lighting with crisp interface detail.",
      mood: "Structured, credible, active, and calm.",
      style: "Editorial product-storytelling style, ultra realistic.",
      cameraComposition:
        "Wide clean composition with a clear focal plane, believable depth, and enough negative space to sit beside section copy.",
      qualityTags:
        "Premium dark-mode aesthetic, believable interface detail, no watermark, no text baked into the image, polished and realistic.",
      negativePrompt:
        "busy dashboard clutter, cartoon ui, event photography, bright coworking chaos, watermark"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  HOME_ROOMS_PREVIEW: {
    key: "home.section.roomsPreview",
    label: "Homepage - Rooms Preview",
    page: "HOME",
    section: "rooms-preview",
    variant: "SECTION",
    sortOrder: 26,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Shows structured discussion rooms and business owner conversations.",
    imageFamilyTag: "founder-conversation",
    adminPreviewFamily: "human",
    imagePurpose: "Make the private-room layer feel tangible and credible.",
    bestImageType: "Focused owner conversation or structured room imagery.",
    emotionalTone: ["focus", "privacy", "signal", "serious conversation", "trust"],
    recommendedSubjectMatter: [
      "small owner discussion room",
      "private strategic conversation",
      "quiet premium meeting setting",
      "serious business-owner exchange"
    ],
    recommendedComposition: [
      "show depth and conversation without crowding",
      "keep the scene calm and structured",
      "allow the image to support a premium card layout"
    ],
    recommendedLightingMood: ["warm-dark", "premium", "calm", "credible"],
    avoid: [
      "event photography",
      "conference crowds",
      "social-media style chatter",
      "forced smiling team shots"
    ],
    longAdminGuidance:
      "Use this slot to show that private rooms inside BCN feel thoughtful, structured, and useful. It should feel like a better room for serious owners, not a generic networking event.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "founder-conversation"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium structured room and owner conversation preview.",
      sceneType: "Private business conversation scene.",
      subject:
        "Two or three business owners in a focused discussion inside a refined private workspace.",
      environment:
        "Quiet premium room with subtle materials, believable detail, and no visual clutter.",
      lighting: "Warm premium lighting.",
      mood: "Structured, serious, and calm.",
      style: "Editorial business photography, ultra realistic.",
      cameraComposition:
        "Balanced medium-wide composition that suggests a private room and meaningful discussion.",
      qualityTags:
        "Premium realism, believable interaction, no watermark, no text in image, strong trust cues.",
      negativePrompt:
        "conference crowd, networking event, staged laughter, bright coworking space, clutter"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  HOME_RESOURCES_PREVIEW: {
    key: "home.section.resourcesPreview",
    label: "Homepage - Resources Preview",
    page: "HOME",
    section: "resources-preview",
    variant: "SECTION",
    sortOrder: 27,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Shows tiered resources, business insights, and practical support.",
    imageFamilyTag: "editorial-insight",
    adminPreviewFamily: "editorial",
    imagePurpose: "Show the practical support layer inside BCN through resources and insights.",
    bestImageType: "Editorial resource or knowledge-layer visual.",
    emotionalTone: ["clarity", "support", "structure", "usefulness", "editorial quality"],
    recommendedSubjectMatter: [
      "refined member resource interface",
      "editorial workspace with insight materials",
      "tiered knowledge or business support visual"
    ],
    recommendedComposition: [
      "clean and editorial",
      "easy to crop within a premium card",
      "suggest value without overwhelming detail"
    ],
    recommendedLightingMood: ["clean", "dark editorial", "sharp", "polished"],
    avoid: [
      "generic e-learning visuals",
      "busy library clichés",
      "screen clutter",
      "bright classroom imagery"
    ],
    longAdminGuidance:
      "Use this slot to make the resource layer feel practical and premium. It should suggest real support for decisions and progress, not content for content's sake.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "editorial-insight"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Editorial business resources and insight preview.",
      sceneType: "Premium resource and support visual.",
      subject:
        "Refined dark-mode resource interface with notebooks, strategic prompts, and subtle insight context.",
      environment:
        "Premium editorial workspace with structured materials and believable business support cues.",
      lighting: "Clean controlled lighting.",
      mood: "Useful, calm, and intelligent.",
      style: "Editorial product-storytelling style, ultra realistic.",
      cameraComposition:
        "Clean structured composition that shows value quickly without becoming visually noisy.",
      qualityTags:
        "Editorial clarity, premium detail, no watermark, no baked text, practical business support tone.",
      negativePrompt:
        "classroom, clutter, chaotic dashboard, bright content-marketing imagery"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  HOME_CALLS_PREVIEW: {
    key: "home.section.callsPreview",
    label: "Homepage - 1-to-1 Calls Preview",
    page: "HOME",
    section: "calls-preview",
    variant: "SECTION",
    sortOrder: 28,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Shows member-to-member calls or focused owner conversations.",
    imageFamilyTag: "founder-conversation",
    adminPreviewFamily: "human",
    imagePurpose: "Support the idea of direct access and useful conversations between owners.",
    bestImageType: "Focused call or premium owner-to-owner conversation scene.",
    emotionalTone: ["direct access", "support", "focus", "credibility", "privacy"],
    recommendedSubjectMatter: [
      "video call between owners",
      "owner-to-owner strategic conversation",
      "quiet premium workspace during a call"
    ],
    recommendedComposition: [
      "show human connection without looking casual or consumer-tech",
      "keep it premium and believable",
      "work well in a feature card"
    ],
    recommendedLightingMood: ["warm premium", "focused", "calm"],
    avoid: [
      "generic headset support imagery",
      "call-centre energy",
      "messy desk scenes"
    ],
    longAdminGuidance:
      "This slot should help the call layer feel valuable, focused, and owner-to-owner. It should feel like access to useful conversation, not generic customer support.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "founder-conversation"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium owner-to-owner call preview.",
      sceneType: "Focused business call scene.",
      subject:
        "Business owner in a refined workspace taking part in a focused one-to-one video call.",
      environment:
        "Premium calm desk setup with subtle interface context and a believable work atmosphere.",
      lighting: "Soft warm lighting.",
      mood: "Direct, useful, and calm.",
      style: "Editorial business photography, ultra realistic.",
      cameraComposition:
        "Natural composition with enough environment detail to suggest a meaningful private call.",
      qualityTags:
        "Premium founder-world realism, no watermark, no text in image, credible business atmosphere.",
      negativePrompt:
        "call center, headset sales, messy desk, casual selfie, consumer tech ad"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  HOME_COLLABORATIONS_PREVIEW: {
    key: "home.section.collaborationsPreview",
    label: "Homepage - Collaborations Preview",
    page: "HOME",
    section: "collaborations-preview",
    variant: "SECTION",
    sortOrder: 29,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Shows aligned business owners working together.",
    imageFamilyTag: "founder-conversation",
    adminPreviewFamily: "human",
    imagePurpose: "Show that useful collaboration and aligned opportunities happen inside the network.",
    bestImageType: "Premium collaboration scene between serious owners.",
    emotionalTone: ["alignment", "opportunity", "trust", "progress", "serious collaboration"],
    recommendedSubjectMatter: [
      "two owners planning together",
      "collaborative workspace moment",
      "strategy session between aligned operators"
    ],
    recommendedComposition: [
      "human and believable",
      "should feel commercially relevant rather than social",
      "works inside a polished card layout"
    ],
    recommendedLightingMood: ["warm-dark", "grounded", "premium"],
    avoid: [
      "corporate teamwork clichés",
      "high-five imagery",
      "generic agency collaboration shots"
    ],
    longAdminGuidance:
      "This slot should suggest that meaningful collaboration happens naturally in a better room. Keep it grounded, premium, and commercially credible.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "founder-conversation"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium collaboration preview for aligned owners.",
      sceneType: "Strategic collaboration scene.",
      subject:
        "Two business owners working together in a refined premium workspace with notes and laptops present.",
      environment:
        "Calm modern business setting that feels commercially serious and uncluttered.",
      lighting: "Soft warm editorial lighting.",
      mood: "Aligned, useful, and grounded.",
      style: "Editorial photography, ultra realistic.",
      cameraComposition:
        "Balanced collaborative composition with believable gestures and no staged energy.",
      qualityTags:
        "Credible founder collaboration, premium realism, no watermark, no text in image.",
      negativePrompt:
        "teamwork stock photo, high five, startup culture cliché, loud office"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  HOME_WINS_PREVIEW: {
    key: "home.section.winsPreview",
    label: "Homepage - Wins Preview",
    page: "HOME",
    section: "wins-preview",
    variant: "SECTION",
    sortOrder: 31,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Shows member progress, business wins, and shared momentum.",
    imageFamilyTag: "editorial-insight",
    adminPreviewFamily: "editorial",
    imagePurpose: "Make visible progress and shared wins feel real inside BCN.",
    bestImageType: "Premium progress or business-win storytelling visual.",
    emotionalTone: ["progress", "momentum", "evidence", "confidence", "shared movement"],
    recommendedSubjectMatter: [
      "business progress moment",
      "owner reviewing positive movement",
      "premium visual metaphor for traction and progress"
    ],
    recommendedComposition: [
      "clean and optimistic without hype",
      "should feel measured and credible",
      "easy to crop into a feature card"
    ],
    recommendedLightingMood: ["clear", "premium", "editorial", "uplifting but restrained"],
    avoid: [
      "celebration clichés",
      "confetti visuals",
      "sales-hype imagery"
    ],
    longAdminGuidance:
      "This slot should make momentum visible without becoming loud or salesy. Think evidence of movement, useful progress, and shared wins in a serious room.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "editorial-insight"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Visible member progress and wins preview.",
      sceneType: "Premium business progress storytelling visual.",
      subject:
        "Business owner reviewing signs of real progress in a premium workspace with subtle success cues.",
      environment:
        "Refined business setting with restrained visual detail and a clear sense of forward movement.",
      lighting: "Balanced editorial lighting.",
      mood: "Measured, positive, and credible.",
      style: "Editorial product-storytelling style, ultra realistic.",
      cameraComposition:
        "Clean composition with subtle motion or progress cues, avoiding hype or exaggerated celebration.",
      qualityTags:
        "Premium realism, no watermark, no baked text, restrained success tone.",
      negativePrompt:
        "confetti, hype marketing, loud success imagery, exaggerated celebration"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  HOME_ECOSYSTEM_MAP: {
    key: "home.section.ecosystemMap",
    label: "Homepage - Network Ecosystem Map",
    page: "HOME",
    section: "ecosystem-map",
    variant: "SECTION",
    sortOrder: 32,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Shows how profiles, rooms, resources, calls, wins, and collaborations connect.",
    imageFamilyTag: "platform-mockup",
    adminPreviewFamily: "editorial",
    imagePurpose: "Show BCN as one connected operating environment rather than isolated features.",
    bestImageType: "Ecosystem map or connected-platform visual.",
    emotionalTone: ["structure", "connection", "system", "clarity", "premium function"],
    recommendedSubjectMatter: [
      "connected platform map",
      "ecosystem diagram visual",
      "member environment with linked layers"
    ],
    recommendedComposition: [
      "clear and structured",
      "show relationships between layers",
      "avoid clutter and unreadable micro detail"
    ],
    recommendedLightingMood: ["clean", "sharp", "premium", "controlled"],
    avoid: [
      "generic network node graphics",
      "crypto-style diagrams",
      "rainbow feature maps"
    ],
    longAdminGuidance:
      "Use this slot to make the ecosystem feel connected. It should show how profiles, rooms, resources, calls, wins, collaborations, and insights work together as one environment.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "platform-mockup"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium ecosystem map for the BCN operating environment.",
      sceneType: "Connected platform and ecosystem visual.",
      subject:
        "Refined dark-mode ecosystem map linking member profiles, rooms, resources, calls, wins, collaborations, and insights.",
      environment:
        "Premium digital interface environment with clean nodes, cards, and connection lines.",
      lighting: "Sharp controlled interface lighting.",
      mood: "Structured, clear, and sophisticated.",
      style: "Realistic premium interface render, ultra clean composition.",
      cameraComposition:
        "Wide structured composition that shows the ecosystem clearly without visual clutter.",
      qualityTags:
        "Premium dark-mode system map, believable UI, no watermark, no baked text, crisp detail.",
      negativePrompt:
        "neon network graphic, crypto chart feel, rainbow interface, clutter, low-res"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  JOIN_HERO: {
    key: "join.hero",
    label: "Join Page - Top Visual",
    page: "JOIN",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Used as the first visual section above the join flow.",
    imageFamilyTag: "cinematic-atmosphere",
    adminPreviewFamily: "hero",
    imagePurpose:
      "Make the join page feel like an intentional entry point into a private environment.",
    bestImageType: "Exclusive entry atmosphere.",
    emotionalTone: ["exclusivity", "access", "invitation with standards", "seriousness", "belonging"],
    recommendedSubjectMatter: [
      "premium doorway or threshold feeling",
      "luxury meeting space",
      "calm dark architectural business environment",
      "subtle sense of access or invitation",
      "founder-world atmosphere"
    ],
    recommendedComposition: [
      "cinematic framing",
      "enough calm space for text",
      "avoid clutter and distraction",
      "should feel immersive but restrained"
    ],
    recommendedLightingMood: ["dark", "elegant", "directional light", "premium atmosphere"],
    avoid: [
      "hype visuals",
      "nightclub vibe",
      "overdramatic gold overload",
      "obvious sales-funnel imagery"
    ],
    longAdminGuidance:
      "This image should make the page feel like stepping into a room that is not open to everyone. It should feel selective, premium, and calm rather than loud or flashy.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "cinematic-atmosphere",
      isHero: true
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Exclusive entry into a private environment.",
      sceneType: "Exclusive entry atmosphere.",
      subject:
        "Elegant private business environment entrance with a subtle doorway or threshold feeling.",
      environment:
        "Modern luxury meeting space with dark architectural design and a minimal high-end interior.",
      lighting: "Soft directional lighting.",
      mood: "Moody, exclusive, calm, and selective.",
      style: "Cinematic editorial style, ultra realistic.",
      cameraComposition:
        "Immersive wide composition with enough calm open space for readable hero text.",
      qualityTags:
        "Premium architectural detail, restrained styling, no watermark, no text in image, refined high-end finish.",
      negativePrompt:
        "party scene, bright lighting, crowded room, nightclub, flashy gold"
    }),
    defaultOverlayStyle: "DARK"
  },
  JOIN_INSIDE: {
    key: "join.section.inside",
    label: "Join Page Inside Section",
    page: "JOIN",
    section: "inside",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Best for showing what it feels like inside BCN.",
    imageFamilyTag: "founder-conversation",
    adminPreviewFamily: "human",
    imagePurpose: "Show what it feels like once inside BCN.",
    bestImageType: "Human premium participation imagery.",
    emotionalTone: ["depth", "focus", "clarity", "meaningful access", "real participation"],
    recommendedSubjectMatter: [
      "focused conversation",
      "founder in thoughtful workspace",
      "small strategic group",
      "calm work-and-discussion environment",
      "purposeful engagement"
    ],
    recommendedComposition: [
      "more human and grounded than the hero",
      "natural environment",
      "should feel believable and warm-premium"
    ],
    recommendedLightingMood: ["warm-dark", "calm", "focused", "subtle sophistication"],
    avoid: [
      "staged networking event photos",
      "crowded room scenes",
      "fake applause moments"
    ],
    longAdminGuidance:
      "Choose an image that helps the user imagine being inside the environment. It should suggest participation, clarity, and serious business conversation rather than generic networking.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "founder-conversation"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "What it feels like inside BCN.",
      sceneType: "Human premium participation scene.",
      subject:
        "Focused entrepreneur working in a calm premium workspace with a laptop open, notes nearby, and a thoughtful posture.",
      environment:
        "Quiet, realistic desk setup that feels warm, intentional, and professionally grounded.",
      lighting: "Warm low lighting.",
      mood: "Calm, focused, and intentional.",
      style: "Editorial business photography, ultra realistic.",
      cameraComposition:
        "Natural composition with shallow depth of field and a believable working posture rather than a staged pose.",
      qualityTags:
        "Premium workspace tone, realistic detail, no watermark, no text in image, credible founder-world atmosphere.",
      negativePrompt:
        "messy desk, chaotic environment, bright lighting, fake pose"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  JOIN_AFTER_PAYMENT: {
    key: "join.section.afterPayment",
    label: "Join - After Payment Journey Visual",
    page: "JOIN",
    section: "after-payment",
    variant: "SECTION",
    sortOrder: 25,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Shows what happens after payment: profile, access, resources, rooms, and calls.",
    imageFamilyTag: "platform-mockup",
    adminPreviewFamily: "editorial",
    imagePurpose:
      "Reduce checkout hesitation by making the post-payment journey feel clear and tangible.",
    bestImageType: "Premium member onboarding or ecosystem-access visual.",
    emotionalTone: ["clarity", "trust", "structure", "progression", "calm confidence"],
    recommendedSubjectMatter: [
      "member onboarding flow",
      "premium dashboard or access journey",
      "profile, resources, and room access visual",
      "structured progress through the member environment"
    ],
    recommendedComposition: [
      "should show progression without clutter",
      "works well beside a checklist",
      "keep interface detail believable and premium",
      "avoid busy screen overload"
    ],
    recommendedLightingMood: ["clean", "dark premium", "structured", "polished"],
    avoid: [
      "checkout screens only",
      "generic payment imagery",
      "chaotic dashboard clutter",
      "consumer-app onboarding styles"
    ],
    longAdminGuidance:
      "Use this slot to reassure people what happens after payment. It should show access opening into a premium member environment with profile setup, resources, rooms, and useful next steps.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "platform-mockup"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium post-payment onboarding journey.",
      sceneType: "Member access and onboarding visual.",
      subject:
        "Dark premium business platform showing profile completion, room access, resource navigation, and member activity in a believable way.",
      environment:
        "Refined founder-world workspace with a laptop and mobile screen showing a calm onboarding journey.",
      lighting: "Controlled moody lighting with crisp screen detail.",
      mood: "Clear, reassuring, and premium.",
      style: "Editorial product-storytelling style, ultra realistic.",
      cameraComposition:
        "Wide clean composition with a clear focal plane, believable depth, and enough negative space to sit beside checklist copy.",
      qualityTags:
        "Premium dark-mode aesthetic, believable interface detail, no watermark, no text baked into the image, polished and realistic.",
      negativePrompt:
        "generic payment graphic, cluttered ui, cartoon interface, bright consumer app, watermark"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  MEMBERSHIP_HERO: {
    key: "membership.hero",
    label: "Membership Page - Top Visual",
    page: "MEMBERSHIP",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Used as the first visual section above the membership content.",
    imageFamilyTag: "cinematic-atmosphere",
    adminPreviewFamily: "hero",
    imagePurpose: "Elevate the membership page and support premium room selection.",
    bestImageType: "Structured premium environment.",
    emotionalTone: ["value", "structure", "seriousness", "quality", "premium access"],
    recommendedSubjectMatter: [
      "refined private workspace",
      "premium meeting environment",
      "calm business architecture",
      "sophisticated interior or strategy environment"
    ],
    recommendedComposition: [
      "calm composition",
      "good readability behind pricing and page copy",
      "not too dramatic",
      "should support trust and value"
    ],
    recommendedLightingMood: ["dark premium", "balanced", "elegant", "controlled"],
    avoid: [
      "overly emotional people shots",
      "anything that confuses pricing clarity",
      "bright retail-style imagery"
    ],
    longAdminGuidance:
      "This image should support the idea that membership gives access to a serious, valuable environment. It should feel premium and structured without distracting from the actual offer.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "cinematic-atmosphere",
      isHero: true
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium structured environment for membership.",
      sceneType: "Structured premium membership environment.",
      subject:
        "Modern high-end office interior with a structured layout, minimal design, and clean architectural lines.",
      environment:
        "Calm premium business setting with no clutter and subtle reflections that support trust and value.",
      lighting: "Soft balanced lighting.",
      mood: "Calm, premium, serious, and valuable.",
      style: "Professional editorial style, ultra realistic.",
      cameraComposition:
        "Wide cinematic framing with clear readability behind pricing and membership copy.",
      qualityTags:
        "Premium composition, restrained detail, no watermark, no text in image, high-end business atmosphere.",
      negativePrompt:
        "crowded space, cheap office, bright lighting, stock feel"
    }),
    defaultOverlayStyle: "DARK"
  },
  MEMBERSHIP_ROOMS: {
    key: "membership.section.rooms",
    label: "Membership Rooms Section",
    page: "MEMBERSHIP",
    section: "rooms",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Best for structured access and progression.",
    imageFamilyTag: "platform-mockup",
    adminPreviewFamily: "editorial",
    imagePurpose: "Visually reinforce structure, progression, and organised access.",
    bestImageType: "Structured access, architectural, or ecosystem visual.",
    emotionalTone: ["order", "progression", "design", "intentional access", "organisation"],
    recommendedSubjectMatter: [
      "layered spaces",
      "refined meeting zones",
      "premium architectural business interior",
      "ecosystem-style visual metaphor",
      "clean digital structure visual"
    ],
    recommendedComposition: [
      "should feel structured",
      "ideally directional or layered",
      "works well beside explanatory copy",
      "not overly literal if metaphorical imagery is used"
    ],
    recommendedLightingMood: ["calm", "premium", "structured", "precise"],
    avoid: [
      "chaotic open-office scenes",
      "crowded event images",
      "generic teamwork stock"
    ],
    longAdminGuidance:
      "This slot should help users feel that BCN membership is intentionally designed, with clear spaces and levels rather than noise or randomness.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "platform-mockup"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Structure, access, and progression.",
      sceneType: "Structured access and progression visual.",
      subject:
        "Layered architectural business space with multiple levels or zones subtly visible.",
      environment:
        "Clean modern design with calm gradients and a conceptual sense of ordered access.",
      lighting: "Soft lighting gradients.",
      mood: "Calm, structured, and intentional.",
      style: "Minimal ultra-realistic conceptual editorial imagery.",
      cameraComposition:
        "Structured composition with directional lines that reinforce progression without feeling literal or busy.",
      qualityTags:
        "Premium architectural tone, minimal clutter, believable detail, no watermark, no text in image.",
      negativePrompt:
        "chaotic space, messy layout, crowded office, random objects"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  MEMBERSHIP_TIER_COMPARISON: {
    key: "membership.section.tierComparison",
    label: "Membership - Tier Comparison Visual",
    page: "MEMBERSHIP",
    section: "tier-comparison",
    variant: "SECTION",
    sortOrder: 25,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Supports the membership decision and makes tiers easier to compare.",
    imageFamilyTag: "platform-mockup",
    adminPreviewFamily: "editorial",
    imagePurpose:
      "Make the membership comparison feel structured, premium, and easier to understand quickly.",
    bestImageType: "Tier comparison, layered access, or structured environment visual.",
    emotionalTone: ["clarity", "progression", "confidence", "structured access", "premium value"],
    recommendedSubjectMatter: [
      "layered access visual",
      "premium dashboard or environment with clear progression",
      "three-tier ecosystem metaphor",
      "calm structured membership comparison scene"
    ],
    recommendedComposition: [
      "should support a comparison story rather than overpower it",
      "clean enough to sit beside tier guidance",
      "show progression without feeling hierarchical or salesy"
    ],
    recommendedLightingMood: ["clean premium", "structured", "editorial", "calm"],
    avoid: [
      "pricing-table screenshots",
      "loud sales graphics",
      "overly literal pyramid metaphors",
      "busy dashboard clutter"
    ],
    longAdminGuidance:
      "Use this slot to make the membership comparison easier to feel and understand. It should support stage-based progression and room fit, not status or aggressive upsell energy.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "platform-mockup"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Structured premium tier comparison visual.",
      sceneType: "Layered access and environment comparison.",
      subject:
        "Premium dark-mode business environment showing three levels of access or progression in a calm, believable way.",
      environment:
        "Refined editorial platform visual with subtle hierarchy and clear structure, without turning into a pricing table screenshot.",
      lighting: "Clean controlled lighting.",
      mood: "Clear, premium, and confidence-building.",
      style: "Editorial product-storytelling style, ultra realistic.",
      cameraComposition:
        "Balanced composition that suggests stage-based progression with enough negative space for comparison copy.",
      qualityTags:
        "Premium realism, structured design, no watermark, no baked text, clear progression cues without sales pressure.",
      negativePrompt:
        "aggressive sales graphic, pyramid scheme visual, cluttered pricing table, cartoon ui, watermark"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  MEMBERSHIP_FOUNDERS: {
    key: "membership.section.founders",
    label: "Membership Founders Section",
    page: "MEMBERSHIP",
    section: "founders",
    variant: "SECTION",
    sortOrder: 30,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Best for exclusivity and first-mover tone.",
    imageFamilyTag: "exclusivity",
    adminPreviewFamily: "founders",
    imagePurpose: "Support founder offer, early access, and first-mover positioning.",
    bestImageType: "Exclusivity or first-mover premium visual.",
    emotionalTone: ["exclusivity", "advantage", "first access", "strategic positioning", "quiet confidence"],
    recommendedSubjectMatter: [
      "selective access mood",
      "premium strategic table setting",
      "elegant private-room visual",
      "subtle scarcity or exclusivity cues",
      "refined leadership or first-seat atmosphere"
    ],
    recommendedComposition: [
      "should feel focused and elevated",
      "do not make it look aggressive or salesy",
      "keep it tasteful and restrained"
    ],
    recommendedLightingMood: ["darker", "richer contrast", "premium", "selective"],
    avoid: [
      "countdown-funnel energy",
      "salesy urgency visuals",
      "cheesy VIP symbolism",
      "obvious luxury cliches"
    ],
    longAdminGuidance:
      "This image should make the founder offer feel strategic and limited in a classy way. Think quiet exclusivity, not loud scarcity marketing.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "exclusivity"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Exclusivity and first-mover advantage.",
      sceneType: "Exclusive first-mover premium visual.",
      subject:
        "Elegant private meeting table in a luxury business setting with minimal seating.",
      environment:
        "Refined materials like glass and dark wood in a selective, high-end business room.",
      lighting: "Dim premium lighting.",
      mood: "Exclusive, strategic, quiet confidence.",
      style: "Cinematic editorial luxury tone, ultra realistic.",
      cameraComposition:
        "Focused composition with shallow depth of field that suggests exclusivity without feeling salesy or flashy.",
      qualityTags:
        "Refined material detail, restrained luxury, no watermark, no text in image, tasteful premium finish.",
      negativePrompt:
        "flashy luxury, gold overload, sales vibe, crowd"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  ABOUT_HERO: {
    key: "about.hero",
    label: "About Page - Top Visual",
    page: "ABOUT",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Used as the first visual section above the about page content.",
    imageFamilyTag: "story-mission",
    adminPreviewFamily: "hero",
    imagePurpose: "Anchor the about page in credibility and identity.",
    bestImageType: "Founder-led premium identity image.",
    emotionalTone: ["credibility", "identity", "intent", "seriousness", "trust"],
    recommendedSubjectMatter: [
      "serious premium environment",
      "founder-world atmosphere",
      "mission-led business setting",
      "calm executive tone",
      "refined editorial business image"
    ],
    recommendedComposition: [
      "should support page intro",
      "not too abstract",
      "not too people-heavy unless very refined"
    ],
    recommendedLightingMood: ["premium", "grounded", "calm authority"],
    avoid: [
      "generic about-us office teams",
      "playful team photos",
      "forced culture imagery"
    ],
    longAdminGuidance:
      "This image should help the about page feel serious, premium, and purposeful. It should support belief in the mission without drifting into generic company-page stock photography.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "story-mission",
      isHero: true
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Founder-led credibility and identity.",
      sceneType: "Founder-led premium identity image.",
      subject:
        "Premium business environment with calm authority and a grounded executive tone.",
      environment:
        "Minimalistic modern office with neutral tones, subtle depth, and a realistic premium atmosphere.",
      lighting: "Soft lighting.",
      mood: "Credible, calm, serious, and purposeful.",
      style: "Professional editorial style, realistic and grounded.",
      cameraComposition:
        "Clean, supportive composition that anchors the page intro without becoming too abstract or too people-heavy.",
      qualityTags:
        "Premium restraint, realistic detail, no watermark, no text in image, founder-led credibility.",
      negativePrompt:
        "team photo, smiling group, startup culture clichés"
    }),
    defaultOverlayStyle: "CINEMATIC"
  },
  ABOUT_STORY: {
    key: "about.section.story",
    label: "About Story Section",
    page: "ABOUT",
    section: "story",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Best for mission, purpose, and story support.",
    imageFamilyTag: "story-mission",
    adminPreviewFamily: "human",
    imagePurpose: "Support the deeper mission, story, and reason BCN exists.",
    bestImageType: "Human, grounded, mission-supporting image.",
    emotionalTone: ["purpose", "depth", "human credibility", "reflection", "intent"],
    recommendedSubjectMatter: [
      "thoughtful workspace",
      "founder reflection or planning environment",
      "detail-rich business setting",
      "strategy notebook, desk, or atmosphere",
      "intimate premium work moment"
    ],
    recommendedComposition: [
      "more personal than about.hero",
      "still polished",
      "should feel honest, not over-curated"
    ],
    recommendedLightingMood: ["warm-dark", "reflective", "calm", "serious"],
    avoid: [
      "fake culture shots",
      "startup team beanbag energy",
      "overly dramatic portraits"
    ],
    longAdminGuidance:
      "Use this image to support the why behind BCN. It should feel more grounded and human, while still matching the premium identity of the wider platform.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "story-mission"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Mission and purpose.",
      sceneType: "Mission-supporting reflective editorial scene.",
      subject:
        "Close-up of a thoughtful workspace with a notebook, pen, laptop, and a strategic planning moment.",
      environment:
        "Realistic environment that feels calm, reflective, and purpose-led rather than staged.",
      lighting: "Soft warm lighting.",
      mood: "Reflective, grounded, and intentional.",
      style: "Editorial photography, ultra realistic.",
      cameraComposition:
        "Shallow depth of field with close framing that emphasizes detail and purpose without clutter.",
      qualityTags:
        "Premium workspace detail, realistic materials, no watermark, no text in image, mission-led tone.",
      negativePrompt:
        "messy desk, bright colours, clutter"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  COMMUNITY_HERO: {
    key: "community.hero",
    label: "Community Hero",
    page: "COMMUNITY",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Best for structured, high-quality community atmosphere.",
    imageFamilyTag: "founder-conversation",
    adminPreviewFamily: "hero",
    imagePurpose: "Frame the community as structured, high-quality, and serious.",
    bestImageType: "Premium interaction or structured community atmosphere.",
    emotionalTone: ["quality interaction", "calm", "trust", "structure", "belonging with standards"],
    recommendedSubjectMatter: [
      "small group strategic exchange",
      "premium room feel",
      "founder conversation",
      "business-owner interaction",
      "serious collaborative environment"
    ],
    recommendedComposition: [
      "should feel more curated than social",
      "should not look like a noisy network",
      "maintain premium tone"
    ],
    recommendedLightingMood: ["dark premium", "subtle warmth", "focused"],
    avoid: [
      "party or event energy",
      "huge crowds",
      "social-media-style activity shots",
      "bright networking conference vibes"
    ],
    longAdminGuidance:
      "This should communicate that BCN community is about meaningful, serious interaction, not noise or mass social chatter.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "founder-conversation",
      isHero: true
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Structured high-quality community.",
      sceneType: "Premium interaction and structured community atmosphere.",
      subject:
        "Small group of professionals in focused discussion with natural interaction.",
      environment:
        "Premium meeting space with minimal distractions and a realistic serious-business setting.",
      lighting: "Soft lighting.",
      mood: "Calm, trusted, and high quality.",
      style: "Editorial style, ultra realistic.",
      cameraComposition:
        "Composed group framing that feels curated and credible rather than event-like or social-media noisy.",
      qualityTags:
        "Premium discussion tone, realistic interaction, no watermark, no text in image, structured community atmosphere.",
      negativePrompt:
        "crowds, events, networking chaos"
    }),
    defaultOverlayStyle: "DARK"
  },
  RESOURCES_HERO: {
    key: "resources.hero",
    label: "Resources Hero",
    page: "RESOURCES",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Best for premium knowledge and insight atmosphere.",
    imageFamilyTag: "editorial-insight",
    adminPreviewFamily: "editorial",
    imagePurpose: "Give the resources area a premium knowledge-layer entry.",
    bestImageType: "Editorial learning or insight atmosphere.",
    emotionalTone: ["depth", "insight", "clarity", "guidance", "premium learning"],
    recommendedSubjectMatter: [
      "refined desk or workspace",
      "strategic reading or research environment",
      "premium editorial background",
      "subtle knowledge or work atmosphere",
      "quiet preparation and thinking"
    ],
    recommendedComposition: [
      "cleaner than people-led conversation imagery",
      "should support content and scanning",
      "not too emotionally dramatic"
    ],
    recommendedLightingMood: ["dark editorial", "intelligent", "calm", "polished"],
    avoid: [
      "classroom visuals",
      "obvious education stock imagery",
      "bright library cliches",
      "overly techy data overload"
    ],
    longAdminGuidance:
      "This image should make the resources area feel valuable and structured, like a high-quality business knowledge layer rather than a random content library.",
    contentLayerNote:
      "This hero sets the brand layer only. Individual resource imagery should remain part of the separate content-layer system.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "editorial-insight",
      isHero: true
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium knowledge layer.",
      sceneType: "Editorial knowledge and insight atmosphere.",
      subject:
        "Clean modern workspace with a laptop, notebook, and subtle business context.",
      environment:
        "Minimal premium environment that feels calm, useful, and content-led rather than decorative.",
      lighting: "Soft lighting.",
      mood: "Clear, guided, and quietly valuable.",
      style: "Editorial feel, ultra realistic.",
      cameraComposition:
        "Minimal composition with high clarity that supports content scanning and a refined hero crop.",
      qualityTags:
        "Premium tone, sharp detail, no watermark, no text in image, structured knowledge-layer atmosphere.",
      negativePrompt:
        "classroom, bright library, clutter"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  INTELLIGENCE_HERO: {
    key: "intelligence.hero",
    label: "Insights Page - Top Visual",
    page: "INSIGHTS",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Used as the first visual section above the public insights content.",
    imageFamilyTag: "editorial-insight",
    adminPreviewFamily: "editorial",
    imagePurpose: "Position BCN Intelligence as a premium editorial intelligence layer.",
    bestImageType: "Editorial analytical atmosphere.",
    emotionalTone: ["clarity", "signal", "credibility", "editorial sharpness", "business intelligence"],
    recommendedSubjectMatter: [
      "refined publication-style visual",
      "dark editorial workspace",
      "analytical premium environment",
      "signal-over-noise mood",
      "structured intelligence atmosphere"
    ],
    recommendedComposition: [
      "cleaner and sharper than community or story imagery",
      "should feel publication-led",
      "avoid busy visual storytelling"
    ],
    recommendedLightingMood: ["cool-dark or neutral-dark premium", "clean", "composed", "analytical"],
    avoid: [
      "chaotic newsroom cliches",
      "trading screen overload",
      "generic AI brain visuals",
      "over-glowy future-tech imagery"
    ],
    longAdminGuidance:
      "This image should make BCN Intelligence feel like a serious insight layer. It should feel more editorial and analytical than emotional.",
    contentLayerNote:
      "This hero sets the brand layer only. Per-post source previews should remain part of the separate truth-based content layer.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "editorial-insight",
      isHero: true
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Editorial intelligence layer.",
      sceneType: "Editorial analytical atmosphere.",
      subject:
        "Minimal dark editorial workspace with a clean desk and subtle data or reading context.",
      environment:
        "Refined publication-like setting with tidy surfaces and a composed analytical feel.",
      lighting: "Cool-toned lighting.",
      mood: "Sharp, credible, and signal-over-noise.",
      style: "Premium publication feel, ultra realistic.",
      cameraComposition:
        "Clean structured framing with sharp focus and no visual overload, suitable for a premium intelligence hero.",
      qualityTags:
        "Editorial clarity, premium realism, no watermark, no text in image, restrained analytical tone.",
      negativePrompt:
        "trading chaos, screens everywhere, neon tech"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  SERVICES_HERO: {
    key: "services.hero",
    label: "Founder Page - Top Visual",
    page: "FOUNDER",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Used as the first visual section above the founder page content.",
    imageFamilyTag: "strategy-process",
    adminPreviewFamily: "hero",
    imagePurpose: "Position the service offer as high-value strategic support.",
    bestImageType: "Premium strategy partnership atmosphere.",
    emotionalTone: ["authority", "support", "strategy", "confidence", "premium partnership"],
    recommendedSubjectMatter: [
      "high-level business environment",
      "premium planning or consulting setting",
      "serious founder support atmosphere",
      "elegant executive workspace",
      "calm expert-led environment"
    ],
    recommendedComposition: [
      "should feel credible and elevated",
      "not too agency-like",
      "not too abstract"
    ],
    recommendedLightingMood: ["premium", "calm", "serious", "high-trust"],
    avoid: [
      "loud agency visuals",
      "megaphone marketing energy",
      "generic consultant handshake stock"
    ],
    longAdminGuidance:
      "This image should position the services page as a serious strategic offer for business owners, not a noisy sales page.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "strategy-process",
      isHero: true
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Premium strategy and partnership.",
      sceneType: "Premium strategy partnership atmosphere.",
      subject:
        "High-end executive workspace with a clean desk and a serious planning atmosphere.",
      environment:
        "Calm expert-led business setting that feels elevated, minimal, and high-trust.",
      lighting: "Soft lighting.",
      mood: "Confident, strategic, and supportive.",
      style: "Professional editorial tone, ultra realistic.",
      cameraComposition:
        "Minimal composition with enough breathing room to position the service offer as serious and premium.",
      qualityTags:
        "High-end business finish, realistic materials, no watermark, no text in image, refined strategy atmosphere.",
      negativePrompt:
        "sales energy, loud marketing visuals"
    }),
    defaultOverlayStyle: "CINEMATIC"
  },
  SERVICES_APPROACH: {
    key: "services.section.approach",
    label: "Services Approach Section",
    page: "FOUNDER",
    section: "approach",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Best for methodology, structure, and guided process.",
    imageFamilyTag: "strategy-process",
    adminPreviewFamily: "editorial",
    imagePurpose: "Support methodology, process, and guided progression.",
    bestImageType: "Process, clarity, or guided strategy visual.",
    emotionalTone: ["clarity", "guidance", "confidence", "process", "direction"],
    recommendedSubjectMatter: [
      "planning environment",
      "clean structured desk scene",
      "elegant process-oriented business setting",
      "strategic collaboration",
      "calm workflow detail"
    ],
    recommendedComposition: [
      "should sit cleanly beside methodology copy",
      "should reinforce clarity rather than emotion",
      "avoid visual clutter"
    ],
    recommendedLightingMood: ["grounded", "precise", "calm premium"],
    avoid: [
      "messy whiteboards",
      "chaotic team workshop photos",
      "overbusy desk scenes"
    ],
    longAdminGuidance:
      "Choose an image that supports the way the work is done. It should feel clear, structured, and strategic.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "strategy-process"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Structured process and clarity.",
      sceneType: "Process and clarity visual.",
      subject:
        "Clean planning workspace with a notebook, laptop, and a structured setup.",
      environment:
        "Calm realistic environment with minimal distractions and a guided process feel.",
      lighting: "Calm lighting.",
      mood: "Clear, focused, and confident.",
      style: "Editorial style, realistic environment.",
      cameraComposition:
        "Clean, focused composition that reinforces methodology and structure rather than visual noise.",
      qualityTags:
        "Premium clarity, realistic workspace detail, no watermark, no text in image, structured business tone.",
      negativePrompt:
        "messy whiteboard, chaotic brainstorming"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  },
  GLOBAL_PUBLIC_TOP: {
    key: "global.public.top",
    label: "Public Page - Top Visual",
    page: "GLOBAL",
    section: "public-top",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Shared top visual for public utility and detail pages such as Contact and FAQ.",
    imageFamilyTag: "cinematic-atmosphere",
    adminPreviewFamily: "hero",
    imagePurpose:
      "Give lighter public pages a premium opening section without requiring a unique slot for every route.",
    bestImageType: "Calm premium atmosphere with flexible editorial cropping.",
    emotionalTone: ["calm authority", "premium restraint", "clarity", "credibility", "welcome"],
    recommendedSubjectMatter: [
      "premium architectural business environment",
      "calm workspace atmosphere",
      "refined editorial business setting",
      "subtle founder-world interior",
      "credible premium business context"
    ],
    recommendedComposition: [
      "wide composition that crops cleanly across different public pages",
      "enough negative space for page-specific copy overlays",
      "should feel supportive rather than overly thematic",
      "avoid busy detail that fights page headings"
    ],
    recommendedLightingMood: ["dark premium", "editorial", "soft highlights", "controlled"],
    avoid: [
      "theme-specific imagery that only suits one page",
      "crowded office scenes",
      "event photography",
      "bright generic stock"
    ],
    longAdminGuidance:
      "Use this as the shared premium top visual for public pages that need a polished opening but do not justify their own dedicated media slot. It should feel versatile, calm, and on-brand across multiple contexts.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "cinematic-atmosphere",
      isHero: true
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Versatile premium top visual for shared public pages.",
      sceneType: "Premium editorial business atmosphere.",
      subject:
        "Refined private business environment with subtle architectural detail and clean premium surfaces.",
      environment:
        "Modern luxury business interior with calm composition, restrained materials, and believable depth.",
      lighting: "Moody balanced lighting with soft highlights.",
      mood: "Quiet, credible, premium, and welcoming.",
      style: "Editorial photography style, ultra realistic.",
      cameraComposition:
        "Wide crop-friendly composition with flexible negative space and no dominant focal element that would limit reuse.",
      qualityTags:
        "Premium realism, high-end restraint, no watermark, no baked text, versatile brand atmosphere.",
      negativePrompt:
        "crowded office, bright coworking space, event scene, cheesy stock imagery, clutter"
    }),
    defaultOverlayStyle: "CINEMATIC"
  },
  FAQ_TRUST: {
    key: "faq.section.trust",
    label: "FAQ - Trust Visual",
    page: "GLOBAL",
    section: "faq-trust",
    variant: "SECTION",
    sortOrder: 15,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Supports reassurance around billing, cancellation, privacy, access, and platform standards.",
    imageFamilyTag: "story-mission",
    adminPreviewFamily: "editorial",
    imagePurpose:
      "Reassure visitors that BCN is a well-run private environment with clear standards and access paths.",
    bestImageType: "Trust-supporting editorial business visual.",
    emotionalTone: ["trust", "reassurance", "privacy", "standards", "calm confidence"],
    recommendedSubjectMatter: [
      "private premium workspace",
      "secure calm business environment",
      "structured editorial scene with human warmth",
      "quiet founder-world setting that feels safe and credible"
    ],
    recommendedComposition: [
      "should support reassurance copy",
      "avoid visual tension or loud contrast",
      "works well in a trust-focused support section"
    ],
    recommendedLightingMood: ["soft premium", "calm", "credible", "grounded"],
    avoid: [
      "security padlock stock images",
      "sterile compliance visuals",
      "customer-support headset imagery",
      "corporate stock cliches"
    ],
    longAdminGuidance:
      "Use this slot to support reassurance on the FAQ page. It should feel private, credible, and well-run without drifting into generic security or support imagery.",
    qualityChecklist: buildQualityChecklist({
      imageFamilyTag: "story-mission"
    }),
    promptTemplate: createPromptTemplate({
      styleSummary: "Trust-supporting premium editorial reassurance.",
      sceneType: "Private, credible business environment.",
      subject:
        "Quiet premium business workspace with subtle signs of structure, care, and private access.",
      environment:
        "Refined founder-world interior with calm materials, believable detail, and a grounded high-trust atmosphere.",
      lighting: "Soft balanced lighting.",
      mood: "Reassuring, calm, and credible.",
      style: "Editorial photography style, ultra realistic.",
      cameraComposition:
        "Clean flexible composition that supports reassurance copy without dominating the section.",
      qualityTags:
        "Premium realism, high-trust atmosphere, no watermark, no text in image, private environment cues.",
      negativePrompt:
        "padlock icon graphic, call center, sterile office stock, loud corporate security imagery, watermark"
    }),
    defaultOverlayStyle: "SOFT_DARK"
  }
} as const satisfies Record<string, RegistryItem>;

export type VisualMediaPlacementKey =
  (typeof VISUAL_MEDIA_PLACEMENTS)[keyof typeof VISUAL_MEDIA_PLACEMENTS]["key"];

export const VISUAL_MEDIA_PLACEMENT_LIST = Object.values(VISUAL_MEDIA_PLACEMENTS);

export const VISUAL_MEDIA_PLACEMENT_KEYS = VISUAL_MEDIA_PLACEMENT_LIST.map((item) => item.key);

export const VISUAL_MEDIA_PAGE_LABELS: Record<VisualMediaPage, string> = {
  HOME: "Home",
  MEMBERSHIP: "Membership",
  JOIN: "Join",
  ABOUT: "About",
  COMMUNITY: "Community",
  FOUNDER: "Founder",
  RESOURCES: "Resources",
  INSIGHTS: "Insights",
  GLOBAL: "Shared"
};

export const VISUAL_MEDIA_PAGE_ORDER: readonly VisualMediaPage[] = [
  "HOME",
  "JOIN",
  "MEMBERSHIP",
  "ABOUT",
  "COMMUNITY",
  "RESOURCES",
  "INSIGHTS",
  "FOUNDER",
  "GLOBAL"
] as const;

export const VISUAL_MEDIA_LEGACY_KEY_MAP: Partial<
  Record<string, VisualMediaPlacementKey>
> = {
  "home.hero.primary": "home.hero",
  "home.section.story": "home.section.connection",
  "membership.hero.primary": "membership.hero",
  "membership.section.inside-circle": "membership.section.rooms",
  "join.hero.primary": "join.hero",
  "about.hero.primary": "about.hero",
  "community.hero.primary": "community.hero",
  "founder.hero.primary": "services.hero",
  "resources.hero.primary": "resources.hero",
  "insights.hero.primary": "intelligence.hero"
};

export function isVisualMediaPlacementKey(value: string): value is VisualMediaPlacementKey {
  return VISUAL_MEDIA_PLACEMENT_KEYS.includes(value as VisualMediaPlacementKey);
}

export function getVisualMediaPlacementDefinition(key: VisualMediaPlacementKey) {
  return VISUAL_MEDIA_PLACEMENT_LIST.find((item) => item.key === key) ?? null;
}
