import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { scanBusinessCardImage, trackCircleCardEvent } from "@/server/circle-card";
import {
  isSupportedCircleCardImageFile,
  MAX_CIRCLE_CARD_IMAGE_UPLOAD_BYTES
} from "@/server/circle-card/upload.service";

export const runtime = "nodejs";

function isFileValue(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function getPrimaryCardId(userId: string) {
  const card = await prisma.circleCard.findFirst({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    select: { id: true }
  });

  return card?.id ?? null;
}

export async function POST(request: Request) {
  let headers: HeadersInit | undefined;

  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
    }

    const authResult = await requireApiUser({ allowUnentitled: true });
    if ("response" in authResult) {
      return authResult.response;
    }

    const rate = await consumeRateLimit({
      key: `api:circle-card:business-card-scan:${authResult.user.id}`,
      limit: 20,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(rate);

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many business card scans. Please wait and try again." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(rate.retryAfterSeconds)
          }
        }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!isFileValue(image) || image.size <= 0) {
      return NextResponse.json({ error: "Choose a business card image." }, { status: 400, headers });
    }

    if (!isSupportedCircleCardImageFile(image)) {
      return NextResponse.json(
        { error: "Upload a JPG, JPEG, PNG or WEBP business card image." },
        { status: 400, headers }
      );
    }

    if (image.size > MAX_CIRCLE_CARD_IMAGE_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error:
            "Business card images must be 5MB or smaller. Please retake the photo a little further away or choose a smaller image."
        },
        { status: 413, headers }
      );
    }

    const scan = await scanBusinessCardImage({
      file: image,
      userId: authResult.user.id
    });
    const primaryCardId = await getPrimaryCardId(authResult.user.id);

    if (primaryCardId) {
      await Promise.all([
        trackCircleCardEvent({
          cardId: primaryCardId,
          eventType: "BUSINESS_CARD_SCANNED",
          userId: authResult.user.id,
          metadata: {
            source: "connect_hub",
            extractionMethod: scan.extractionMethod,
            matchCount: scan.matches.length,
            duplicateFound: Boolean(scan.duplicateContact)
          }
        }),
        scan.matches.length
          ? trackCircleCardEvent({
              cardId: primaryCardId,
              eventType: "BUSINESS_CARD_MATCH_FOUND",
              userId: authResult.user.id,
              metadata: {
                source: "connect_hub",
                matchCount: scan.matches.length
              }
            })
          : Promise.resolve({ stored: false as const })
      ]);
    }

    return NextResponse.json({ ok: true, scan }, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "circle-card-image-too-large") {
      return NextResponse.json(
        {
          error:
            "Business card images must be 5MB or smaller. Please retake the photo a little further away or choose a smaller image."
        },
        { status: 400, headers }
      );
    }

    if (error instanceof Error && error.message === "invalid-circle-card-image") {
      return NextResponse.json(
        { error: "Upload a JPG, JPEG, PNG or WEBP business card image." },
        { status: 400, headers }
      );
    }

    logServerError("business-card-scan-failed", error);
    return NextResponse.json({ error: "Unable to scan business card." }, { status: 500, headers });
  }
}
