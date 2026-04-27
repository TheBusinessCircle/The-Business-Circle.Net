import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { visualMediaPlacementKeySchema } from "@/lib/visual-media";
import {
  generateVisualMediaPlacementAsset,
  VisualMediaGenerationError
} from "@/server/visual-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const generateRequestSchema = z.object({
  key: visualMediaPlacementKeySchema,
  mode: z.enum(["desktop", "mobile"]),
  prompt: z.string().trim().max(12000).optional().default("")
});

function statusForGenerationError(error: VisualMediaGenerationError) {
  switch (error.code) {
    case "visual-media-placement-not-found":
      return 404;
    case "image-provider-unavailable":
    case "cloudinary-unavailable":
      return 400;
    default:
      return 500;
  }
}

function errorResponse(
  message: string,
  status: number,
  context?: {
    error?: string;
    details?: Record<string, unknown>;
  }
) {
  return NextResponse.json(
    {
      ok: false,
      error: context?.error ?? "visual-media-generation-failed",
      message,
      details: context?.details ?? null
    },
    { status }
  );
}

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as unknown;
    const parsed = generateRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return errorResponse("That placement could not be generated.", 400, {
        error: "invalid-placement"
      });
    }

    console.info("[visual-media] generation request started", {
      key: parsed.data.key,
      mode: parsed.data.mode,
      promptLength: parsed.data.prompt.length
    });

    const result = await generateVisualMediaPlacementAsset({
      key: parsed.data.key,
      mode: parsed.data.mode,
      prompt: parsed.data.prompt
    });

    revalidatePath("/admin/visual-media");

    return NextResponse.json({
      ok: true,
      message:
        parsed.data.mode === "desktop"
          ? "Desktop image generated and attached."
          : "Mobile image generated and attached.",
      imageUrl: result.imageUrl,
      prompt: result.prompt,
      metadata: result.metadata
    });
  } catch (error) {
    if (error instanceof VisualMediaGenerationError) {
      console.warn("[visual-media] generation request failed", {
        code: error.code,
        message: error.message,
        details: error.details ?? null
      });

      return errorResponse(error.message, statusForGenerationError(error), {
        error: error.code,
        details: error.details
      });
    }

    console.error("[visual-media] generation request failed", {
      message: error instanceof Error ? error.message : "unknown-error"
    });

    return errorResponse("Image generation could not be completed right now.", 500);
  }
}
