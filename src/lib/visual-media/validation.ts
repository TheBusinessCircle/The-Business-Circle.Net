import { z } from "zod";
import { VisualMediaOverlayStyle } from "@prisma/client";
import {
  isVisualMediaPlacementKey,
  type VisualMediaPlacementKey
} from "@/lib/visual-media/constants";

export const VISUAL_MEDIA_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const VISUAL_MEDIA_UPLOAD_PATH_PREFIX = "/uploads/visual-media/";

const objectPositionPattern = /^([a-z]+|\d{1,3}%)( ([a-z]+|\d{1,3}%))?$/i;

const managedVisualMediaUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      if (value.startsWith(VISUAL_MEDIA_UPLOAD_PATH_PREFIX)) {
        return true;
      }

      return z.string().url().safeParse(value).success;
    },
    {
      message: "Visual media must be a full URL or a managed upload path."
    }
  );

export const visualMediaPlacementKeySchema = z
  .string()
  .trim()
  .refine((value): value is VisualMediaPlacementKey => isVisualMediaPlacementKey(value), {
    message: "Unknown visual media placement key."
  });

export const visualMediaPlacementUpdateSchema = z.object({
  key: visualMediaPlacementKeySchema,
  altText: z.string().trim().max(300).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  overlayStyle: z.nativeEnum(VisualMediaOverlayStyle).nullable().optional(),
  objectPosition: z
    .string()
    .trim()
    .max(50)
    .refine((value) => !value || objectPositionPattern.test(value), {
      message: "Object position must be a CSS-compatible keyword or percentage pair."
    })
    .optional()
    .or(z.literal("")),
  focalPointX: z.number().int().min(0).max(100).nullable().optional(),
  focalPointY: z.number().int().min(0).max(100).nullable().optional(),
  imageUrl: managedVisualMediaUrlSchema.optional().or(z.literal("")),
  mobileImageUrl: managedVisualMediaUrlSchema.optional().or(z.literal("")),
  adminHelperText: z.string().trim().max(300).optional().or(z.literal(""))
});

export function isVisualMediaFileValue(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export function isSupportedVisualMediaFile(file: File) {
  if (file.type) {
    return file.type.startsWith("image/");
  }

  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(file.name);
}

export function visualMediaFileExtension(file: File) {
  const byName = file.name.match(/\.[a-z0-9]{2,5}$/i)?.[0]?.toLowerCase();

  if (byName) {
    return byName;
  }

  const typeMap: Record<string, string> = {
    "image/avif": ".avif",
    "image/bmp": ".bmp",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp"
  };

  return typeMap[file.type] ?? ".jpg";
}
