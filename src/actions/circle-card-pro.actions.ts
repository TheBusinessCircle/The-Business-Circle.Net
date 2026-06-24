"use server";

import { LeadSource, Prisma } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import {
  CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID,
  CIRCLE_CARD_REFERRAL_COOKIE_CODE,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE
} from "@/lib/circle-card/referral-engine";
import { prisma } from "@/lib/prisma";
import { logServerWarning } from "@/lib/security/logging";
import {
  clientIpFromHeaders,
  consumeRateLimit
} from "@/lib/security/rate-limit";
import { recordLead } from "@/server/lead-generation";
import { markCircleCardReferralProductInterest } from "@/server/circle-card";

const CIRCLE_CARD_PRO_INTEREST_SOURCE = "CIRCLE_CARD_PRO_INTEREST";
const CIRCLE_CARD_PRO_INTEREST_PATH = "/circle-card/pro";
const CIRCLE_CARD_TEAMS_INTEREST_SOURCE = "CIRCLE_CARD_TEAMS_INTEREST";
const CIRCLE_CARD_TEAMS_INTEREST_PATH = "/circle-card/teams";

const proInterestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  businessName: z.string().trim().max(160).optional().or(z.literal("")),
  contactConsent: z.literal("on"),
  marketingEmailOptIn: z.string().optional()
});
const teamsInterestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  businessName: z.string().trim().min(2).max(160),
  teamSize: z.string().trim().max(80).optional().or(z.literal("")),
  website: z.string().trim().max(220).optional().or(z.literal("")),
  contactConsent: z.literal("on"),
  marketingEmailOptIn: z.string().optional()
});

function redirectWithStatus(
  path: string,
  status: "registered" | "invalid" | "rate-limited" | "failed"
): never {
  if (status === "registered") {
    redirect(`${path}?registered=1#register-interest`);
  }

  redirect(`${path}?error=${status}#register-interest`);
}

async function readCircleCardReferralContext() {
  const cookieStore = await cookies();

  return {
    referralCode: cookieStore.get(CIRCLE_CARD_REFERRAL_COOKIE_CODE)?.value ?? "",
    referralClickId: cookieStore.get(CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID)?.value ?? "",
    referralSource: cookieStore.get(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE)?.value ?? ""
  };
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
    redirectWithStatus(CIRCLE_CARD_PRO_INTEREST_PATH, "invalid");
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
            where: { archivedAt: null },
            orderBy: [{ isDefaultCard: "desc" }, { isPrimary: "desc" }, { displayOrder: "asc" }],
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
    redirectWithStatus(CIRCLE_CARD_PRO_INTEREST_PATH, "rate-limited");
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
    try {
      const referralContext = await readCircleCardReferralContext();
      await markCircleCardReferralProductInterest({
        product: "PRO",
        userId: activeUserContext?.id,
        referralCode: referralContext.referralCode,
        referralClickId: referralContext.referralClickId,
        source: referralContext.referralSource || "circle_card_pro_interest"
      });
    } catch (error) {
      logServerWarning("circle-card-pro-referral-interest-mark-failed", {
        error: error instanceof Error ? error.message : "unknown"
      });
    }
  } catch {
    redirectWithStatus(CIRCLE_CARD_PRO_INTEREST_PATH, "failed");
  }

  redirectWithStatus(CIRCLE_CARD_PRO_INTEREST_PATH, "registered");
}

export async function registerCircleCardTeamsInterestAction(formData: FormData) {
  const parsed = teamsInterestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    businessName: formData.get("businessName"),
    teamSize: formData.has("teamSize") ? formData.get("teamSize") : undefined,
    website: formData.has("website") ? formData.get("website") : undefined,
    contactConsent: formData.get("contactConsent"),
    marketingEmailOptIn: formData.has("marketingEmailOptIn")
      ? formData.get("marketingEmailOptIn")
      : undefined
  });

  if (!parsed.success) {
    redirectWithStatus(CIRCLE_CARD_TEAMS_INTEREST_PATH, "invalid");
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
            where: { archivedAt: null },
            orderBy: [{ isDefaultCard: "desc" }, { isPrimary: "desc" }, { displayOrder: "asc" }],
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
    key: `circle-card-teams-interest:${activeUserContext?.id ?? clientIp}:${values.email.toLowerCase()}`,
    limit: 5,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    redirectWithStatus(CIRCLE_CARD_TEAMS_INTEREST_PATH, "rate-limited");
  }

  const marketingEmailOptIn = values.marketingEmailOptIn === "on";
  const teamSize = values.teamSize?.trim() || null;

  try {
    await recordLead({
      userId: activeUserContext?.id ?? undefined,
      name: values.name,
      email: values.email,
      businessName: values.businessName,
      website: values.website,
      source: LeadSource.CIRCLE_CARD_SIGNUP,
      sourceLabel: "Circle Card Teams Interest",
      consentSource: "Circle Card Teams interest form",
      essentialConsent: true,
      marketingEmailOptIn,
      tags: [
        "circle-card",
        "teams-interest",
        "circle-card-teams",
        "early-access",
        primaryCard?.slug ? `card:${primaryCard.slug}` : ""
      ],
      score: teamSize ? 60 : 50,
      notes: [
        "Circle Card Teams interest captured. Tag: teams-interest.",
        teamSize ? `Team size: ${teamSize}.` : ""
      ]
        .filter(Boolean)
        .join(" "),
      metadata: {
        source: CIRCLE_CARD_TEAMS_INTEREST_SOURCE,
        product: "circle-card-teams",
        sourcePath: CIRCLE_CARD_TEAMS_INTEREST_PATH,
        teamSize,
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
        tags: ["teams-interest"]
      } satisfies Prisma.InputJsonObject
    });
    try {
      const referralContext = await readCircleCardReferralContext();
      await markCircleCardReferralProductInterest({
        product: "TEAMS",
        userId: activeUserContext?.id,
        referralCode: referralContext.referralCode,
        referralClickId: referralContext.referralClickId,
        source: referralContext.referralSource || "circle_card_teams_interest"
      });
    } catch (error) {
      logServerWarning("circle-card-teams-referral-interest-mark-failed", {
        error: error instanceof Error ? error.message : "unknown"
      });
    }
  } catch {
    redirectWithStatus(CIRCLE_CARD_TEAMS_INTEREST_PATH, "failed");
  }

  redirectWithStatus(CIRCLE_CARD_TEAMS_INTEREST_PATH, "registered");
}
