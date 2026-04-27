import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { CACHE_TAGS, visualMediaTag } from "@/lib/cache";
import {
  getVisualMediaPlacementDefinition,
  VISUAL_MEDIA_LEGACY_KEY_MAP,
  VISUAL_MEDIA_PLACEMENT_KEYS,
  VISUAL_MEDIA_PLACEMENT_LIST,
  type VisualMediaPlacementKey
} from "@/lib/visual-media/constants";
import type { VisualMediaPlacementRecord } from "@/lib/visual-media/types";
import {
  deleteVisualMediaPlacementByKey,
  findVisualMediaPlacementByKey,
  listVisualMediaPlacements,
  updateVisualMediaPlacementByKey,
  type VisualMediaPlacementRow,
  upsertVisualMediaPlacement
} from "@/server/repositories/visual-media.repository";
import {
  deleteManagedVisualMediaAsset,
  persistVisualMediaUpload,
  type StoredVisualMediaAsset
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

function canonicalPlacementUpdate(
  key: VisualMediaPlacementKey
): Prisma.VisualMediaPlacementUncheckedUpdateInput {
  const seed = createPlacementSeedInput(key);

  return {
    label: seed.label,
    page: seed.page,
    section: seed.section,
    variant: seed.variant,
    sortOrder: seed.sortOrder,
    adminHelperText: seed.adminHelperText,
    overlayStyle: seed.overlayStyle
  };
}

function findLegacyPlacementKey(targetKey: VisualMediaPlacementKey) {
  return (
    Object.entries(VISUAL_MEDIA_LEGACY_KEY_MAP).find(
      ([, canonicalKey]) => canonicalKey === targetKey
    )?.[0] ?? null
  );
}

function mergeLegacyPlacementIntoCanonical(
  canonical: VisualMediaPlacementRow,
  legacy: VisualMediaPlacementRow,
  key: VisualMediaPlacementKey
): Prisma.VisualMediaPlacementUncheckedUpdateInput {
  const seed = createPlacementSeedInput(key);

  return {
    label: seed.label,
    page: seed.page,
    section: seed.section,
    variant: seed.variant,
    sortOrder: seed.sortOrder,
    adminHelperText: canonical.adminHelperText ?? legacy.adminHelperText ?? seed.adminHelperText,
    overlayStyle: canonical.overlayStyle ?? legacy.overlayStyle ?? seed.overlayStyle,
    imageUrl: canonical.imageUrl ?? legacy.imageUrl,
    mobileImageUrl: canonical.mobileImageUrl ?? legacy.mobileImageUrl,
    desktopStorageKey: canonical.desktopStorageKey ?? legacy.desktopStorageKey,
    mobileStorageKey: canonical.mobileStorageKey ?? legacy.mobileStorageKey,
    storageProvider: canonical.storageProvider ?? legacy.storageProvider,
    altText: canonical.altText ?? legacy.altText,
    isActive: canonical.imageUrl ? canonical.isActive : legacy.isActive,
    objectPosition: canonical.objectPosition ?? legacy.objectPosition,
    focalPointX: canonical.focalPointX ?? legacy.focalPointX,
    focalPointY: canonical.focalPointY ?? legacy.focalPointY
  };
}

async function migrateLegacyPlacementKey(key: VisualMediaPlacementKey) {
  const legacyKey = findLegacyPlacementKey(key);

  if (!legacyKey) {
    return null;
  }

  const [legacy, canonical] = await Promise.all([
    findVisualMediaPlacementByKey(legacyKey),
    findVisualMediaPlacementByKey(key)
  ]);

  if (!legacy) {
    return canonical;
  }

  if (!canonical) {
    return updateVisualMediaPlacementByKey(legacyKey, {
      key,
      ...canonicalPlacementUpdate(key)
    });
  }

  await updateVisualMediaPlacementByKey(
    key,
    mergeLegacyPlacementIntoCanonical(canonical, legacy, key)
  );
  await deleteVisualMediaPlacementByKey(legacyKey);

  return findVisualMediaPlacementByKey(key);
}

export async function syncVisualMediaPlacementRegistry() {
  await Promise.all(
    VISUAL_MEDIA_PLACEMENT_KEYS.map(async (key) => {
      await migrateLegacyPlacementKey(key);
    })
  );

  const placements = await Promise.all(
    VISUAL_MEDIA_PLACEMENT_KEYS.map((key) => {
      const seed = createPlacementSeedInput(key);

      return upsertVisualMediaPlacement(seed, {
        ...canonicalPlacementUpdate(key)
      });
    })
  );

  return placements.map((placement) => toVisualMediaRecord(placement)).filter(Boolean);
}

async function loadVisualMediaPlacement(key: VisualMediaPlacementKey) {
  const existing = await findVisualMediaPlacementByKey(key);

  if (existing) {
    return toVisualMediaRecord(existing);
  }

  const migrated = await migrateLegacyPlacementKey(key);

  if (migrated) {
    return toVisualMediaRecord(migrated);
  }

  const seed = createPlacementSeedInput(key);
  const created = await upsertVisualMediaPlacement(seed, seed);
  return toVisualMediaRecord(created);
}

async function loadVisualMediaPlacements() {
  const existing = await listVisualMediaPlacements();
  const existingKeySet = new Set(existing.map((placement) => placement.key));
  const hasEveryRegisteredPlacement = VISUAL_MEDIA_PLACEMENT_KEYS.every((key) =>
    existingKeySet.has(key)
  );

  if (hasEveryRegisteredPlacement && existing.length === VISUAL_MEDIA_PLACEMENT_LIST.length) {
    return existing
      .filter((placement) => VISUAL_MEDIA_PLACEMENT_KEYS.includes(placement.key as VisualMediaPlacementKey))
      .map((placement) => toVisualMediaRecord(placement))
      .filter(Boolean);
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
  console.info("[visual-media] placement upload mutation starting", {
    key: input.key,
    mode: input.mode,
    size: input.file.size
  });

  const current = await getVisualMediaPlacement(input.key);

  if (!current) {
    throw new Error("visual-media-placement-not-found");
  }

  const stored = await persistVisualMediaUpload(input.file, input.key, input.mode);
  console.info("[visual-media] placement upload storage completed", {
    key: input.key,
    mode: input.mode,
    storageProvider: stored.storageProvider,
    storageKey: stored.storageKey
  });

  return replaceVisualMediaPlacementStoredAsset({
    key: input.key,
    mode: input.mode,
    stored,
    current
  });
}

export async function replaceVisualMediaPlacementStoredAsset(input: {
  key: VisualMediaPlacementKey;
  mode: "desktop" | "mobile";
  stored: StoredVisualMediaAsset;
  current?: VisualMediaPlacementRecord | null;
}) {
  const current = input.current ?? (await getVisualMediaPlacement(input.key));

  if (!current) {
    throw new Error("visual-media-placement-not-found");
  }

  const previousStorageKey =
    input.mode === "desktop" ? current.desktopStorageKey : current.mobileStorageKey;

  if (previousStorageKey) {
    try {
      await deleteManagedVisualMediaAsset(current.storageProvider, previousStorageKey);
    } catch (error) {
      console.warn("[visual-media] previous asset cleanup failed after replacement", {
        key: input.key,
        mode: input.mode,
        storageProvider: current.storageProvider,
        storageKey: previousStorageKey,
        message: error instanceof Error ? error.message : "unknown-error"
      });
    }
  }

  console.info("[visual-media] placement DB update starting", {
    key: input.key,
    mode: input.mode
  });

  await upsertVisualMediaPlacement(
    createPlacementSeedInput(input.key),
    {
      storageProvider: input.stored.storageProvider,
      ...(input.mode === "desktop"
        ? {
            imageUrl: input.stored.url,
            desktopStorageKey: input.stored.storageKey
          }
        : {
            mobileImageUrl: input.stored.url,
            mobileStorageKey: input.stored.storageKey
          })
    }
  );

  console.info("[visual-media] placement DB update completed", {
    key: input.key,
    mode: input.mode
  });

  revalidateTag(CACHE_TAGS.visualMedia);
  revalidateTag(visualMediaTag(input.key));

  return getVisualMediaPlacement(input.key);
}

export async function updateVisualMediaPlacementDetails(input: {
  key: VisualMediaPlacementKey;
  altText?: string | null;
  isActive?: boolean;
  overlayStyle?: Prisma.VisualMediaPlacementUncheckedUpdateInput["overlayStyle"];
  objectPosition?: string | null;
}) {
  await loadVisualMediaPlacement(input.key);

  const updated = await upsertVisualMediaPlacement(createPlacementSeedInput(input.key), {
    ...(typeof input.altText !== "undefined" ? { altText: input.altText || null } : {}),
    ...(typeof input.isActive !== "undefined" ? { isActive: input.isActive } : {}),
    ...(typeof input.overlayStyle !== "undefined" ? { overlayStyle: input.overlayStyle } : {}),
    ...(typeof input.objectPosition !== "undefined"
      ? { objectPosition: input.objectPosition || null }
      : {})
  });

  revalidateTag(CACHE_TAGS.visualMedia);
  revalidateTag(visualMediaTag(input.key));

  return toVisualMediaRecord(updated);
}

export async function removeVisualMediaPlacementAsset(input: {
  key: VisualMediaPlacementKey;
  mode: "desktop" | "mobile";
}) {
  const current = await getVisualMediaPlacement(input.key);

  if (!current) {
    throw new Error("visual-media-placement-not-found");
  }

  if (input.mode === "desktop") {
    await deleteManagedVisualMediaAsset(current.storageProvider, current.desktopStorageKey);
  } else {
    await deleteManagedVisualMediaAsset(current.storageProvider, current.mobileStorageKey);
  }

  await upsertVisualMediaPlacement(createPlacementSeedInput(input.key), {
    ...(input.mode === "desktop"
      ? {
          imageUrl: null,
          desktopStorageKey: null,
          isActive: current.mobileImageUrl ? current.isActive : false
        }
      : {
          mobileImageUrl: null,
          mobileStorageKey: null
        })
  });

  revalidateTag(CACHE_TAGS.visualMedia);
  revalidateTag(visualMediaTag(input.key));

  return getVisualMediaPlacement(input.key);
}
