import { createHash, randomUUID } from "node:crypto";
import { Prisma, type CircleCardScaleSmithsPartner } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type ScaleSmithsEvent } from "@/lib/circle-card/scalesmiths/contract";

export class ScaleSmithsEventConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaleSmithsEventConflict";
  }
}

type EventResult = "applied" | "duplicate" | "stale";

function isNotAfter(incoming: Date, last: Date | null): boolean {
  return Boolean(last && incoming.getTime() <= last.getTime());
}

function partnerIsLinked(partner: CircleCardScaleSmithsPartner | null) {
  if (!partner || !partner.linkedAt) throw new ScaleSmithsEventConflict(
    "Partner has not completed verified Circle Card account linking"
  );
  return partner;
}

async function provisionPartnerCard(tx: Prisma.TransactionClient, member: CircleCardScaleSmithsPartner, name: string) {
  if (member.partnerCardId) {
    const existing = await tx.circleCard.findFirst({
      where: { id: member.partnerCardId, userId: member.userId, archivedAt: null },
      select: { id: true }
    });
    if (!existing) throw new ScaleSmithsEventConflict("Assigned partner card missing or owned by another user");
    await tx.circleCard.update({
      where: { id: existing.id },
      data: { isPublished: true, showOnPublicProfile: true }
    });
    return existing.id;
  }

  // A fresh, separately owned card. Never clone Trev/Rhys's founder cards.
  const created = await tx.circleCard.create({
    data: {
      userId: member.userId,
      slug: "scalesmiths-" + randomUUID().replace(/-/g, ""),
      cardType: "BUSINESS",
      accountType: "INDIVIDUAL",
      fullName: name,
      businessName: "ScaleSmiths",
      role: "Independent ScaleSmiths Partner",
      tagline: "Forge Your Digital Edge",
      isPublished: true,
      showOnPublicProfile: true,
      showInDiscover: false
    },
    select: { id: true }
  });
  return created.id;
}

async function activatePartner(
  tx: Prisma.TransactionClient,
  member: CircleCardScaleSmithsPartner,
  name: string,
  effectiveAt: Date
) {
  if (member.status === "ENDED") throw new ScaleSmithsEventConflict(
    "Ended partner requires an explicitly authorised fresh onboarding flow"
  );
  const cardId = await provisionPartnerCard(tx, member, name);

  await tx.circleCard.updateMany({
    where: { userId: member.userId, archivedAt: null },
    data: { isDefaultCard: false, isPrimary: false }
  });
  await tx.circleCard.updateMany({
    where: { userId: member.userId, cardType: "PERSONAL", archivedAt: null, id: { not: cardId } },
    data: { showOnPublicProfile: false }
  });
  await tx.circleCard.update({
    where: { id: cardId },
    data: { isDefaultCard: true, isPrimary: true }
  });
  await tx.circleCardScaleSmithsPartner.update({
    where: { id: member.id },
    data: {
      partnerCardId: cardId,
      displayName: name,
      status: "ACTIVE",
      approvedAt: effectiveAt,
      sponsoredProStartsAt: effectiveAt,
      sponsoredProEndsAt: null,
      endedAt: null,
      lastSourceEventAt: effectiveAt
    }
  });
}

async function endPartner(
  tx: Prisma.TransactionClient,
  member: CircleCardScaleSmithsPartner,
  state: "SUSPENDED" | "ENDED",
  effectiveAt: Date
) {
  await tx.circleCardScaleSmithsPartner.update({
    where: { id: member.id },
    data: {
      status: state,
      sponsoredProEndsAt: effectiveAt,
      ...(state === "ENDED" ? { endedAt: effectiveAt } : {}),
      lastSourceEventAt: effectiveAt
    }
  });

  if (member.partnerCardId) {
    await tx.circleCard.updateMany({
      where: { id: member.partnerCardId, userId: member.userId },
      data: {
        isPublished: false,
        isPrimary: false,
        isDefaultCard: false,
        showOnPublicProfile: false,
        showInDiscover: false,
        discoverOptedInAt: null
      }
    });
  }

  // Leave personal cards, paid subscriptions, other grants and Stripe untouched.
  const nextCard = await tx.circleCard.findFirst({
    where: {
      userId: member.userId, archivedAt: null, isPublished: true,
      ...(member.partnerCardId ? { id: { not: member.partnerCardId } } : {})
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true }
  });
  if (nextCard) {
    await tx.circleCard.updateMany({
      where: { userId: member.userId, archivedAt: null },
      data: { isDefaultCard: false, isPrimary: false }
    });
    await tx.circleCard.update({
      where: { id: nextCard.id },
      data: { isDefaultCard: true, isPrimary: true }
    });
  }
}

async function applyEvent(tx: Prisma.TransactionClient, event: ScaleSmithsEvent, occurredAt: Date): Promise<EventResult> {
  const member = partnerIsLinked(
    await tx.circleCardScaleSmithsPartner.findUnique({ where: { externalPartnerId: event.partner_id } })
  );

  if (event.event_type.startsWith("partner.")) {
    if (isNotAfter(occurredAt, member.lastSourceEventAt)) return "stale";
    switch (event.event_type) {
      case "partner.approved":
        await activatePartner(tx, member, event.data.display_name, occurredAt);
        return "applied";
      case "partner.updated":
        await tx.circleCardScaleSmithsPartner.update({
          where: { id: member.id },
          data: { ...(event.data.display_name ? { displayName: event.data.display_name } : {}), lastSourceEventAt: occurredAt }
        });
        return "applied";
      case "partner.suspended":
      case "partner.ended":
        await endPartner(tx, member, event.event_type === "partner.ended" ? "ENDED" : "SUSPENDED", occurredAt);
        return "applied";
    }
  }

  if (event.event_type === "client.acquired" || event.event_type === "client.updated") {
    const data = event.data;
    const existing = await tx.circleCardScaleSmithsPortfolio.findUnique({
      where: {
        externalPartnerId_externalClientId: {
          externalPartnerId: event.partner_id,
          externalClientId: data.client_id
        }
      }
    });
    if (existing && isNotAfter(occurredAt, existing.lastSourceEventAt)) return "stale";
    if (existing) {
      await tx.circleCardScaleSmithsPortfolio.update({
        where: { id: existing.id },
        data: {
          // A public claim must never be altered by an unapproved "client.updated" event.
          ...((existing.publicationStatus === "INTERNAL" && data.business_name)
            ? { businessName: data.business_name }
            : {}),
          lastSourceEventAt: occurredAt
        }
      });
      return "applied";
    }
    if (event.event_type === "client.updated") return "stale";
    await tx.circleCardScaleSmithsPortfolio.create({
      data: {
        externalPartnerId: event.partner_id,
        externalClientId: data.client_id,
        businessName: data.business_name,
        publicationStatus: "INTERNAL",
        lastSourceEventAt: occurredAt
      }
    });
    return "applied";
  }

  if (event.event_type === "portfolio.withdrawn") {
    const prior = await tx.circleCardScaleSmithsPortfolio.findUnique({
      where: {
        externalPartnerId_externalClientId: {
          externalPartnerId: event.partner_id,
          externalClientId: event.data.client_id
        }
      }
    });
    if (prior && isNotAfter(occurredAt, prior.lastSourceEventAt)) return "stale";

    await tx.circleCardScaleSmithsPortfolio.upsert({
      where: {
        externalPartnerId_externalClientId: {
          externalPartnerId: event.partner_id,
          externalClientId: event.data.client_id
        }
      },
      create: {
        externalPartnerId: event.partner_id,
        externalClientId: event.data.client_id,
        businessName: "Withdrawn case study",
        publicationStatus: "WITHDRAWN",
        consentWithdrawnAt: occurredAt,
        lastSourceEventAt: occurredAt
      },
      update: {
        publicationStatus: "WITHDRAWN",
        consentWithdrawnAt: occurredAt,
        lastSourceEventAt: occurredAt,
        publishedAt: null
      }
    });
    return "applied";
  }

  if (event.event_type === "portfolio.approved" || event.event_type === "project.published") {
    if (member.status !== "ACTIVE" || !member.partnerCardId) {
      throw new ScaleSmithsEventConflict("Portfolio cannot publish for an inactive/unassigned partner");
    }
    const data = event.data;
    const current = await tx.circleCardScaleSmithsPortfolio.findUnique({
      where: {
        externalPartnerId_externalClientId: {
          externalPartnerId: event.partner_id,
          externalClientId: data.client_id
        }
      }
    });
    if (current && isNotAfter(occurredAt, current.lastSourceEventAt)) return "stale";
    const consentAt = new Date(data.client_consent_at);
    if (current?.consentWithdrawnAt && consentAt <= current.consentWithdrawnAt) {
      throw new ScaleSmithsEventConflict("Fresh client permission is required after withdrawal");
    }
    const details = {
      businessName: data.business_name,
      summary: data.summary ?? null,
      logoUrl: data.logo_url ?? null,
      websiteUrl: data.website_url ?? null,
      caseStudyUrl: data.case_study_url ?? null,
      publicationStatus: "PUBLISHED" as const,
      clientConsentAt: consentAt,
      founderApprovedAt: new Date(data.founder_approved_at),
      projectDeliveredAt: new Date(data.project_delivered_at),
      consentWithdrawnAt: null,
      lastSourceEventAt: occurredAt,
      publishedAt: occurredAt
    };
    await tx.circleCardScaleSmithsPortfolio.upsert({
      where: {
        externalPartnerId_externalClientId: {
          externalPartnerId: event.partner_id,
          externalClientId: data.client_id
        }
      },
      create: {
        externalPartnerId: event.partner_id, externalClientId: data.client_id, ...details
      },
      update: details
    });
    return "applied";
  }

  // Exhaustiveness: if the schema ever expands, require an explicit handler.
  throw new Error("Unsupported ScaleSmiths event");
}

export async function processVerifiedScaleSmithsEvent(
  event: ScaleSmithsEvent,
  rawBody: string
): Promise<EventResult> {
  if (process.env.CIRCLE_CARD_SCALESMITHS_WEBHOOKS_ENABLED !== "true" ||
      process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") {
    throw new Error("ScaleSmiths integration is disabled");
  }
  const occurredAt = new Date(event.occurred_at);
  const payloadHash = createHash("sha256").update(rawBody, "utf8").digest("hex");

  return prisma.$transaction(async (tx) => {
    // Dedup receipt and domain mutation commit together: retries cannot double-apply.
    const previous = await tx.circleCardScaleSmithsEventReceipt.findUnique({
      where: { eventId: event.event_id }
    });
    if (previous) {
      if (previous.payloadHash !== payloadHash) {
        throw new ScaleSmithsEventConflict("Event ID reused with different content");
      }
      return "duplicate";
    }
    const outcome = await applyEvent(tx, event, occurredAt);
    await tx.circleCardScaleSmithsEventReceipt.create({
      data: {
        eventId: event.event_id,
        eventType: event.event_type,
        partnerId: event.partner_id,
        occurredAt,
        payloadHash
      }
    });
    return outcome;
  }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 });
}
