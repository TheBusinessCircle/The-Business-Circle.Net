import "server-only";

import { createElement } from "react";
import { CircleCardEventType, LeadSource, Prisma } from "@prisma/client";
import { CircleCardActivationReminderEmail } from "@/emails";
import { renderEmailHtml } from "@/emails/render";
import { buildBrandedEmailText } from "@/emails/text";
import {
  calculateCircleCardCompletion,
  type CircleCardCompletionResult
} from "@/lib/circle-card/completion";
import { readCircleCardSocialLinks } from "@/lib/circle-card/schema";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { logServerError, logServerWarning } from "@/lib/security/logging";

type ActivationReminderStageId = "24h" | "7d" | "30d";

const ACTIVATION_REMINDER_STAGES: Array<{
  id: ActivationReminderStageId;
  delayMs: number;
}> = [
  { id: "24h", delayMs: 24 * 60 * 60 * 1000 },
  { id: "7d", delayMs: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", delayMs: 30 * 24 * 60 * 60 * 1000 }
];

const ACTIVATION_SHARE_EVENT_TYPES: CircleCardEventType[] = [
  CircleCardEventType.SHARE,
  CircleCardEventType.CONNECT_HUB_SHARE,
  CircleCardEventType.CONNECT_HUB_COPY_LINK
];

type ActivationCardInput = {
  id: string;
  profileImageUrl: string | null;
  businessName: string | null;
  about: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  socialLinks: Prisma.JsonValue;
  customLinks: Array<{ id: string; isActive: boolean }>;
  user: {
    image?: string | null;
    profile?: {
      bio?: string | null;
      location?: string | null;
      website?: string | null;
      linkedin?: string | null;
      instagram?: string | null;
      facebook?: string | null;
      tiktok?: string | null;
      youtube?: string | null;
      business?: {
        companyName?: string | null;
        website?: string | null;
      } | null;
    } | null;
  };
};

function firstNameFromName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] || "there";
}

function readJsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function readNestedJsonObject(
  parent: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  const value = parent[key];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function leadMetadataWithActivation(
  metadata: Prisma.JsonValue | null | undefined,
  activation: Record<string, unknown>
): Prisma.InputJsonObject {
  const root = readJsonObject(metadata);
  const existingActivation = readNestedJsonObject(root, "circleCardActivation");

  return {
    ...root,
    circleCardActivation: {
      ...existingActivation,
      ...activation
    }
  } as Prisma.InputJsonObject;
}

function countActiveSocialProfiles(card: ActivationCardInput) {
  const cardSocialLinks = readCircleCardSocialLinks(card.socialLinks).links;
  const profileSocialLinks = [
    card.user.profile?.linkedin,
    card.user.profile?.instagram,
    card.user.profile?.facebook,
    card.user.profile?.tiktok,
    card.user.profile?.youtube
  ];

  return (
    cardSocialLinks.filter((link) => link.isActive && link.url.trim()).length +
    profileSocialLinks.filter((url) => Boolean(url?.trim())).length
  );
}

export function calculateCircleCardCompletionForCard(
  card: ActivationCardInput | null | undefined,
  shareCount = 0
) {
  return calculateCircleCardCompletion({
    profileImageUrl: card?.profileImageUrl,
    fallbackProfileImageUrl: card?.user.image,
    bio: card?.about ?? card?.user.profile?.bio,
    location: card?.location ?? card?.user.profile?.location,
    businessName: card?.businessName ?? card?.user.profile?.business?.companyName,
    activeFeaturedLinkCount: card?.customLinks.filter((link) => link.isActive).length ?? 0,
    email: card?.email,
    phone: card?.phone,
    websiteUrl: card?.websiteUrl ?? card?.user.profile?.website ?? card?.user.profile?.business?.website,
    activeSocialProfileCount: card ? countActiveSocialProfiles(card) : 0,
    shareCount
  });
}

export async function syncCircleCardActivationLeadScore(input: {
  userId: string;
  completion: CircleCardCompletionResult;
}) {
  try {
    const lead = await prisma.lead.findFirst({
      where: {
        userId: input.userId,
        source: LeadSource.CIRCLE_CARD_SIGNUP
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        metadata: true,
        tags: true
      }
    });

    if (!lead) {
      return { updated: false as const };
    }

    await prisma.lead.update({
      where: {
        id: lead.id
      },
      data: {
        score: input.completion.activationLeadScore,
        tags: Array.from(
          new Set([
            ...lead.tags,
            "circle-card-activation",
            input.completion.activationComplete ? "activated" : "activation-incomplete"
          ])
        ).slice(0, 24),
        metadata: leadMetadataWithActivation(lead.metadata, {
          completionScore: input.completion.score,
          activationLeadScore: input.completion.activationLeadScore,
          activationComplete: input.completion.activationComplete,
          missingItems: input.completion.missingItems.map((item) => item.label),
          lastScoredAt: new Date().toISOString()
        })
      }
    });

    return { updated: true as const };
  } catch (error) {
    logServerWarning("circle-card-activation-lead-score-sync-failed", {
      error: error instanceof Error ? error.message : "unknown"
    });
    return { updated: false as const };
  }
}

function nextDueReminderStage(
  createdAt: Date,
  metadata: Prisma.JsonValue | null | undefined,
  now: Date
): ActivationReminderStageId | null {
  const root = readJsonObject(metadata);
  const activation = readNestedJsonObject(root, "circleCardActivation");
  const remindersSent = readNestedJsonObject(activation, "remindersSent");
  const ageMs = now.getTime() - createdAt.getTime();

  for (const stage of ACTIVATION_REMINDER_STAGES) {
    if (ageMs >= stage.delayMs && !remindersSent[stage.id]) {
      return stage.id;
    }
  }

  return null;
}

async function sendActivationReminder(input: {
  email: string;
  name: string | null;
  completion: CircleCardCompletionResult;
}) {
  const dashboardUrl = absoluteUrl("/dashboard/circle-card?section=my-card#circle-card-form");
  const firstName = firstNameFromName(input.name);
  const missingItems = input.completion.missingItems.map((item) => item.label);
  const emailTemplate = createElement(CircleCardActivationReminderEmail, {
    firstName,
    dashboardUrl,
    completionScore: input.completion.score,
    missingItems
  });
  const html = await renderEmailHtml(emailTemplate);

  return sendTransactionalEmail({
    to: input.email,
    subject: "Complete your Circle Card",
    text: buildBrandedEmailText({
      greeting: `Hi ${firstName},`,
      eyebrow: "Circle Card setup",
      heading: "Complete your Circle Card",
      bodyLines: [
        `Your Circle Card is ${input.completion.score}% complete.`,
        missingItems.length
          ? `Next setup steps: ${missingItems.slice(0, 4).join(", ")}.`
          : "Your next setup steps are waiting in your dashboard.",
        "This is a setup email for your Circle Card account, not a marketing newsletter."
      ],
      ctaLabel: "Complete Your Circle Card",
      ctaUrl: dashboardUrl,
      fallbackNotice: "If the button does not work, copy and paste the link above into your browser."
    }),
    html,
    react: emailTemplate,
    tags: [
      { name: "type", value: "circle-card-activation-reminder" },
      { name: "source", value: "circle-card" }
    ]
  });
}

export async function sendDueCircleCardActivationReminders(input: { limit?: number } = {}) {
  const now = new Date();
  const oldestDueCreatedAt = new Date(now.getTime() - ACTIVATION_REMINDER_STAGES[0].delayMs);
  const leads = await prisma.lead.findMany({
    where: {
      source: LeadSource.CIRCLE_CARD_SIGNUP,
      essentialConsent: true,
      userId: {
        not: null
      },
      createdAt: {
        lte: oldestDueCreatedAt
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    take: input.limit ?? 75,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      metadata: true,
      tags: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          profile: {
            select: {
              bio: true,
              location: true,
              website: true,
              linkedin: true,
              instagram: true,
              facebook: true,
              tiktok: true,
              youtube: true,
              business: {
                select: {
                  companyName: true,
                  website: true
                }
              }
            }
          },
          circleCards: {
            orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
            take: 1,
            select: {
              id: true,
              profileImageUrl: true,
              businessName: true,
              about: true,
              location: true,
              email: true,
              phone: true,
              websiteUrl: true,
              socialLinks: true,
              customLinks: {
                select: {
                  id: true,
                  isActive: true
                }
              }
            }
          }
        }
      }
    }
  });

  const cardIds = leads
    .map((lead) => lead.user?.circleCards[0]?.id)
    .filter((cardId): cardId is string => Boolean(cardId));
  const shareCounts = await loadShareCounts(cardIds);
  let sent = 0;
  let skipped = 0;
  let completed = 0;

  for (const lead of leads) {
    const stage = nextDueReminderStage(lead.createdAt, lead.metadata, now);
    const card = lead.user?.circleCards[0];

    if (!stage || !lead.user || !card) {
      skipped += 1;
      continue;
    }

    const completion = calculateCircleCardCompletionForCard(
      {
        ...card,
        user: lead.user
      },
      shareCounts.get(card.id) ?? 0
    );

    if (completion.score >= 80) {
      completed += 1;
      await syncCircleCardActivationLeadScore({
        userId: lead.user.id,
        completion
      });
      continue;
    }

    const result = await sendActivationReminder({
      email: lead.user.email || lead.email,
      name: lead.user.name || lead.name,
      completion
    });

    if (result.sent) {
      sent += 1;
      const root = readJsonObject(lead.metadata);
      const activation = readNestedJsonObject(root, "circleCardActivation");
      const remindersSent = readNestedJsonObject(activation, "remindersSent");

      await prisma.lead.update({
        where: {
          id: lead.id
        },
        data: {
          lastEmailedAt: now,
          score: completion.activationLeadScore,
          tags: Array.from(
            new Set([...lead.tags, "circle-card-activation", "activation-reminded"])
          ).slice(0, 24),
          metadata: leadMetadataWithActivation(lead.metadata, {
            completionScore: completion.score,
            activationLeadScore: completion.activationLeadScore,
            activationComplete: completion.activationComplete,
            missingItems: completion.missingItems.map((item) => item.label),
            remindersSent: {
              ...remindersSent,
              [stage]: now.toISOString()
            },
            lastReminderStage: stage,
            lastReminderSentAt: now.toISOString()
          })
        }
      });
    } else {
      skipped += 1;
      if (!result.skipped) {
        logServerWarning("circle-card-activation-reminder-email-failed");
      }
    }
  }

  return {
    checked: leads.length,
    sent,
    skipped,
    completed
  };
}

async function loadShareCounts(cardIds: string[]) {
  if (!cardIds.length) {
    return new Map<string, number>();
  }

  const rows = await prisma.circleCardEvent.groupBy({
    by: ["cardId"],
    where: {
      cardId: {
        in: cardIds
      },
      eventType: {
        in: ACTIVATION_SHARE_EVENT_TYPES
      }
    },
    _count: {
      _all: true
    }
  });

  return new Map(rows.map((row) => [row.cardId, row._count._all]));
}

export async function getCircleCardActivationSnapshot(input: { limit?: number } = {}) {
  try {
    const cards = await prisma.circleCard.findMany({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        slug: true,
        fullName: true,
        businessName: true,
        profileImageUrl: true,
        about: true,
        location: true,
        email: true,
        phone: true,
        websiteUrl: true,
        socialLinks: true,
        customLinks: {
          select: {
            id: true,
            isActive: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                bio: true,
                location: true,
                website: true,
                linkedin: true,
                instagram: true,
                facebook: true,
                tiktok: true,
                youtube: true,
                business: {
                  select: {
                    companyName: true,
                    website: true
                  }
                }
              }
            }
          }
        }
      }
    });
    const shareCounts = await loadShareCounts(cards.map((card) => card.id));
    const rows = cards.map((card) => {
      const completion = calculateCircleCardCompletionForCard(
        card,
        shareCounts.get(card.id) ?? 0
      );

      return {
        card,
        completion
      };
    });
    const totalUsers = new Set(rows.map((row) => row.card.user.id)).size;
    const activatedUsers = new Set(
      rows.filter((row) => row.completion.activationComplete).map((row) => row.card.user.id)
    ).size;
    const averageCompletion = rows.length
      ? Math.round(rows.reduce((total, row) => total + row.completion.score, 0) / rows.length)
      : 0;
    const topIncompleteUsers = rows
      .filter((row) => row.completion.score < 80)
      .sort((left, right) => left.completion.score - right.completion.score)
      .slice(0, input.limit ?? 8)
      .map((row) => ({
        userId: row.card.user.id,
        userName: row.card.user.name,
        ownerEmail: row.card.user.email,
        cardId: row.card.id,
        slug: row.card.slug,
        fullName: row.card.fullName,
        businessName: row.card.businessName,
        completionScore: row.completion.score,
        missingItems: row.completion.missingItems.map((item) => item.label)
      }));

    return {
      totalUsers,
      activatedUsers,
      activationRate: totalUsers ? Math.round((activatedUsers / totalUsers) * 100) : 0,
      averageCompletion,
      topIncompleteUsers
    };
  } catch (error) {
    logServerError("circle-card-activation-snapshot-failed", error);
    return {
      totalUsers: 0,
      activatedUsers: 0,
      activationRate: 0,
      averageCompletion: 0,
      topIncompleteUsers: []
    };
  }
}
