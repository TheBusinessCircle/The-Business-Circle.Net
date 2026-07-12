import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleCardOnboardingFlow } from "@/components/circle-card/circle-card-onboarding-flow";
import { readFirstCircleCardSource } from "@/lib/circle-card/first-card-attribution";
import {
  calculateFirstCircleCardReadiness,
  firstIncompleteCircleCardStep
} from "@/lib/circle-card/first-card-readiness";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { normalizeSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";
import { prisma } from "@/lib/prisma";
import { requireCircleCardUser } from "@/lib/session";
import { loadCircleCardAccessForUser } from "@/server/circle-card";

export const metadata: Metadata = createCircleCardPageMetadata({
  title: "Build My Circle Card",
  description: "Build, preview and publish your first Circle Card.",
  path: "/dashboard/circle-card/onboarding",
  noIndex: true
});

export const dynamic = "force-dynamic";

export default async function CircleCardOnboardingPage() {
  const session = await requireCircleCardUser();
  const [card, member, circleCardAccess] = await Promise.all([
    prisma.circleCard.findFirst({
      where: { userId: session.user.id, archivedAt: null },
      orderBy: [{ isDefaultCard: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        cardType: true,
        fullName: true,
        businessName: true,
        role: true,
        tagline: true,
        profileImageUrl: true,
        businessLogoUrl: true,
        profileImagePositionX: true,
        profileImagePositionY: true,
        profileImageScale: true,
        businessLogoPositionX: true,
        businessLogoPositionY: true,
        businessLogoScale: true,
        email: true,
        phone: true,
        websiteUrl: true,
        socialLinks: true,
        isPublished: true,
        _count: { select: { customLinks: { where: { isActive: true } } } },
        activities: {
          where: { type: "CARD_CREATED" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { metadata: true }
        }
      }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        image: true,
        profile: {
          select: {
            headline: true,
            website: true,
            business: { select: { companyName: true, website: true } }
          }
        }
      }
    }),
    loadCircleCardAccessForUser(session.user.id)
  ]);

  if (card?.isPublished) {
    redirect("/dashboard/circle-card");
  }

  const readiness = calculateFirstCircleCardReadiness(
    card
      ? {
          ...card,
          activeCustomLinkCount: card._count.customLinks
        }
      : null
  );
  const source = readFirstCircleCardSource(card?.activities[0]?.metadata);
  const sourceCard = source.sourceCardSlug
    ? await prisma.circleCard.findFirst({
        where: { slug: source.sourceCardSlug, isPublished: true, archivedAt: null },
        select: { fullName: true }
      })
    : null;

  return (
    <CircleCardOnboardingFlow
      initialStep={firstIncompleteCircleCardStep(readiness)}
      initialReadiness={readiness}
      source={{ ...source, ownerName: sourceCard?.fullName ?? null }}
      entitlement={circleCardAccess.hasProAccess ? "pro" : "free"}
      defaults={{
        cardId: card?.id ?? "",
        slug: card?.slug ?? "",
        cardType: card?.cardType ?? "PERSONAL",
        fullName: card?.fullName ?? member?.name ?? "",
        businessName: card?.businessName ?? member?.profile?.business?.companyName ?? "",
        role: card?.role ?? member?.profile?.headline ?? "",
        tagline: card?.tagline ?? "",
        email: card?.email ?? "",
        phone: card?.phone ?? "",
        websiteUrl:
          card?.websiteUrl ?? member?.profile?.website ?? member?.profile?.business?.website ?? "",
        profileImageUrl:
          normalizeSafeCircleCardImageUrl(card?.profileImageUrl) ??
          normalizeSafeCircleCardImageUrl(member?.image) ??
          "",
        businessLogoUrl: normalizeSafeCircleCardImageUrl(card?.businessLogoUrl) ?? "",
        profileImagePositionX: card?.profileImagePositionX ?? 50,
        profileImagePositionY: card?.profileImagePositionY ?? 50,
        profileImageScale: card?.profileImageScale ?? 1,
        businessLogoPositionX: card?.businessLogoPositionX ?? 50,
        businessLogoPositionY: card?.businessLogoPositionY ?? 50,
        businessLogoScale: card?.businessLogoScale ?? 1
      }}
    />
  );
}
