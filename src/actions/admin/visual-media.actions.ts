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
  removeVisualMediaPlacementAsset,
  updateVisualMediaPlacementDetails,
  uploadVisualMediaPlacementAsset
} from "@/server/visual-media";

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
  formData: FormData,
  mode: "desktop" | "mobile"
) {
  await requireAdmin();

  const parsedReturnPath = returnPathSchema.safeParse({
    returnPath: String(formData.get("returnPath") || "")
  });
  const returnPath = resolveReturnPath(
    parsedReturnPath.success ? parsedReturnPath.data.returnPath : undefined
  );
  const parsed = uploadFormSchema.safeParse({
    key: String(formData.get("key") || ""),
    returnPath: String(formData.get("returnPath") || "")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-placement");
  }

  const file = formData.get("file");

  if (!isVisualMediaFileValue(file) || !file.size) {
    redirectWithError(returnPath, "missing-file");
  }

  try {
    await uploadVisualMediaPlacementAsset({
      key: parsed.data.key,
      mode,
      file
    });
  } catch (error) {
    if (error instanceof Error && error.message === "visual-media-too-large") {
      redirectWithError(returnPath, "file-too-large");
    }

    if (error instanceof Error && error.message === "invalid-visual-media") {
      redirectWithError(returnPath, "invalid-file");
    }

    if (error instanceof Error && error.message === "visual-media-placement-not-found") {
      redirectWithError(returnPath, "invalid-placement");
    }

    throw error;
  }

  revalidateVisualMediaAdminSurface();
  redirectWithNotice(returnPath, mode === "desktop" ? "desktop-uploaded" : "mobile-uploaded");
}

export async function uploadVisualMediaDesktopImageAction(formData: FormData) {
  await persistPlacementUpload(formData, "desktop");
}

export async function uploadVisualMediaMobileImageAction(formData: FormData) {
  await persistPlacementUpload(formData, "mobile");
}

export async function removeVisualMediaPlacementAssetAction(formData: FormData) {
  await requireAdmin();

  const parsedReturnPath = returnPathSchema.safeParse({
    returnPath: String(formData.get("returnPath") || "")
  });
  const returnPath = resolveReturnPath(
    parsedReturnPath.success ? parsedReturnPath.data.returnPath : undefined
  );
  const parsed = removeAssetFormSchema.safeParse({
    key: String(formData.get("key") || ""),
    mode: String(formData.get("mode") || ""),
    returnPath: String(formData.get("returnPath") || "")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-placement");
  }

  try {
    await removeVisualMediaPlacementAsset({
      key: parsed.data.key,
      mode: parsed.data.mode
    });
  } catch (error) {
    if (error instanceof Error && error.message === "visual-media-placement-not-found") {
      redirectWithError(returnPath, "invalid-placement");
    }

    throw error;
  }

  revalidateVisualMediaAdminSurface();
  redirectWithNotice(returnPath, parsed.data.mode === "desktop" ? "desktop-removed" : "mobile-removed");
}
