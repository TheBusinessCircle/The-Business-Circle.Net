"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { VisualMediaOverlayStyle } from "@prisma/client";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import {
  isVisualMediaFileValue,
  visualMediaPlacementKeySchema
} from "@/lib/visual-media";
import { requireAdmin } from "@/lib/session";
import {
  getVisualMediaPlacement,
  removeVisualMediaPlacementAsset as removeVisualMediaPlacementAssetMutation,
  updateVisualMediaPlacementDetails,
  uploadVisualMediaPlacementAsset
} from "@/server/visual-media";

const VISUAL_MEDIA_NOTICE_MESSAGES = {
  "placement-saved": "Placement settings saved.",
  "desktop-uploaded": "Desktop image uploaded.",
  "mobile-uploaded": "Mobile image uploaded.",
  "desktop-removed": "Desktop image removed.",
  "mobile-removed": "Mobile image removed."
} as const;

const VISUAL_MEDIA_ERROR_MESSAGES = {
  "invalid-placement": "That placement could not be updated.",
  "missing-file": "Choose an image before uploading.",
  "invalid-file": "Only valid image files can be uploaded here.",
  "file-too-large": "That image is too large. Keep uploads under 8MB.",
  "upload-timeout": "The image upload timed out. Try again with a smaller image or check Cloudinary.",
  "upload-failed": "The image upload could not be completed right now."
} as const;

export type VisualMediaActionResult =
  | {
      ok: true;
      notice: keyof typeof VISUAL_MEDIA_NOTICE_MESSAGES;
      message: string;
    }
  | {
      ok: false;
      error: keyof typeof VISUAL_MEDIA_ERROR_MESSAGES;
      message: string;
    };

const returnPathSchema = z.object({
  returnPath: z.string().optional()
});

const placementUpdateFormSchema = z.object({
  key: visualMediaPlacementKeySchema,
  altText: z.string().trim().max(300).optional(),
  objectPosition: z.string().trim().max(50).optional(),
  overlayStyle: z.nativeEnum(VisualMediaOverlayStyle).nullable().optional(),
  returnPath: z.string().optional()
});

const uploadFormSchema = z.object({
  key: visualMediaPlacementKeySchema,
  mode: z.enum(["desktop", "mobile"]),
  returnPath: z.string().optional()
});

const removeAssetFormSchema = z.object({
  key: visualMediaPlacementKeySchema,
  mode: z.enum(["desktop", "mobile"]),
  returnPath: z.string().optional()
});

function appendQueryParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(value: string | undefined, fallback = "/admin/visual-media") {
  return safeRedirectPath(value, fallback);
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

function revalidateVisualMediaAdminSurface() {
  revalidatePath("/admin/visual-media");
}

function createNoticeResult(
  notice: keyof typeof VISUAL_MEDIA_NOTICE_MESSAGES
): VisualMediaActionResult {
  return {
    ok: true,
    notice,
    message: VISUAL_MEDIA_NOTICE_MESSAGES[notice]
  };
}

function createErrorResult(
  error: keyof typeof VISUAL_MEDIA_ERROR_MESSAGES
): VisualMediaActionResult {
  return {
    ok: false,
    error,
    message: VISUAL_MEDIA_ERROR_MESSAGES[error]
  };
}

function resolveOverlayStyle(value: string | null) {
  if (!value) {
    return null;
  }

  return VisualMediaOverlayStyle[value as keyof typeof VisualMediaOverlayStyle] ?? null;
}

export async function updateVisualMediaPlacementDetailsAction(formData: FormData) {
  await requireAdmin();

  const parsedReturnPath = returnPathSchema.safeParse({
    returnPath: String(formData.get("returnPath") || "")
  });
  const returnPath = resolveReturnPath(
    parsedReturnPath.success ? parsedReturnPath.data.returnPath : undefined
  );

  const parsed = placementUpdateFormSchema.safeParse({
    key: String(formData.get("key") || ""),
    altText: String(formData.get("altText") || ""),
    objectPosition: String(formData.get("objectPosition") || ""),
    overlayStyle: resolveOverlayStyle(String(formData.get("overlayStyle") || "") || null),
    returnPath: String(formData.get("returnPath") || "")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-placement");
  }

  const current = await getVisualMediaPlacement(parsed.data.key);

  if (!current) {
    redirectWithError(returnPath, "invalid-placement");
  }

  await updateVisualMediaPlacementDetails({
    key: parsed.data.key,
    altText: parsed.data.altText || null,
    objectPosition: parsed.data.objectPosition || null,
    overlayStyle: parsed.data.overlayStyle ?? null,
    isActive: current.imageUrl ? formData.get("isActive") === "on" : false
  });

  revalidateVisualMediaAdminSurface();
  redirectWithNotice(returnPath, "placement-saved");
}

async function persistPlacementUpload(
  formData: FormData
): Promise<VisualMediaActionResult> {
  await requireAdmin();

  const parsed = uploadFormSchema.safeParse({
    key: String(formData.get("key") || ""),
    mode: String(formData.get("mode") || ""),
    returnPath: String(formData.get("returnPath") || "")
  });

  if (!parsed.success) {
    return createErrorResult("invalid-placement");
  }

  const file = formData.get("file");

  if (!isVisualMediaFileValue(file) || !file.size) {
    console.warn("[visual-media] upload missing file", {
      key: parsed.data.key,
      mode: parsed.data.mode,
      fileWasNull: file === null
    });

    return createErrorResult("missing-file");
  }

  console.info("[visual-media] upload action starting", {
    key: parsed.data.key,
    mode: parsed.data.mode,
    size: file.size,
    type: file.type || "unknown"
  });

  try {
    await uploadVisualMediaPlacementAsset({
      key: parsed.data.key,
      mode: parsed.data.mode,
      file
    });

    console.info("[visual-media] upload action completed", {
      key: parsed.data.key,
      mode: parsed.data.mode
    });
  } catch (error) {
    if (error instanceof Error && error.message === "visual-media-too-large") {
      return createErrorResult("file-too-large");
    }

    if (error instanceof Error && error.message === "invalid-visual-media") {
      return createErrorResult("invalid-file");
    }

    if (error instanceof Error && error.message === "visual-media-placement-not-found") {
      return createErrorResult("invalid-placement");
    }

    console.error("[visual-media] upload action failed", {
      key: parsed.data.key,
      mode: parsed.data.mode,
      message: error instanceof Error ? error.message : "unknown-error"
    });

    return createErrorResult(
      error instanceof Error && error.message === "cloudinary-upload-timeout"
        ? "upload-timeout"
        : "upload-failed"
    );
  }

  revalidateVisualMediaAdminSurface();
  return createNoticeResult(
    parsed.data.mode === "desktop" ? "desktop-uploaded" : "mobile-uploaded"
  );
}

export async function submitVisualMediaPlacementUploadAction(
  formData: FormData
): Promise<VisualMediaActionResult> {
  return persistPlacementUpload(formData);
}

export async function uploadVisualMediaDesktopImageAction(formData: FormData) {
  const result = await persistPlacementUpload(
    appendModeToFormData(formData, "desktop")
  );
  const returnPath = resolveReturnPath(String(formData.get("returnPath") || ""));

  if (!result.ok) {
    redirectWithError(returnPath, result.error);
  }

  redirectWithNotice(returnPath, result.notice);
}

export async function uploadVisualMediaMobileImageAction(formData: FormData) {
  const result = await persistPlacementUpload(
    appendModeToFormData(formData, "mobile")
  );
  const returnPath = resolveReturnPath(String(formData.get("returnPath") || ""));

  if (!result.ok) {
    redirectWithError(returnPath, result.error);
  }

  redirectWithNotice(returnPath, result.notice);
}

function appendModeToFormData(formData: FormData, mode: "desktop" | "mobile") {
  const nextFormData = new FormData();

  formData.forEach((value, key) => {
    if (key !== "mode") {
      nextFormData.append(key, value);
    }
  });

  nextFormData.set("mode", mode);
  return nextFormData;
}

async function persistVisualMediaPlacementAssetRemoval(
  formData: FormData
): Promise<VisualMediaActionResult> {
  await requireAdmin();

  const parsed = removeAssetFormSchema.safeParse({
    key: String(formData.get("key") || ""),
    mode: String(formData.get("mode") || ""),
    returnPath: String(formData.get("returnPath") || "")
  });

  if (!parsed.success) {
    return createErrorResult("invalid-placement");
  }

  try {
    await removeVisualMediaPlacementAssetMutation({
      key: parsed.data.key,
      mode: parsed.data.mode
    });
  } catch (error) {
    if (error instanceof Error && error.message === "visual-media-placement-not-found") {
      return createErrorResult("invalid-placement");
    }

    throw error;
  }

  revalidateVisualMediaAdminSurface();
  return createNoticeResult(
    parsed.data.mode === "desktop" ? "desktop-removed" : "mobile-removed"
  );
}

export async function submitVisualMediaPlacementAssetRemovalAction(
  formData: FormData
): Promise<VisualMediaActionResult> {
  return persistVisualMediaPlacementAssetRemoval(formData);
}

export async function removeVisualMediaPlacementAssetAction(formData: FormData) {
  const returnPath = resolveReturnPath(String(formData.get("returnPath") || ""));
  const result = await persistVisualMediaPlacementAssetRemoval(formData);

  if (!result.ok) {
    redirectWithError(returnPath, result.error);
  }

  redirectWithNotice(returnPath, result.notice);
}
