import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { saveCircleWalletContactAction } from "@/actions/circle-card.actions";
import { CircleCardShareButton } from "@/components/circle-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { SITE_CONFIG } from "@/config/site";
import { getExternalLinkProps } from "@/lib/links";
import { prisma } from "@/lib/prisma";
import { readCircleCardSocialLinks, type CircleCardSocialLinks } from "@/lib/circle-card/schema";
import { absoluteUrl, cn } from "@/lib/utils";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards
} from "lucide-react";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PublicCircleCard = {
  id: string;
  userId: string;
  slug: string;
  fullName: string;
  businessName: string | null;
  role: string | null;
  tagline: string | null;
  about: string | null;
  profileImageUrl: string | null;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  socialLinks: CircleCardSocialLinks;
  viewCount: number;
  isDemo: boolean;
  user: {
    membershipTier: "FOUNDATION" | "INNER_CIRCLE" | "CORE";
    foundingTier: "FOUNDATION" | "INNER_CIRCLE" | "CORE" | null;
  };
};

const DEMO_CARD: PublicCircleCard = {
  id: "demo",
  userId: "demo",
  slug: "demo",
  fullName: "Trev Clarke",
  businessName: "The Business Circle",
  role: "Founder",
  tagline: "Founder-led rooms for better business relationships.",
  about:
    "Circle Card gives professionals a clean identity layer for the people they meet, the details they need to share, and the relationships worth returning to later.",
  profileImageUrl: "/branding/the-business-circle-logo.png",
  websiteUrl: "https://thebusinesscircle.net",
  email: SITE_CONFIG.supportEmail,
  phone: null,
  location: "United Kingdom",
  socialLinks: {
    linkedin: SITE_CONFIG.social.linkedin,
    instagram: SITE_CONFIG.social.instagram,
    facebook: SITE_CONFIG.social.facebook,
    youtube: SITE_CONFIG.social.youtube
  },
  viewCount: 0,
  isDemo: true,
  user: {
    membershipTier: "CORE",
    foundingTier: "CORE"
  }
};

const NOTICE_MESSAGES: Record<string, string> = {
  "card-saved": "Card saved to your Circle Wallet.",
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

async function getPublicCircleCard(slug: string): Promise<PublicCircleCard | null> {
  if (slug === "demo") {
    return DEMO_CARD;
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      slug,
      isPublished: true,
      user: {
        suspended: false
      }
    },
    select: {
      id: true,
      userId: true,
      slug: true,
      fullName: true,
      businessName: true,
      role: true,
      tagline: true,
      about: true,
      profileImageUrl: true,
      websiteUrl: true,
      email: true,
      phone: true,
      location: true,
      socialLinks: true,
      viewCount: true,
      user: {
        select: {
          membershipTier: true,
          foundingTier: true
        }
      }
    }
  });

  if (!card) {
    return null;
  }

  return {
    ...card,
    socialLinks: readCircleCardSocialLinks(card.socialLinks),
    isDemo: false
  };
}

async function incrementViewCount(card: PublicCircleCard) {
  if (card.isDemo) {
    return;
  }

  try {
    await prisma.circleCard.update({
      where: { id: card.id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    });
  } catch {
    // Public card rendering should not fail because analytics could not be recorded.
  }
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

  await incrementViewCount(card);

  const publicUrl = absoluteUrl(`/card/${card.slug}`);
  const telHref = phoneHref(card.phone);
  const socialLinks = Object.entries(card.socialLinks).filter((entry): entry is [string, string] =>
    Boolean(entry[1])
  );

  return (
    <div className="public-page-stack">
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

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {session?.user && !card.isDemo ? (
              <form action={saveCircleWalletContactAction}>
                <input type="hidden" name="cardId" value={card.id} />
                <input type="hidden" name="returnPath" value={`/card/${card.slug}`} />
                <Button type="submit" className="w-full gap-2">
                  <WalletCards size={16} />
                  Save Contact
                </Button>
              </form>
            ) : (
              <Link
                href={`/login?from=${encodeURIComponent(`/card/${card.slug}`)}`}
                className={cn(buttonVariants(), "w-full gap-2")}
              >
                <WalletCards size={16} />
                Save Contact
              </Link>
            )}

            <CircleCardShareButton title={`${card.fullName} | Circle Card`} publicUrl={publicUrl} />

            {card.websiteUrl ? (
              <a
                {...getExternalLinkProps(card.websiteUrl)}
                className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
              >
                <Globe2 size={16} />
                Visit Website
              </a>
            ) : (
              <span className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2 opacity-50")}>
                <Globe2 size={16} />
                Visit Website
              </span>
            )}

            {card.email ? (
              <a
                href={`mailto:${card.email}`}
                className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
              >
                <Mail size={16} />
                Email
              </a>
            ) : (
              <span className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2 opacity-50")}>
                <Mail size={16} />
                Email
              </span>
            )}

            {telHref ? (
              <a href={telHref} className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}>
                <Phone size={16} />
                Call
              </a>
            ) : (
              <span className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2 opacity-50")}>
                <Phone size={16} />
                Call
              </span>
            )}
          </div>
        </div>

        <aside className="space-y-5">
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
    </div>
  );
}
