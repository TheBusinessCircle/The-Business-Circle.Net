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
    label: "Homepage Hero",
    page: "HOME",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Best for cinematic atmosphere and premium first impression.",
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
    label: "Homepage Connection Section",
    page: "HOME",
    section: "connection",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Best for meaningful founder conversation imagery.",
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
    label: "Homepage Platform Section",
    page: "HOME",
    section: "platform",
    variant: "SECTION",
    sortOrder: 30,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Best for platform or dashboard mockups.",
    imageFamilyTag: "platform-mockup",
    adminPreviewFamily: "editorial",
    imagePurpose: "Show the structured ecosystem and digital side of BCN.",
    bestImageType: "Platform mockup, ecosystem preview, or premium product-led visual.",
    emotionalTone: ["clarity", "structure", "sophistication", "credibility", "modern premium function"],
    recommendedSubjectMatter: [
      "desktop and mobile platform mockup",
      "refined dashboard view",
      "dark-mode member environment",
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
        "High-end dark mode business dashboard displayed on a modern laptop and mobile device.",
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
  JOIN_HERO: {
    key: "join.hero",
    label: "Join Page Hero",
    page: "JOIN",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Best for premium entry-point atmosphere.",
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
  MEMBERSHIP_HERO: {
    key: "membership.hero",
    label: "Membership Hero",
    page: "MEMBERSHIP",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Best for premium structure and room-selection atmosphere.",
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
    label: "About Hero",
    page: "ABOUT",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Best for founder-led credibility and identity.",
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
    label: "BCN Intelligence Hero",
    page: "INSIGHTS",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Best for editorial intelligence and signal-over-noise tone.",
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
    label: "Services Hero",
    page: "FOUNDER",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Best for premium strategic support positioning.",
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
  FOUNDER: "Services",
  RESOURCES: "Resources",
  INSIGHTS: "BCN Intelligence",
  GLOBAL: "Global"
};

export const VISUAL_MEDIA_PAGE_ORDER: readonly VisualMediaPage[] = [
  "HOME",
  "JOIN",
  "MEMBERSHIP",
  "ABOUT",
  "COMMUNITY",
  "RESOURCES",
  "INSIGHTS",
  "FOUNDER"
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
