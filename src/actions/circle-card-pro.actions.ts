"use server";

import { LeadSource, Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  clientIpFromHeaders,
  consumeRateLimit
} from "@/lib/security/rate-limit";
import { recordLead } from "@/server/lead-generation";

const CIRCLE_CARD_PRO_INTEREST_SOURCE = "CIRCLE_CARD_PRO_INTEREST";
const CIRCLE_CARD_PRO_INTEREST_PATH = "/circle-card/pro";

const proInterestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  businessName: z.string().trim().max(160).optional().or(z.literal("")),
  contactConsent: z.literal("on"),
  marketingEmailOptIn: z.string().optional()
});

function redirectWithStatus(status: "registered" | "invalid" | "rate-limited" | "failed"): never {
  if (status === "registered") {
    redirect(`${CIRCLE_CARD_PRO_INTEREST_PATH}?registered=1#register-interest`);
  }

  redirect(`${CIRCLE_CARD_PRO_INTEREST_PATH}?error=${status}#register-interest`);
}

export async function registerCircleCardProInterestAction(formData: FormData) {
  const parsed = proInterestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    businessName: formData.has("businessName") ? formData.get("businessName") : undefined,
    contactConsent: formData.get("contactConsent"),
    marketingEmailOptIn: formData.has("marketingEmailOptIn")
      ? formData.get("marketingEmailOptIn")
      : undefined
  });

  if (!parsed.success) {
    redirectWithStatus("invalid");
  }
  const values = parsed.data;

  const [session, requestHeaders] = await Promise.all([auth(), headers()]);
  const userId = session?.user?.id ?? null;
  const userContext = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          suspended: true,
          circleCards: {
            orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
            take: 1,
            select: {
              id: true,
              slug: true,
              fullName: true,
              businessName: true,
              accountType: true
            }
          }
        }
      })
    : null;
  const activeUserContext = userContext && !userContext.suspended ? userContext : null;
  const primaryCard = activeUserContext?.circleCards[0] ?? null;
  const clientIp = clientIpFromHeaders(requestHeaders);
  const rateLimit = await consumeRateLimit({
    key: `circle-card-pro-interest:${activeUserContext?.id ?? clientIp}:${values.email.toLowerCase()}`,
    limit: 5,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    redirectWithStatus("rate-limited");
  }

  const marketingEmailOptIn = values.marketingEmailOptIn === "on";
  const businessName = values.businessName?.trim() || primaryCard?.businessName || null;

  try {
    await recordLead({
      userId: activeUserContext?.id ?? undefined,
      name: values.name,
      email: values.email,
      businessName,
      source: LeadSource.CIRCLE_CARD_SIGNUP,
      sourceLabel: "Circle Card Pro Interest",
      consentSource: "Circle Card Pro interest form",
      essentialConsent: true,
      marketingEmailOptIn,
      tags: [
        "circle-card",
        "pro-interest",
        "circle-card-pro",
        "early-access",
        primaryCard?.slug ? `card:${primaryCard.slug}` : ""
      ],
      score: businessName ? 45 : 25,
      notes: "Circle Card Pro interest captured. Tag: pro-interest.",
      metadata: {
        source: CIRCLE_CARD_PRO_INTEREST_SOURCE,
        product: "circle-card-pro",
        sourcePath: CIRCLE_CARD_PRO_INTEREST_PATH,
        marketingEmailOptIn,
        loggedIn: Boolean(activeUserContext),
        user: activeUserContext
          ? {
              id: activeUserContext.id,
              name: activeUserContext.name,
              email: activeUserContext.email
            }
          : null,
        circleCard: primaryCard
          ? {
              id: primaryCard.id,
              slug: primaryCard.slug,
              fullName: primaryCard.fullName,
              businessName: primaryCard.businessName,
              accountType: primaryCard.accountType
            }
          : null,
        tags: ["pro-interest"]
      } satisfies Prisma.InputJsonObject
    });
  } catch {
    redirectWithStatus("failed");
  }

  redirectWithStatus("registered");
}
