import type {
  VisualMediaOverlayStyle,
  VisualMediaPage,
  VisualMediaStorageProvider,
  VisualMediaVariant
} from "@prisma/client";

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
};

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

export type VisualMediaUploadMode = "desktop" | "mobile";
