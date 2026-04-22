import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { CACHE_TAGS, visualMediaTag } from "@/lib/cache";
import {
  getVisualMediaPlacementDefinition,
  VISUAL_MEDIA_PLACEMENT_KEYS,
  VISUAL_MEDIA_PLACEMENT_LIST,
  type VisualMediaPlacementKey
} from "@/lib/visual-media/constants";
import type { VisualMediaPlacementRecord } from "@/lib/visual-media/types";
import {
  findVisualMediaPlacementByKey,
  listVisualMediaPlacements,
  type VisualMediaPlacementRow,
  upsertVisualMediaPlacement
} from "@/server/repositories/visual-media.repository";
import {
  deleteManagedVisualMediaAsset,
  persistVisualMediaUpload
} from "@/server/visual-media/visual-media-upload.service";

function toVisualMediaRecord(
  record: VisualMediaPlacementRow | null
): VisualMediaPlacementRecord | null {
  if (!record) {
    return null;
  }

  const definition = getVisualMediaPlacementDefinition(record.key as VisualMediaPlacementKey);

  return {
    id: record.id,
    key: record.key,
    label: record.label,
    page: record.page,
    section: record.section ?? definition?.section ?? "general",
    variant: record.variant,
    imageUrl: record.imageUrl,
    mobileImageUrl: record.mobileImageUrl,
    desktopStorageKey: record.desktopStorageKey,
    mobileStorageKey: record.mobileStorageKey,
    storageProvider: record.storageProvider,
    altText: record.altText,
    isActive: record.isActive,
    sortOrder: record.sortOrder,
    overlayStyle: record.overlayStyle,
    objectPosition: record.objectPosition,
    focalPointX: record.focalPointX,
    focalPointY: record.focalPointY,
    adminHelperText: record.adminHelperText,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    supportsMobile: definition?.supportsMobile ?? false,
    recommendedAspectRatio: definition?.recommendedAspectRatio ?? "16:10"
  };
}

function createPlacementSeedInput(key: VisualMediaPlacementKey) {
  const definition = getVisualMediaPlacementDefinition(key);

  if (!definition) {
    throw new Error(`Unknown visual media placement key: ${key}`);
  }

  return {
    key: definition.key,
    label: definition.label,
    page: definition.page,
    section: definition.section,
    variant: definition.variant,
    sortOrder: definition.sortOrder,
    overlayStyle: definition.defaultOverlayStyle ?? null,
    adminHelperText: definition.adminHelperText ?? null
  } satisfies Prisma.VisualMediaPlacementUncheckedCreateInput;
}

export async function syncVisualMediaPlacementRegistry() {
  const placements = await Promise.all(
    VISUAL_MEDIA_PLACEMENT_KEYS.map((key) => {
      const seed = createPlacementSeedInput(key);

      return upsertVisualMediaPlacement(seed, {
        label: seed.label,
        page: seed.page,
        section: seed.section,
        variant: seed.variant,
        sortOrder: seed.sortOrder,
        adminHelperText: seed.adminHelperText,
        ...(seed.overlayStyle ? { overlayStyle: seed.overlayStyle } : {})
      });
    })
  );

  revalidateTag(CACHE_TAGS.visualMedia);
  return placements.map((placement) => toVisualMediaRecord(placement)).filter(Boolean);
}

async function loadVisualMediaPlacement(key: VisualMediaPlacementKey) {
  const existing = await findVisualMediaPlacementByKey(key);

  if (existing) {
    return toVisualMediaRecord(existing);
  }

  const seed = createPlacementSeedInput(key);
  const created = await upsertVisualMediaPlacement(seed, seed);
  return toVisualMediaRecord(created);
}

async function loadVisualMediaPlacements() {
  const existing = await listVisualMediaPlacements();

  if (existing.length === VISUAL_MEDIA_PLACEMENT_LIST.length) {
    return existing.map((placement) => toVisualMediaRecord(placement)).filter(Boolean);
  }

  return syncVisualMediaPlacementRegistry();
}

export async function getVisualMediaPlacement(key: VisualMediaPlacementKey) {
  const getCachedPlacement = unstable_cache(
    async () => loadVisualMediaPlacement(key),
    [CACHE_TAGS.visualMedia, key],
    {
      tags: [CACHE_TAGS.visualMedia, visualMediaTag(key)]
    }
  );

  return getCachedPlacement();
}

export async function listRegisteredVisualMediaPlacements() {
  const getCachedPlacements = unstable_cache(
    loadVisualMediaPlacements,
    [CACHE_TAGS.visualMedia, "all"],
    {
      tags: [CACHE_TAGS.visualMedia]
    }
  );

  return getCachedPlacements();
}

export async function uploadVisualMediaPlacementAsset(input: {
  key: VisualMediaPlacementKey;
  mode: "desktop" | "mobile";
  file: File;
}) {
  const current = await getVisualMediaPlacement(input.key);

  if (!current) {
    throw new Error("visual-media-placement-not-found");
  }

  const stored = await persistVisualMediaUpload(input.file, input.key, input.mode);

  if (input.mode === "desktop") {
    await deleteManagedVisualMediaAsset(current.storageProvider, current.desktopStorageKey);
  } else {
    await deleteManagedVisualMediaAsset(current.storageProvider, current.mobileStorageKey);
  }

  await upsertVisualMediaPlacement(
    createPlacementSeedInput(input.key),
    {
      storageProvider: stored.storageProvider,
      ...(input.mode === "desktop"
        ? {
            imageUrl: stored.url,
            desktopStorageKey: stored.storageKey
          }
        : {
            mobileImageUrl: stored.url,
            mobileStorageKey: stored.storageKey
          })
    }
  );

  revalidateTag(CACHE_TAGS.visualMedia);
  revalidateTag(visualMediaTag(input.key));

  return getVisualMediaPlacement(input.key);
}
