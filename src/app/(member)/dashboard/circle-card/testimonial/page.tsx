import type { Metadata } from "next";
import { ShieldCheck, Star, WalletCards } from "lucide-react";
import { saveCircleWalletContactAction } from "@/actions/circle-card.actions";
import {
  CircleCardWalletTestimonialForm,
  type CircleCardWalletTestimonialContact
} from "@/components/circle-card/circle-card-wallet-testimonial-form";
import { CircleCardPageHeader } from "@/components/circle-card/circle-card-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import {
  circleCardTestimonialFlowHref,
  isEligibleCircleCardWalletTestimonialTarget
} from "@/lib/circle-card/wallet-testimonials";
import { prisma } from "@/lib/prisma";
import { requireCircleCardUser } from "@/lib/session";
import { filterPublicCircleCardTargetsWithinOwnerPlans } from "@/server/circle-card/plan-policy.service";

export const metadata: Metadata = createCircleCardPageMetadata({
  title: "Leave a Trust Signal",
  description: "Leave trusted feedback for a Circle Card saved in your Wallet.",
  path: "/dashboard/circle-card/testimonial",
  noIndex: true
});

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CircleCardTestimonialPage({ searchParams }: PageProps) {
  const session = await requireCircleCardUser();
  const params = await searchParams;
  const targetCardId = firstValue(params.cardId) ?? "";
  const notice = firstValue(params.notice);

  const [walletContacts, targetCard] = await Promise.all([
    prisma.circleWalletContact.findMany({
      where: { userId: session.user.id },
      orderBy: [{ savedAt: "desc" }],
      select: {
        id: true,
        card: {
          select: {
            id: true,
            userId: true,
            cardType: true,
            fullName: true,
            businessName: true,
            profileImageUrl: true,
            businessLogoUrl: true,
            isPublished: true,
            archivedAt: true,
            user: { select: { suspended: true } }
          }
        },
        walletTestimonials: {
          where: { reviewerUserId: session.user.id, status: "PENDING" },
          select: { id: true }
        }
      }
    }),
    targetCardId
      ? prisma.circleCard.findUnique({
          where: { id: targetCardId },
          select: {
            id: true,
            userId: true,
            cardType: true,
            slug: true,
            fullName: true,
            businessName: true,
            isPublished: true,
            archivedAt: true,
            user: { select: { suspended: true } }
          }
        })
      : Promise.resolve(null)
  ]);

  const planVisibleTargets = await filterPublicCircleCardTargetsWithinOwnerPlans([
    ...walletContacts.flatMap((contact) => (contact.card ? [contact.card] : [])),
    ...(targetCard ? [targetCard] : [])
  ]);
  const planVisibleTargetIds = new Set(planVisibleTargets.map((card) => card.id));

  const contacts: CircleCardWalletTestimonialContact[] = walletContacts
    .filter(
      (contact) =>
        Boolean(contact.card && planVisibleTargetIds.has(contact.card.id)) &&
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
  const selectedContact = contacts.find((contact) => contact.targetCardId === targetCardId) ?? null;
  const isOwnCard = Boolean(targetCard && targetCard.userId === session.user.id);
  const targetIsEligible = Boolean(
    targetCard &&
    planVisibleTargetIds.has(targetCard.id) &&
    isEligibleCircleCardWalletTestimonialTarget(targetCard, session.user.id)
  );
  const targetName = targetIsEligible
    ? targetCard?.fullName ?? selectedContact?.fullName ?? "this Circle Card"
    : "this Circle Card";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,95,0.12),transparent_34%),#030813] px-3 py-5 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Card className="scroll-mt-4 border-gold/35 bg-card/95 shadow-[0_24px_80px_rgba(212,175,95,0.14)] ring-1 ring-gold/10">
          <CircleCardPageHeader
            className="circle-card-page-header-embedded"
            eyebrow="Circle Card trust network"
            icon={<Star size={19} />}
            title={targetCardId ? `Leave a Trust Signal for ${targetName}` : "Leave a Trust Signal"}
            description={targetCardId
              ? "Your trust signal will be sent privately for approval before it appears publicly."
              : "Search your wallet to leave a verified trust signal."}
          />
          <CardContent className="p-4 sm:p-6">
            {notice === "card-saved" || notice === "card-already-saved" ? (
              <p className="mb-4 rounded-xl border border-emerald-400/24 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                Circle Card saved. You can leave your trust signal now.
              </p>
            ) : null}

            {targetCardId && isOwnCard ? (
              <div className="rounded-2xl border border-gold/24 bg-gold/10 p-5">
                <p className="font-semibold text-foreground">You cannot leave a trust signal for your own card.</p>
              </div>
            ) : targetCardId && !targetCard ? (
              <div className="rounded-2xl border border-silver/18 bg-background/24 p-5">
                <p className="font-semibold text-foreground">This Circle Card is no longer available.</p>
              </div>
            ) : targetCardId && !targetIsEligible ? (
              <div className="rounded-2xl border border-silver/18 bg-background/24 p-5">
                <p className="font-semibold text-foreground">This Circle Card cannot receive trust signals.</p>
                <p className="mt-2 text-sm text-muted">Only live Business or Creator Circle Cards can receive Wallet trust signals.</p>
              </div>
            ) : targetCardId && !selectedContact && targetCard ? (
              <div className="rounded-2xl border border-gold/24 bg-gold/10 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={20} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Save this Circle Card to your wallet before leaving a trust signal.
                    </p>
                    <p className="mt-2 text-sm text-muted">This confirms the trust signal comes through a saved Circle Card relationship.</p>
                  </div>
                </div>
                <form action={saveCircleWalletContactAction} className="mt-5">
                  <input type="hidden" name="cardId" value={targetCard.id} />
                  <input type="hidden" name="returnPath" value={circleCardTestimonialFlowHref(targetCard.id)} />
                  <Button type="submit" className="w-full gap-2 sm:w-auto">
                    <WalletCards size={16} />
                    Save to wallet and continue
                  </Button>
                </form>
              </div>
            ) : (
              <CircleCardWalletTestimonialForm
                contacts={contacts}
                initialTargetCardId={selectedContact?.targetCardId ?? ""}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
