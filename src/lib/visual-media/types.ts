import type {
  VisualMediaOverlayStyle,
  VisualMediaPage,
  VisualMediaStorageProvider,
  VisualMediaVariant
} from "@prisma/client";

export type VisualMediaImageFamilyTag =
  | "cinematic-atmosphere"
  | "founder-conversation"
  | "platform-mockup"
  | "exclusivity"
  | "story-mission"
  | "editorial-insight"
  | "strategy-process";

export type VisualMediaAdminPreviewFamily =
  | "hero"
  | "human"
  | "editorial"
  | "founders";

export type VisualMediaPlacementGuidance = {
  imageFamilyTag: VisualMediaImageFamilyTag;
  adminPreviewFamily: VisualMediaAdminPreviewFamily;
  imagePurpose: string;
  bestImageType: string;
  emotionalTone: string[];
  recommendedSubjectMatter: string[];
  recommendedComposition: string[];
  recommendedLightingMood: string[];
  avoid: string[];
  longAdminGuidance: string;
  qualityChecklist: string[];
  contentLayerNote?: string;
  promptTemplate: VisualMediaPromptTemplate;
};

export type VisualMediaPromptTemplate = {
  styleSummary: string;
  sceneType: string;
  subject: string;
  environment: string;
  lighting: string;
  mood: string;
  style: string;
  cameraComposition: string;
  qualityTags: string;
  negativePrompt: string;
};

export type VisualMediaPlacementDefinition = {
  key: string;
  label: string;
  page: VisualMediaPage;
  section: string;
  variant: VisualMediaVariant;
  sortOrder: number;
  supportsMobile: boolean;
  recommendedAspectRatio: string;
  adminHelperText?: string;
} & VisualMediaPlacementGuidance;

export type VisualMediaPlacementRecord = {
  id: string | null;
  key: string;
  label: string;
  page: VisualMediaPage;
  section: string;
  variant: VisualMediaVariant;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  desktopStorageKey: string | null;
  mobileStorageKey: string | null;
  storageProvider: VisualMediaStorageProvider | null;
  altText: string | null;
  isActive: boolean;
  sortOrder: number;
  overlayStyle: VisualMediaOverlayStyle | null;
  objectPosition: string | null;
  focalPointX: number | null;
  focalPointY: number | null;
  adminHelperText: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  supportsMobile: boolean;
  recommendedAspectRatio: string;
};

export type VisualMediaRenderablePlacement = Pick<
  VisualMediaPlacementRecord,
  | "key"
  | "label"
  | "variant"
  | "imageUrl"
  | "mobileImageUrl"
  | "altText"
  | "isActive"
  | "overlayStyle"
  | "objectPosition"
  | "focalPointX"
  | "focalPointY"
  | "supportsMobile"
  | "recommendedAspectRatio"
>;

export type VisualMediaUploadMode = "desktop" | "mobile";
