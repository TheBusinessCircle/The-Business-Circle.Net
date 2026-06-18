import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import { recordAuditQuizLead } from "@/server/lead-generation";

export const runtime = "nodejs";

const auditLeadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(320),
  businessName: z.string().trim().min(2).max(140),
  website: z.string().trim().max(2048).optional().or(z.literal("")),
  essentialConsent: z.literal(true, {
    errorMap: () => ({
      message: "You must agree to receive your audit result on this website and essential follow-up."
    })
  }),
  marketingEmailOptIn: z.boolean().optional().default(false),
  score: z.number().int().min(0).max(30),
  resultType: z.string().trim().min(2).max(120),
  recommendedTier: z.string().trim().min(2).max(80),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1).max(80),
        score: z.number().int().min(1).max(3).nullable()
      })
    )
    .min(1)
    .max(20),
  strengths: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  weaknesses: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  sourcePath: z.string().trim().max(600).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  topic: z.string().trim().max(120).optional().or(z.literal(""))
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

  const auditLeadRate = await consumeRateLimit({
    key: `api:audit-lead:${clientIpFromHeaders(request.headers)}`,
    limit: 8,
    windowMs: 10 * 60 * 1000
  });
  const headers = rateLimitHeaders(auditLeadRate);

  if (!auditLeadRate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many audit submissions. Please try again later."
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(auditLeadRate.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const payload = (await request.json().catch(() => null)) as unknown;
    const parsed = auditLeadSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid audit lead submission.",
          fieldErrors: parsed.error.flatten().fieldErrors
        },
        { status: 400, headers }
      );
    }

    const sourcePath =
      parsed.data.sourcePath && parsed.data.sourcePath.startsWith("/")
        ? parsed.data.sourcePath
        : "/audit";

    const lead = await recordAuditQuizLead({
      ...parsed.data,
      sourcePath,
      source: parsed.data.source || null,
      topic: parsed.data.topic || null
    });

    return NextResponse.json(
      {
        ok: true,
        leadId: lead.id
      },
      { headers }
    );
  } catch (error) {
    logServerError("audit-lead-route-failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to save your audit details. Please try again."
      },
      { status: 500, headers }
    );
  }
}
