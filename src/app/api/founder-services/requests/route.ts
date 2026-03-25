import { FounderServicePaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import {
  founderServiceRequestSchema,
  type FounderServiceRequestFormValues
} from "@/lib/validators";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  createFounderServiceCheckoutSession,
  createFounderServiceRequest,
  isFileValue,
  MAX_FOUNDER_UPLOAD_COUNT,
  persistFounderUpload
} from "@/server/founder";

export const runtime = "nodejs";

type FounderRequestApiResponse = {
  ok?: boolean;
  url?: string;
  requestId?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof FounderServiceRequestFormValues, string[]>>;
};

function toFormPayload(formData: FormData): FounderServiceRequestFormValues & {
  serviceSlug: string;
} {
  return {
    serviceSlug: String(formData.get("serviceSlug") || ""),
    sourcePage: String(formData.get("sourcePage") || ""),
    sourceSection: String(formData.get("sourceSection") || ""),
    fullName: String(formData.get("fullName") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    businessName: String(formData.get("businessName") || ""),
    website: String(formData.get("website") || ""),
    industry: String(formData.get("industry") || ""),
    location: String(formData.get("location") || ""),
    yearsInBusiness: String(formData.get("yearsInBusiness") || ""),
    employeeCount: String(formData.get("employeeCount") || ""),
    revenueRange: String(formData.get("revenueRange") || "") as FounderServiceRequestFormValues["revenueRange"],
    instagram: String(formData.get("instagram") || ""),
    tiktok: String(formData.get("tiktok") || ""),
    facebook: String(formData.get("facebook") || ""),
    linkedin: String(formData.get("linkedin") || ""),
    otherSocial: String(formData.get("otherSocial") || ""),
    businessDescription: String(formData.get("businessDescription") || ""),
    targetAudience: String(formData.get("targetAudience") || ""),
    productsOrServices: String(formData.get("productsOrServices") || ""),
    offers: String(formData.get("offers") || ""),
    differentiator: String(formData.get("differentiator") || ""),
    mainGoal: String(formData.get("mainGoal") || ""),
    biggestChallenge: String(formData.get("biggestChallenge") || ""),
    blockers: String(formData.get("blockers") || ""),
    pastAttempts: String(formData.get("pastAttempts") || ""),
    successDefinition: String(formData.get("successDefinition") || ""),
    marketingChannels: formData
      .getAll("marketingChannels")
      .map(String) as FounderServiceRequestFormValues["marketingChannels"],
    whyTrev: String(formData.get("whyTrev") || "")
  };
}

export async function POST(request: Request) {
  let createdRequestId: string | null = null;
  let createdRequestIntakeMode: "CHECKOUT" | "APPLICATION" | null = null;

  if (!isTrustedOrigin(request)) {
    return NextResponse.json<FounderRequestApiResponse>(
      {
        ok: false,
        error: "Untrusted request origin."
      },
      { status: 403 }
    );
  }

  const submissionRate = await consumeRateLimit({
    key: `api:founder-services:${clientIpFromHeaders(request.headers)}`,
    limit: 6,
    windowMs: 15 * 60 * 1000
  });
  const headers = rateLimitHeaders(submissionRate);

  if (!submissionRate.allowed) {
    return NextResponse.json<FounderRequestApiResponse>(
      {
        ok: false,
        error: "Too many founder service submissions. Please try again shortly."
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(submissionRate.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const formData = await request.formData();
    const payload = toFormPayload(formData);
    const parsed = founderServiceRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json<FounderRequestApiResponse>(
        {
          ok: false,
          error: "Please review the form and try again.",
          fieldErrors: parsed.error.flatten().fieldErrors
        },
        { status: 400, headers }
      );
    }

    const uploadFiles = formData
      .getAll("uploads")
      .filter((value): value is File => isFileValue(value) && value.size > 0);

    if (uploadFiles.length > MAX_FOUNDER_UPLOAD_COUNT) {
      return NextResponse.json<FounderRequestApiResponse>(
        {
          ok: false,
          error: `You can upload up to ${MAX_FOUNDER_UPLOAD_COUNT} files per request.`
        },
        { status: 400, headers }
      );
    }

    const session = await auth();
    const createdRequest = await createFounderServiceRequest({
      ...parsed.data,
      serviceSlug: parsed.data.serviceSlug,
      userId: session?.user?.suspended ? null : session?.user?.id ?? null
    });
    createdRequestId = createdRequest.id;
    createdRequestIntakeMode = createdRequest.service.intakeMode;

    if (uploadFiles.length) {
      const storedUploads = [];
      for (const file of uploadFiles) {
        storedUploads.push(await persistFounderUpload(file, createdRequest.id));
      }

      await db.founderServiceRequest.update({
        where: { id: createdRequest.id },
        data: {
          uploads: {
            create: storedUploads.map((upload) => ({
              fileUrl: upload.fileUrl,
              fileName: upload.fileName,
              mimeType: upload.mimeType
            }))
          }
        }
      });
    }

    if (createdRequest.service.intakeMode === "APPLICATION") {
      return NextResponse.json<FounderRequestApiResponse>(
        {
          ok: true,
          url: absoluteUrl(`/founder/thanks?request=${createdRequest.id}&status=submitted`),
          requestId: createdRequest.id
        },
        { headers }
      );
    }

    const checkout = await createFounderServiceCheckoutSession(createdRequest.id);

    return NextResponse.json<FounderRequestApiResponse>(
      {
        ok: true,
        url: checkout.url,
        requestId: createdRequest.id
      },
      { headers }
    );
  } catch (error) {
    if (createdRequestId && createdRequestIntakeMode !== "APPLICATION") {
      await db.founderServiceRequest.update({
        where: { id: createdRequestId },
        data: {
          paymentStatus: FounderServicePaymentStatus.FAILED
        }
      });
    }

    if (error instanceof Error) {
      if (error.message === "service-not-found") {
        return NextResponse.json<FounderRequestApiResponse>(
          {
            ok: false,
            error: "That founder service is no longer available."
          },
          { status: 404 }
        );
      }

      if (error.message === "upload-too-large") {
        return NextResponse.json<FounderRequestApiResponse>(
          {
            ok: false,
            error: "Each upload must be 10MB or smaller."
          },
          { status: 400, headers }
        );
      }

      if (error.message === "invalid-upload-type") {
        return NextResponse.json<FounderRequestApiResponse>(
          {
            ok: false,
            error: "Uploads must be images, PDF documents, or standard office files."
          },
          { status: 400, headers }
        );
      }
    }

    logServerError("founder-service-request-submission-failed", error);

    return NextResponse.json<FounderRequestApiResponse>(
      {
        ok: false,
        error: "Unable to submit your founder request right now."
      },
      { status: 500, headers }
    );
  }
}
