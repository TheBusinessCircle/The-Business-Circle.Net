import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { CircleUserRound, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { CircleCardPageHeader } from "@/components/circle-card/circle-card-page-header";
import { CircleStudio } from "@/components/circle-card/circle-studio";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveCircleStudioFineTune, resolveCircleStudioTokens } from "@/lib/circle-card/theme";
import {
  CIRCLE_CARD_CURRENT_CARD_COOKIE,
  normalizeCircleCardCurrentCardId
} from "@/lib/circle-card/current-card-preference";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { loadCircleCardAccessForUser } from "@/server/circle-card";
import {
  canUserStartCircleCardCheckout,
  getCircleCardBillingReadiness
} from "@/lib/circle-card/pricing";
import {
  CIRCLE_CARD_PLAN_ORDER,
  selectCircleCardsWithinPlan
} from "@/lib/circle-card/plan-policy";

export const metadata: Metadata = {
  title: "Circle Studio | Circle Card",
  description: "Build a curated Pro identity for your Circle Card."
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CircleStudioPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?from=/dashboard/circle-card/studio");

  const params = await searchParams;
  const requestedCardId = firstValue(params.card);
  const persistedCardId = normalizeCircleCardCurrentCardId(
    (await cookies()).get(CIRCLE_CARD_CURRENT_CARD_COOKIE)?.value
  );
  const [cards, circleCardAccess] = await Promise.all([prisma.circleCard.findMany({
    where: { userId: session.user.id, archivedAt: null },
    orderBy: [...CIRCLE_CARD_PLAN_ORDER],
    select: {
      id: true,
      slug: true,
      fullName: true,
      businessName: true,
      role: true,
      tagline: true,
      profileImageUrl: true,
      businessLogoUrl: true,
      cardType: true,
      isPublished: true,
      isDefaultCard: true,
      isPrimary: true,
      displayOrder: true,
      createdAt: true,
      themeMetadata: true,
      studioDraftMetadata: true,
      studioDraftUpdatedAt: true,
      studioPreviousActiveMetadata: true
    }
  }), loadCircleCardAccessForUser(session.user.id)]);

  if (!cards.length) redirect("/dashboard/circle-card?section=my-card");
  const liveCards = cards.filter((item) => item.isPublished);
  const requestedCard = cards.find(
    (item) => item.id === requestedCardId && (item.isPublished || !liveCards.length)
  ) ?? null;
  const persistedCard = cards.find(
    (item) => item.id === persistedCardId && item.isPublished
  ) ?? null;
  const defaultLiveCard = liveCards[0] ?? null;
  const card = requestedCard ?? persistedCard ?? defaultLiveCard ?? cards[0];
  const planCardIds = new Set(
    selectCircleCardsWithinPlan(cards, circleCardAccess.limits.circleCards).map((item) => item.id)
  );
  const isPlanLocked = !planCardIds.has(card.id);
  const canActivate = circleCardAccess.capabilities.circleStudio && !isPlanLocked;
  const studioMetadata = card.studioDraftMetadata ?? card.themeMetadata;
  const billingReadiness = getCircleCardBillingReadiness();
  const billingEnabled =
    billingReadiness.billingEnabled &&
    billingReadiness.proLaunchConfigured &&
    canUserStartCircleCardCheckout(session.user.id);
  const authoritativeProConfirmed =
    firstValue(params.billing) === "success" &&
    firstValue(params.plan) === "pro" &&
    circleCardAccess.hasProAccess;

  return (
    <div className="page-shell pb-16 pt-4 sm:pt-6">
      <CircleCardPageHeader
        className="mb-6"
        icon={<Sparkles size={20} />}
        title="Circle Studio"
        badge={<Badge variant="premium">Pro</Badge>}
        description="Not a theme selector. Your professionally designed identity system."
        actions={(liveCards.length ? liveCards : cards).length > 1 ? <nav aria-label="Choose Circle Card" className="flex flex-wrap gap-2">{(liveCards.length ? liveCards : cards).map((item) => <Link key={item.id} href={`/dashboard/circle-card/studio?card=${item.id}`} className={cn(buttonVariants({ variant: item.id === card.id ? "default" : "outline", size: "sm" }), "gap-2")}><CircleUserRound size={14} /> {item.businessName || item.fullName}</Link>)}</nav> : null}
      >
        Make your card unmistakably yours while keeping every choice polished, accessible and recognisably Circle Card.
      </CircleCardPageHeader>

      <CircleStudio
        key={card.id}
        card={card}
        initialTokens={resolveCircleStudioTokens({ themeMetadata: studioMetadata })}
        initialFineTune={resolveCircleStudioFineTune({ themeMetadata: studioMetadata })}
        canActivate={canActivate}
        hasSavedDraft={Boolean(card.studioDraftMetadata)}
        hasPreviousActiveDesign={Boolean(card.studioPreviousActiveMetadata)}
        isPlanLocked={isPlanLocked}
        billingEnabled={billingEnabled}
        authoritativeProConfirmed={authoritativeProConfirmed}
        notice={firstValue(params.notice)}
        error={firstValue(params.error)}
        activatedAt={firstValue(params.activatedAt)}
      />
    </div>
  );
}
