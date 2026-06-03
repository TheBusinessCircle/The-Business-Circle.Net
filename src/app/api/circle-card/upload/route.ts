import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import {
  isCircleCardImageUploadKind,
  persistCircleCardImageUpload
} from "@/server/circle-card/upload.service";

export const runtime = "nodejs";

function isFileValue(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
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

    const uploadRate = await consumeRateLimit({
      key: `api:circle-card:image-upload:${authResult.user.id}`,
      limit: 30,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(uploadRate);

    if (!uploadRate.allowed) {
      return NextResponse.json(
        { error: "Too many image uploads. Please wait and try again." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(uploadRate.retryAfterSeconds)
          }
        }
      );
    }

    const formData = await request.formData();
    const kind = String(formData.get("kind") || "profile-photo");
    const image = formData.get("image");

    if (!isCircleCardImageUploadKind(kind)) {
      return NextResponse.json({ error: "Invalid image upload type." }, { status: 400, headers });
    }

    if (!isFileValue(image) || image.size <= 0) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400, headers });
    }

    const imageUrl = await persistCircleCardImageUpload({
      file: image,
      userId: authResult.user.id,
      kind
    });

    return NextResponse.json({ ok: true, imageUrl }, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "circle-card-image-too-large") {
      return NextResponse.json(
        { error: "Circle Card images must be 5MB or smaller." },
        { status: 400, headers }
      );
    }

    if (error instanceof Error && error.message === "invalid-circle-card-image") {
      return NextResponse.json(
        { error: "Upload a JPG, PNG or WebP image." },
        { status: 400, headers }
      );
    }

    logServerError("circle-card-image-upload-failed", error);
    return NextResponse.json({ error: "Unable to upload image." }, { status: 500, headers });
  }
}
