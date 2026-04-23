import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  isVisualMediaFileValue,
  visualMediaPlacementKeySchema
} from "@/lib/visual-media";
import { requireAdmin } from "@/lib/session";
import { uploadVisualMediaPlacementAsset } from "@/server/visual-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadRequestSchema = z.object({
  key: visualMediaPlacementKeySchema,
  mode: z.enum(["desktop", "mobile"])
});

const ERROR_MESSAGES = {
  "invalid-placement": "That placement could not be updated.",
  "missing-file": "Choose an image before uploading.",
  "invalid-file": "Only valid image files can be uploaded here.",
  "file-too-large": "That image is too large. Keep uploads under 8MB.",
  "upload-timeout": "The image upload timed out. Try again with a smaller image or check Cloudinary.",
  "upload-failed": "The image upload could not be completed right now."
} as const;

function errorResponse(
  error: keyof typeof ERROR_MESSAGES,
  status: number,
  context?: Record<string, unknown>
) {
  if (context) {
    console.warn("[visual-media] upload route returning error", {
      error,
      ...context
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error,
      message: ERROR_MESSAGES[error]
    },
    { status }
  );
}

export async function POST(request: Request) {
  console.info("[visual-media] upload request started");
  await requireAdmin();

  try {
    const formData = await request.formData();
    const parsed = uploadRequestSchema.safeParse({
      key: String(formData.get("key") || ""),
      mode: String(formData.get("mode") || "")
    });

    if (!parsed.success) {
      return errorResponse("invalid-placement", 400);
    }

    const file = formData.get("file");
    console.info("[visual-media] upload request parsed", {
      key: parsed.data.key,
      mode: parsed.data.mode,
      filePresent: Boolean(file),
      fileIsValidObject: isVisualMediaFileValue(file)
    });

    if (!isVisualMediaFileValue(file) || !file.size) {
      return errorResponse("missing-file", 400, {
        key: parsed.data.key,
        mode: parsed.data.mode,
        fileWasNull: file === null
      });
    }

    const placement = await uploadVisualMediaPlacementAsset({
      key: parsed.data.key,
      mode: parsed.data.mode,
      file
    });

    if (!placement) {
      return errorResponse("invalid-placement", 404, {
        key: parsed.data.key,
        mode: parsed.data.mode
      });
    }

    revalidatePath("/admin/visual-media");

    console.info("[visual-media] upload request completed", {
      key: parsed.data.key,
      mode: parsed.data.mode,
      imageUrl: parsed.data.mode === "desktop" ? placement.imageUrl : placement.mobileImageUrl
    });

    return NextResponse.json({
      ok: true,
      notice: parsed.data.mode === "desktop" ? "desktop-uploaded" : "mobile-uploaded",
      message: parsed.data.mode === "desktop" ? "Desktop image uploaded." : "Mobile image uploaded.",
      imageUrl: parsed.data.mode === "desktop" ? placement.imageUrl : placement.mobileImageUrl
    });
  } catch (error) {
    if (error instanceof Error && error.message === "visual-media-too-large") {
      return errorResponse("file-too-large", 413);
    }

    if (error instanceof Error && error.message === "invalid-visual-media") {
      return errorResponse("invalid-file", 400);
    }

    if (error instanceof Error && error.message === "visual-media-placement-not-found") {
      return errorResponse("invalid-placement", 404);
    }

    if (error instanceof Error && error.message === "cloudinary-upload-timeout") {
      return errorResponse("upload-timeout", 504);
    }

    console.error("[visual-media] upload request failed", {
      message: error instanceof Error ? error.message : "unknown-error"
    });

    return errorResponse("upload-failed", 500);
  }
}
