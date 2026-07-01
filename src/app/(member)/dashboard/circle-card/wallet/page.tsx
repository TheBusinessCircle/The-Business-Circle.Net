import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { CircleWalletOsClient } from "@/components/circle-card/circle-wallet-os-client";
import type { CircleCardWalletTestimonialContact } from "@/components/circle-card/circle-card-wallet-testimonial-form";
import { CIRCLE_CARD_RECOMMENDATION_CATEGORIES } from "@/lib/circle-card/recommendations";
import {
  CIRCLE_WALLET_CATEGORY_OPTIONS,
  CIRCLE_WALLET_MET_AT_OPTIONS,
  readCircleWalletBusinessCardSocialLinks,
  readCircleWalletTags
} from "@/lib/circle-card/schema";
import {
  buildCircleCardThemeStyle,
  resolveCircleCardTheme
} from "@/lib/circle-card/theme";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { isEligibleCircleCardWalletTestimonialTarget } from "@/lib/circle-card/wallet-testimonials";
import { prisma } from "@/lib/prisma";
import { requireCircleCardUser } from "@/lib/session";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = createCircleCardPageMetadata({
  title: "Circle Wallet",
  description: "Your private Circle Card relationship operating system.",
  path: "/dashboard/circle-card/wallet",
  noIndex: true
});

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type WalletOsTab =
  | "all"
  | "connected"
  | "favourites"
  | "follow-ups"
  | "scanned"
  | "recommended"
  | "recent";

const NOTICE_MESSAGES: Record<string, string> = {
  "card-removed": "Contact removed from your Circle Wallet.",
  "favourite-added": "Contact marked as a favourite.",
  "favourite-removed": "Contact removed from favourites.",
  "relationship-updated": "Relationship details updated.",
  "recommendation-created": "Recommendation saved.",
  "recommendation-updated": "Recommendation updated.",
  "introduction-created": "Introduction sent.",
  "referral-created": "Referral sent.",
  "opportunity-created": "Opportunity created."
};

const ERROR_MESSAGES: Record<string, string> = {
  "wallet-contact-invalid": "Check the relationship details and try again.",
  "wallet-contact-not-found": "That saved contact could not be found.",
  "recommendation-invalid": "Check the recommendation fields and try again.",
  "recommendation-primary-card-required": "Create your own Circle Card before recommending someone.",
  "introduction-invalid": "Check the introduction details and try again.",
  "introduction-wallet-required": "Introductions need two saved published Circle Card contacts.",
  "referral-invalid": "Check the referral fields and try again.",
  "opportunity-invalid": "Check the opportunity fields and try again.",
  "opportunity-primary-card-required": "Create your own Circle Card before tracking opportunities."
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveWalletOsTab(value: string | undefined): WalletOsTab {
  if (value === "connected" || value === "favourites" || value === "recommended" || value === "recent") {
    return value;
  }

  if (value === "follow-ups" || value === "followups" || value === "needs-follow-up") {
    return "follow-ups";
  }

  if (value === "scanned" || value === "scanned-cards") {
    return "scanned";
  }

  return "all";
}

function utcDateNumber(value: Date | string) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getFollowUpStatus(followUpDate: Date | string | null | undefined, todayUtc: number) {
  if (!followUpDate) {
    return null;
  }

  const followUpUtc = utcDateNumber(followUpDate);

  if (followUpUtc < todayUtc) {
    return { label: "Overdue", isDue: true };
  }

  if (followUpUtc === todayUtc) {
    return { label: "Needs Follow-Up", isDue: true };
  }

  return { label: "Upcoming", isDue: false };
}

function walletContactSourceLabel(source: string) {
  if (source === "BUSINESS_CARD_SCAN") {
    return "Scanned";
  }

  if (source === "LINK_IMPORT") {
    return "Link Import";
  }

  if (source === "MANUAL") {
    return "Manual";
  }

  return "Circle Card";
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function serializeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

export default async function CircleWalletPage({ searchParams }: PageProps) {
  const session = await requireCircleCardUser();
  const params = await searchParams;
  const view = resolveWalletOsTab(firstValue(params.view) ?? firstValue(params.walletView));
  const q = (firstValue(params.q) ?? firstValue(params.walletQuery) ?? "").trim();
  const category = (firstValue(params.category) ?? firstValue(params.walletCategory) ?? "").trim();
  const selectedContactId = firstValue(params.contactId);
  const notice = firstValue(params.notice);
  const error = firstValue(params.error);

  const [card, walletContacts, connectionRequests, opportunities, introductions, referrals] =
    await Promise.all([
      prisma.circleCard.findFirst({
        where: { userId: session.user.id, archivedAt: null },
        orderBy: [{ isDefaultCard: "desc" }, { isPrimary: "desc" }, { displayOrder: "asc" }],
        select: {
          id: true,
          slug: true,
          fullName: true,
          businessName: true,
          role: true,
          profileImageUrl: true,
          themePrimaryColor: true,
          themeAccentColor: true,
          themeButtonColor: true,
          themeSurfaceStyle: true,
          themePreset: true,
          themeMetadata: true,
          viewCount: true,
          isPublished: true
        }
      }),
      prisma.circleWalletContact.findMany({
        where: { userId: session.user.id },
        orderBy: [{ savedAt: "desc" }],
        select: {
          id: true,
          cardId: true,
          source: true,
          savedAt: true,
          favourite: true,
          fullName: true,
          businessName: true,
          role: true,
          phone: true,
          mobilePhone: true,
          email: true,
          websiteUrl: true,
          websiteDomain: true,
          address: true,
          socialLinks: true,
          originalCardImageUrl: true,
          notes: true,
          metAt: true,
          followUpDate: true,
          lastInteractionDate: true,
          category: true,
          tags: true,
          relationshipContext: true,
          card: {
            select: {
              id: true,
              userId: true,
              cardType: true,
              slug: true,
              fullName: true,
              businessName: true,
              role: true,
              tagline: true,
              location: true,
              profileImageUrl: true,
              businessLogoUrl: true,
              websiteUrl: true,
              email: true,
              phone: true,
              isPublished: true,
              archivedAt: true,
              user: { select: { suspended: true } }
            }
          },
          walletTestimonials: {
            where: { reviewerUserId: session.user.id, status: "PENDING" },
            select: { id: true }
          },
          recommendations: {
            where: {
              recommenderUserId: session.user.id,
              status: {
                not: "REMOVED"
              }
            },
            orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
            select: {
              id: true,
              category: true,
              reason: true,
              visibility: true,
              status: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      }),
      prisma.circleCardConnectionRequest.findMany({
        where: {
          OR: [{ requesterId: session.user.id }, { recipientId: session.user.id }]
        },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          requesterId: true,
          recipientId: true,
          requesterCardId: true,
          recipientCardId: true,
          status: true,
          respondedAt: true
        }
      }),
      prisma.opportunity.findMany({
        where: { userId: session.user.id },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 200,
        select: {
          id: true,
          walletContactId: true,
          title: true,
          status: true,
          potentialValue: true,
          currency: true,
          sourceType: true,
          nextFollowUpAt: true,
          updatedAt: true
        }
      }),
      prisma.circleCardIntroduction.findMany({
        where: {
          OR: [
            { introducerUserId: session.user.id },
            { personAUserId: session.user.id },
            { personBUserId: session.user.id }
          ]
        },
        orderBy: [{ createdAt: "desc" }],
        take: 120,
        select: {
          id: true,
          status: true,
          reason: true,
          createdAt: true,
          personACardId: true,
          personBCardId: true,
          introducerCardId: true
        }
      }),
      prisma.circleCardReferral.findMany({
        where: {
          OR: [{ referrerUserId: session.user.id }, { recipientUserId: session.user.id }]
        },
        orderBy: [{ createdAt: "desc" }],
        take: 120,
        select: {
          id: true,
          status: true,
          reason: true,
          createdAt: true,
          referrerCardId: true,
          recipientCardId: true,
          referredContactName: true
        }
      })
    ]);

  const theme = resolveCircleCardTheme(card ?? undefined);
  const themeStyle = buildCircleCardThemeStyle(theme) as CSSProperties;
  const todayUtc = utcDateNumber(new Date());
  const acceptedConnections = connectionRequests.filter((request) => request.status === "ACCEPTED");
  const acceptedConnectionCardIds = new Set(
    acceptedConnections.map((request) =>
      request.requesterId === session.user.id ? request.recipientCardId : request.requesterCardId
    )
  );
  const siteBaseUrl = absoluteUrl("/").replace(/\/$/, "");
  const publicUrl = card?.slug ? `${siteBaseUrl}/card/${card.slug}` : null;

  const normalizedContacts = walletContacts.map((contact) => {
    const socialLinks = readCircleWalletBusinessCardSocialLinks(contact.socialLinks);
    const tags = readCircleWalletTags(contact.tags);
    const relationshipContext = metadataRecord(contact.relationshipContext);
    const fullName =
      contact.card?.fullName ??
      contact.fullName ??
      contact.businessName ??
      contact.email ??
      "Saved relationship";
    const display = {
      fullName,
      businessName: contact.card?.businessName ?? contact.businessName,
      role: contact.card?.role ?? contact.role,
      tagline: contact.card?.tagline ?? null,
      location: contact.card?.location ?? null,
      profileImageUrl: contact.card?.profileImageUrl ?? null,
      websiteUrl: contact.card?.websiteUrl ?? contact.websiteUrl,
      email: contact.card?.email ?? contact.email,
      phone: contact.card?.phone ?? contact.mobilePhone ?? contact.phone,
      publicCardHref: contact.card?.slug ? `/card/${contact.card.slug}` : null,
      sourceLabel: walletContactSourceLabel(contact.source),
      isScannedBusinessCard: contact.source === "BUSINESS_CARD_SCAN"
    };
    const followUpStatus = getFollowUpStatus(contact.followUpDate, todayUtc);
    const isMutualConnection = contact.card?.id ? acceptedConnectionCardIds.has(contact.card.id) : false;
    const isSpunConnection = relationshipContext.acquisitionSource === "spin_to_connect";

    return {
      id: contact.id,
      cardId: contact.cardId,
      source: contact.source,
      savedAt: serializeDate(contact.savedAt) ?? new Date().toISOString(),
      favourite: contact.favourite,
      fullName: contact.fullName,
      businessName: contact.businessName,
      role: contact.role,
      phone: contact.phone,
      mobilePhone: contact.mobilePhone,
      email: contact.email,
      websiteUrl: contact.websiteUrl,
      websiteDomain: contact.websiteDomain,
      address: contact.address,
      socialLinks,
      originalCardImageUrl: contact.originalCardImageUrl,
      notes: contact.notes,
      metAt: contact.metAt,
      followUpDate: serializeDate(contact.followUpDate),
      lastInteractionDate: serializeDate(contact.lastInteractionDate),
      category: contact.category,
      tags,
      card: contact.card,
      recommendations: contact.recommendations.map((recommendation) => ({
        id: recommendation.id,
        category: recommendation.category,
        reason: recommendation.reason,
        visibility: recommendation.visibility,
        status: recommendation.status,
        createdAt: serializeDate(recommendation.createdAt) ?? new Date().toISOString(),
        updatedAt: serializeDate(recommendation.updatedAt) ?? new Date().toISOString()
      })),
      display,
      followUpStatus,
      isMutualConnection,
      isSpunConnection
    };
  });

  const walletCategoryOptions = Array.from(
    new Set(
      [
        ...CIRCLE_WALLET_CATEGORY_OPTIONS,
        ...normalizedContacts.map((contact) => contact.category),
        category
      ].filter((item): item is string => Boolean(item?.trim()))
    )
  );
  const walletTestimonialContacts: CircleCardWalletTestimonialContact[] = walletContacts
    .filter((contact) =>
      isEligibleCircleCardWalletTestimonialTarget(contact.card, session.user.id)
    )
    .map((contact) => ({
      walletContactId: contact.id,
      targetCardId: contact.card!.id,
      fullName: contact.card!.fullName,
      businessName: contact.card!.businessName,
      cardType: contact.card!.cardType,
      profileImageUrl: contact.card!.profileImageUrl,
      businessLogoUrl: contact.card!.businessLogoUrl,
      hasPendingTestimonial: contact.walletTestimonials.length > 0
    }));
  const validInitialContactId =
    selectedContactId && normalizedContacts.some((contact) => contact.id === selectedContactId)
      ? selectedContactId
      : null;
  const noticeMessage = notice ? NOTICE_MESSAGES[notice] : null;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <CircleWalletOsClient
      themeStyle={themeStyle}
      themeSurfaceStyle={theme.surfaceStyle.toLowerCase()}
      themePresetLabel={theme.presetLabel}
      card={
        card
          ? {
              id: card.id,
              slug: card.slug,
              fullName: card.fullName,
              isPublished: card.isPublished
            }
          : null
      }
      siteBaseUrl={siteBaseUrl}
      publicUrl={publicUrl}
      contacts={normalizedContacts}
      testimonialContacts={walletTestimonialContacts}
      opportunities={opportunities.map((opportunity) => ({
        id: opportunity.id,
        walletContactId: opportunity.walletContactId,
        title: opportunity.title,
        status: opportunity.status,
        nextFollowUpAt: serializeDate(opportunity.nextFollowUpAt),
        updatedAt: serializeDate(opportunity.updatedAt) ?? new Date().toISOString()
      }))}
      introductions={introductions.map((introduction) => ({
        id: introduction.id,
        status: introduction.status,
        reason: introduction.reason,
        createdAt: serializeDate(introduction.createdAt) ?? new Date().toISOString(),
        personACardId: introduction.personACardId,
        personBCardId: introduction.personBCardId,
        introducerCardId: introduction.introducerCardId
      }))}
      referrals={referrals.map((referral) => ({
        id: referral.id,
        status: referral.status,
        reason: referral.reason,
        createdAt: serializeDate(referral.createdAt) ?? new Date().toISOString(),
        referrerCardId: referral.referrerCardId ?? "",
        recipientCardId: referral.recipientCardId ?? "",
        referredContactName: referral.referredContactName
      }))}
      initialView={view}
      initialQuery={q}
      initialCategory={category}
      initialContactId={validInitialContactId}
      walletCategoryOptions={walletCategoryOptions}
      metAtOptions={[...CIRCLE_WALLET_MET_AT_OPTIONS]}
      recommendationCategories={[...CIRCLE_CARD_RECOMMENDATION_CATEGORIES]}
      noticeMessage={noticeMessage}
      errorMessage={errorMessage}
    />
  );
}
