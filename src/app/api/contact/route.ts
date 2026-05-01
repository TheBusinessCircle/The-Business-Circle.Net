import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { contactSchema } from "@/lib/validators";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import { createContactSubmission } from "@/server/contact";

export const runtime = "nodejs";

const contactSubmissionSchema = contactSchema.extend({
  sourcePath: z.string().trim().min(1).max(280).optional(),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  subject: z.string().trim().max(160).optional().or(z.literal(""))
});

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Untrusted request origin."
      },
      { status: 403 }
    );
  }

  const contactRate = await consumeRateLimit({
    key: `api:contact:${clientIpFromHeaders(request.headers)}`,
    limit: 8,
    windowMs: 10 * 60 * 1000
  });
  const headers = rateLimitHeaders(contactRate);

  if (!contactRate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many contact submissions. Please try again later."
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(contactRate.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const payload = (await request.json().catch(() => null)) as unknown;
    const parsed = contactSubmissionSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid contact form submission.",
          fieldErrors: parsed.error.flatten().fieldErrors
        },
        { status: 400, headers }
      );
    }

    const session = await auth();
    const sourcePath =
      parsed.data.sourcePath && parsed.data.sourcePath.startsWith("/")
        ? parsed.data.sourcePath
        : "/contact";

    const saved = await createContactSubmission({
      ...parsed.data,
      userId: session?.user?.id ?? null,
      sourcePath,
      source: parsed.data.source || null,
      subject: parsed.data.subject || null,
      memberContext: session?.user
        ? {
            membershipTier: session.user.membershipTier,
            role: session.user.role,
            email: session.user.email ?? null
          }
        : null
    });

    return NextResponse.json({
      ok: true,
      message: "Thanks. We received your message and will respond soon.",
      submissionId: saved.id
    }, { headers });
  } catch (error) {
    logServerError("contact-route-failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to submit contact form. Please try again."
      },
      { status: 500, headers }
    );
  }
}
