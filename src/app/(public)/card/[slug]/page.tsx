import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  removeCircleWalletContactAction,
  saveCircleWalletContactAction
} from "@/actions/circle-card.actions";
import {
  CircleCardInstallPrompt,
  CircleCardQrPanel,
  CircleCardShareButton,
  CircleCardTrackedLink
} from "@/components/circle-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { SITE_CONFIG } from "@/config/site";
import { getExternalLinkProps } from "@/lib/links";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, cn } from "@/lib/utils";
import { getPublicCircleCard, trackCircleCardEvent } from "@/server/circle-card";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe2,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  UserRound,
  WalletCards
} from "lucide-react";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const NOTICE_MESSAGES: Record<string, string> = {
  "card-saved": "Card saved to your Circle Wallet.",
  "card-already-saved": "This card is already in your Circle Wallet.",
  "card-removed": "Card removed from your Circle Wallet.",
  "own-card": "This is your Circle Card."
};

const ERROR_MESSAGES: Record<string, string> = {
  "missing-card": "That Circle Card could not be saved.",
  "card-not-found": "That Circle Card could not be found."
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function phoneHref(phone: string | null) {
  const normalized = phone?.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

async function incrementViewCount(
  card: Awaited<ReturnType<typeof getPublicCircleCard>>,
  input: {
    visitorId?: string | null;
    userId?: string | null;
    viewerIsOwner?: boolean;
  } = {}
) {
  if (!card) {
    return;
  }

  if (card.isDemo) {
    return;
  }

  await Promise.allSettled([
    prisma.circleCard.update({
      where: { id: card.id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    }),
    trackCircleCardEvent({
      cardId: card.id,
      eventType: "CARD_VIEW",
      visitorId: input.visitorId,
      userId: input.userId,
      metadata: {
        source: "public_card",
        slug: card.slug,
        viewerIsOwner: input.viewerIsOwner ?? false
      }
    })
  ]);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await getPublicCircleCard(slug);

  if (!card) {
    return {
      metadataBase: new URL(SITE_CONFIG.url),
      title: "Circle Card",
      robots: {
        index: false,
        follow: false
      }
    };
  }

  const title = `${card.fullName} | Circle Card`;
  const description =
    card.tagline || card.about?.slice(0, 155) || `${card.fullName}'s Circle Card.`;
  const imageUrl = card.profileImageUrl?.startsWith("http")
    ? card.profileImageUrl
    : absoluteUrl(card.profileImageUrl || "/social-share.png");

  return {
    metadataBase: new URL(SITE_CONFIG.url),
    title,
    description,
    alternates: {
      canonical: `/card/${card.slug}`
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: absoluteUrl(`/card/${card.slug}`),
      images: [{ url: imageUrl }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default async function PublicCircleCardPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const { slug } = await params;
  const paramsValue = await searchParams;
  const notice = firstValue(paramsValue.notice);
  const error = firstValue(paramsValue.error);
  const card = await getPublicCircleCard(slug);

  if (!card) {
    notFound();
  }

  const publicCard = card;
  const viewerUserId = session?.user?.id ?? null;
  const viewerIsOwner = Boolean(viewerUserId && viewerUserId === card.userId);
  const visitorId = (await cookies()).get("bcn_anon_id")?.value ?? null;

  await incrementViewCount(card, {
    visitorId,
    userId: viewerUserId,
    viewerIsOwner
  });

  const savedContact =
    viewerUserId && !viewerIsOwner && !card.isDemo
      ? await prisma.circleWalletContact.findUnique({
          where: {
            userId_cardId: {
              userId: viewerUserId,
              cardId: card.id
            }
          },
          select: {
            id: true,
            favourite: true
          }
        })
      : null;
  const publicUrl = absoluteUrl(`/card/${card.slug}`);
  const telHref = phoneHref(card.phone);
  const analyticsCardId = card.isDemo ? null : card.id;
  const socialLinks = Object.entries(card.socialLinks).filter((entry): entry is [string, string] =>
    Boolean(entry[1])
  );

  function renderWalletAction({ mobileBar = false }: { mobileBar?: boolean } = {}) {
    const iconSize = mobileBar ? 15 : 16;
    const actionClassName = mobileBar
      ? "h-11 w-full min-w-0 flex-col gap-0.5 px-1 text-[11px] leading-none"
      : "w-full gap-2";

    if (viewerIsOwner) {
      return (
        <span
          className={cn(buttonVariants({ variant: "outline" }), actionClassName, "opacity-70")}
        >
          <UserRound size={iconSize} />
          {mobileBar ? "Mine" : "Your Card"}
        </span>
      );
    }

    if (publicCard.isDemo) {
      return (
        <span
          className={cn(buttonVariants({ variant: "outline" }), actionClassName, "opacity-70")}
        >
          <WalletCards size={iconSize} />
          {mobileBar ? "Demo" : "Demo Card"}
        </span>
      );
    }

    if (savedContact) {
      return (
        <form action={removeCircleWalletContactAction} className={mobileBar ? "min-w-0" : undefined}>
          <input type="hidden" name="cardId" value={publicCard.id} />
          <input type="hidden" name="returnPath" value={`/card/${publicCard.slug}`} />
          <Button type="submit" variant="outline" className={actionClassName}>
            <Trash2 size={iconSize} />
            {mobileBar ? "Remove" : "Remove Saved"}
          </Button>
        </form>
      );
    }

    if (session?.user) {
      return (
        <form action={saveCircleWalletContactAction} className={mobileBar ? "min-w-0" : undefined}>
          <input type="hidden" name="cardId" value={publicCard.id} />
          <input type="hidden" name="returnPath" value={`/card/${publicCard.slug}`} />
          <Button type="submit" className={actionClassName}>
            <WalletCards size={iconSize} />
            {mobileBar ? "Wallet" : "Save to Wallet"}
          </Button>
        </form>
      );
    }

    return (
      <Link
        href={`/login?from=${encodeURIComponent(`/card/${publicCard.slug}`)}`}
        className={cn(buttonVariants({ variant: "outline" }), actionClassName)}
      >
        <WalletCards size={iconSize} />
        {mobileBar ? "Wallet" : "Save to Wallet"}
      </Link>
    );
  }

  return (
    <div className="public-page-stack pb-28 lg:pb-0">
      <section className="mx-auto grid max-w-6xl gap-5 py-6 lg:grid-cols-[minmax(0,0.9fr)_340px] lg:py-10">
        <div className="rounded-[2rem] border border-silver/16 bg-card/72 p-5 shadow-panel-soft sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-3xl border border-gold/24 bg-background/36 text-2xl font-semibold text-foreground">
              {card.profileImageUrl ? (
                <img
                  src={card.profileImageUrl}
                  alt={card.fullName}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <span>{initials(card.fullName)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-gold/25 text-gold">
                  Circle Card
                </Badge>
                <MembershipTierBadge tier={card.user.membershipTier} foundationLabel="BCN Member" />
                <Badge variant="outline" className="border-silver/18 text-silver">
                  Founder verification ready
                </Badge>
              </div>
              <h1 className="mt-4 font-display text-4xl leading-tight text-foreground sm:text-5xl">
                {card.fullName}
              </h1>
              {card.role || card.businessName ? (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-base text-silver">
                  <BriefcaseBusiness size={16} />
                  {[card.role, card.businessName].filter(Boolean).join(" at ")}
                </p>
              ) : null}
              {card.tagline ? (
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-foreground">
                  {card.tagline}
                </p>
              ) : null}
              {card.about ? (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{card.about}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted">
                {card.location ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={15} className="text-silver" />
                    {card.location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2">
                  <Sparkles size={15} className="text-silver" />
                  {card.isDemo ? "Demo card" : `${card.viewCount + 1} public views`}
                </span>
              </div>
            </div>
          </div>

          {(notice && NOTICE_MESSAGES[notice]) || (error && ERROR_MESSAGES[error]) ? (
            <div className="mt-5">
              {notice && NOTICE_MESSAGES[notice] ? (
                <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
                  {NOTICE_MESSAGES[notice]}
                </p>
              ) : null}
              {error && ERROR_MESSAGES[error] ? (
                <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {ERROR_MESSAGES[error]}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href={`/card/${card.slug}/vcard`}
              className={cn(buttonVariants(), "w-full gap-2")}
            >
              <Download size={16} />
              Save to Phone
            </a>

            {renderWalletAction()}

            <CircleCardShareButton
              title={`${card.fullName} | Circle Card`}
              publicUrl={publicUrl}
              cardId={analyticsCardId ?? undefined}
            />

            {card.websiteUrl ? (
              <CircleCardTrackedLink
                cardId={analyticsCardId ?? ""}
                eventType="WEBSITE_CLICK"
                metadata={{ source: "public_card" }}
                {...getExternalLinkProps(card.websiteUrl)}
                className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
              >
                <Globe2 size={16} />
                Visit Website
              </CircleCardTrackedLink>
            ) : (
              <span className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2 opacity-50")}>
                <Globe2 size={16} />
                Visit Website
              </span>
            )}

            {card.email ? (
              <CircleCardTrackedLink
                cardId={analyticsCardId ?? ""}
                eventType="EMAIL_CLICK"
                metadata={{ source: "public_card" }}
                href={`mailto:${card.email}`}
                className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
              >
                <Mail size={16} />
                Email
              </CircleCardTrackedLink>
            ) : (
              <span className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2 opacity-50")}>
                <Mail size={16} />
                Email
              </span>
            )}

            {telHref ? (
              <CircleCardTrackedLink
                cardId={analyticsCardId ?? ""}
                eventType="PHONE_CLICK"
                metadata={{ source: "public_card" }}
                href={telHref}
                className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
              >
                <Phone size={16} />
                Call
              </CircleCardTrackedLink>
            ) : (
              <span className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2 opacity-50")}>
                <Phone size={16} />
                Call
              </span>
            )}
          </div>

          {savedContact ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gold/24 bg-gold/10 px-4 py-3 text-sm text-gold">
              <CheckCircle2 size={16} />
              Saved in your Circle Wallet
              {savedContact.favourite ? <span className="text-xs text-gold/80">Favourite</span> : null}
            </div>
          ) : null}

          {!session?.user ? (
            <div className="mt-4 rounded-2xl border border-silver/14 bg-background/20 p-4">
              <p className="text-sm font-medium text-foreground">Save to Circle Wallet</p>
              <p className="mt-2 text-sm text-muted">
                Download the phone contact now, or sign in to save this person into your private
                Circle Wallet with notes, tags and favourites.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/login?from=${encodeURIComponent(`/card/${card.slug}`)}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                >
                  <LogIn size={14} />
                  Sign in
                </Link>
                <Link
                  href="/circle-card"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                >
                  <UserPlus size={14} />
                  Create Circle Card
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-5">
          <div id="qr" className="rounded-[2rem] border border-silver/16 bg-card/62 p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Quick QR</p>
            <p className="mt-2 text-sm text-muted">
              Scan or share this Circle Card without hunting through the page.
            </p>
            <div className="mt-4">
              <CircleCardQrPanel
                publicUrl={publicUrl}
                slug={card.slug}
                analytics={
                  analyticsCardId
                    ? {
                        cardId: analyticsCardId,
                        source: "public_card"
                      }
                    : undefined
                }
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-gold/20 bg-gold/10 p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Trust indicators</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-gold/20 bg-background/20 p-3">
                <ShieldCheck size={17} className="mt-0.5 text-gold" />
                <div>
                  <p className="text-sm font-medium text-foreground">BCN Member</p>
                  <p className="text-xs text-muted">Linked to an existing Business Circle account.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/20 p-3">
                <BadgeCheck size={17} className="mt-0.5 text-silver" />
                <div>
                  <p className="text-sm font-medium text-foreground">Founder verification</p>
                  <p className="text-xs text-muted">Prepared for manual founder verification.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/20 p-3">
                <Star size={17} className="mt-0.5 text-silver" />
                <div>
                  <p className="text-sm font-medium text-foreground">Circle Card badge</p>
                  <p className="text-xs text-muted">Part of The Business Circle relationship layer.</p>
                </div>
              </div>
            </div>
          </div>

          {socialLinks.length ? (
            <div className="rounded-[2rem] border border-silver/16 bg-card/62 p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Social links</p>
              <div className="mt-4 space-y-2">
                {socialLinks.map(([label, href]) => (
                  <a
                    key={label}
                    {...getExternalLinkProps(href)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-silver/14 bg-background/20 px-4 py-3 text-sm capitalize text-foreground transition-colors hover:border-silver/28 hover:bg-background/32"
                  >
                    <span>{label}</span>
                    <ExternalLink size={14} className="text-silver" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-silver/16 bg-card/62 p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-silver/16 bg-background/24 text-silver">
              <UserRound size={18} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Circle Card helps new contacts keep the person, the context, and the route back in
              one place.
            </p>
          </div>
        </aside>
      </section>

      <CircleCardInstallPrompt className="lg:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-silver/14 bg-[#071126]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-panel backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
          <a
            href={`/card/${card.slug}/vcard`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 min-w-0 flex-col gap-0.5 px-1 text-[11px] leading-none"
            )}
          >
            <Download size={15} />
            Phone
          </a>
          <div className="min-w-0">{renderWalletAction({ mobileBar: true })}</div>
          <CircleCardShareButton
            title={`${card.fullName} | Circle Card`}
            publicUrl={publicUrl}
            cardId={analyticsCardId ?? undefined}
            label="Share"
            hideStatus
            className="min-w-0"
            buttonClassName="h-11 min-w-0 flex-col gap-0.5 px-1 text-[11px] leading-none"
          />
        </div>
      </div>
    </div>
  );
}
