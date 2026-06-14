import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  ContactRound,
  Handshake,
  Link as LinkIcon,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  Trash2,
  UserCheck,
  Users,
  WalletCards
} from "lucide-react";
import {
  createCircleCardIntroductionAction,
  createCircleCardOpportunityAction,
  createCircleCardReferralAction,
  removeCircleWalletContactAction,
  toggleCircleWalletFavouriteAction,
  updateCircleWalletContactDetailsAction,
  upsertCircleCardRecommendationAction
} from "@/actions/circle-card.actions";
import {
  CircleCardFramedImage,
  CircleCardShareButton
} from "@/components/circle-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  circleCardOpportunityStatusLabel,
  isCircleCardOpportunityOpenStatus
} from "@/lib/circle-card/opportunities";
import {
  CIRCLE_CARD_RECOMMENDATION_CATEGORIES,
  circleCardRecommendationVisibilityLabel
} from "@/lib/circle-card/recommendations";
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
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { requireCircleCardUser } from "@/lib/session";
import { absoluteUrl, cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: "Circle Wallet",
  description: "Your private Circle Card relationship operating system.",
  path: "/dashboard/circle-card/wallet",
  noIndex: true
});

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const WALLET_OS_TABS = [
  { value: "all", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "favourites", label: "Favourites" },
  { value: "follow-ups", label: "Follow-Ups" },
  { value: "scanned", label: "Scanned Cards" },
  { value: "recommended", label: "Recommended" },
  { value: "recent", label: "Recent" }
] as const;

type WalletOsTab = (typeof WALLET_OS_TABS)[number]["value"];

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

function buildWalletOsHref(input: {
  view?: WalletOsTab;
  q?: string;
  category?: string;
  contactId?: string | null;
}) {
  const params = new URLSearchParams();

  if (input.view && input.view !== "all") {
    params.set("view", input.view);
  }

  if (input.q) {
    params.set("q", input.q);
  }

  if (input.category) {
    params.set("category", input.category);
  }

  if (input.contactId) {
    params.set("contactId", input.contactId);
  }

  const query = params.toString();
  return query ? `/dashboard/circle-card/wallet?${query}` : "/dashboard/circle-card/wallet";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatRelationshipDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium"
  }).format(new Date(value));
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
    return "Imported";
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

function walletContactMatchesQuery(input: {
  query: string;
  values: Array<string | null | undefined>;
}) {
  if (!input.query) {
    return true;
  }

  return input.values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(input.query.toLowerCase());
}

function WalletAvatar({
  name,
  src,
  className
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-media-bg)] font-semibold text-foreground shadow-[0_0_34px_hsl(var(--cc-theme-primary-hsl)/0.18)]",
        className
      )}
    >
      {src ? (
        <CircleCardFramedImage src={src} alt={name}>
          <span>{initials(name)}</span>
        </CircleCardFramedImage>
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}

function ThemeBadge({
  children,
  tone = "soft"
}: {
  children: ReactNode;
  tone?: "soft" | "strong" | "success" | "warning";
}) {
  const className =
    tone === "strong"
      ? "border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] text-[var(--cc-theme-button-text)]"
      : tone === "success"
        ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-100"
        : tone === "warning"
          ? "border-amber-300/42 bg-amber-300/12 text-amber-100"
          : "border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] text-silver";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number;
  icon: typeof WalletCards;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-4 shadow-[var(--cc-theme-secondary-shadow)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-silver">{label}</span>
        <Icon size={17} className="text-gold" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
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
        where: { userId: session.user.id },
        orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
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
              isPublished: true
            }
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
      ...contact,
      socialLinks,
      tags,
      relationshipContext,
      display,
      followUpStatus,
      isMutualConnection,
      isSpunConnection
    };
  });

  const connectedContacts = normalizedContacts.filter((contact) => Boolean(contact.cardId));
  const favouriteContacts = normalizedContacts.filter((contact) => contact.favourite);
  const followUpContacts = normalizedContacts.filter((contact) => Boolean(contact.followUpDate));
  const scannedContacts = normalizedContacts.filter((contact) => contact.source === "BUSINESS_CARD_SCAN");
  const recommendedContacts = normalizedContacts.filter((contact) => contact.recommendations.length > 0);
  const recentlyAddedContacts = normalizedContacts.filter((contact) => {
    const ageMs = Date.now() - new Date(contact.savedAt).getTime();
    return ageMs <= 14 * 24 * 60 * 60 * 1000;
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
  const searchedContacts = normalizedContacts.filter((contact) =>
    walletContactMatchesQuery({
      query: q,
      values: [
        contact.display.fullName,
        contact.display.businessName,
        contact.display.role,
        contact.notes,
        contact.metAt,
        contact.category,
        ...contact.tags
      ]
    })
  );
  const categoryFilteredContacts = searchedContacts.filter((contact) =>
    category ? contact.category?.toLowerCase() === category.toLowerCase() : true
  );
  const tabFilteredContacts = categoryFilteredContacts.filter((contact) => {
    if (view === "connected") {
      return Boolean(contact.cardId);
    }

    if (view === "favourites") {
      return contact.favourite;
    }

    if (view === "follow-ups") {
      return Boolean(contact.followUpDate);
    }

    if (view === "scanned") {
      return contact.source === "BUSINESS_CARD_SCAN";
    }

    if (view === "recommended") {
      return contact.recommendations.length > 0;
    }

    return true;
  });
  const visibleContacts = view === "recent" ? tabFilteredContacts.slice(0, 12) : tabFilteredContacts;
  const selectedContact =
    normalizedContacts.find((contact) => contact.id === selectedContactId) ??
    visibleContacts[0] ??
    normalizedContacts[0] ??
    null;
  const walletReturnPath = buildWalletOsHref({
    view,
    q,
    category,
    contactId: selectedContact?.id ?? null
  });
  const selectedRecommendation =
    selectedContact?.recommendations.find((recommendation) => recommendation.status === "ACTIVE") ??
    selectedContact?.recommendations[0] ??
    null;
  const selectedRecommendationCategory =
    selectedRecommendation?.category &&
    CIRCLE_CARD_RECOMMENDATION_CATEGORIES.includes(
      selectedRecommendation.category as (typeof CIRCLE_CARD_RECOMMENDATION_CATEGORIES)[number]
    )
      ? selectedRecommendation.category
      : "Other";
  const selectedOpportunities = selectedContact
    ? opportunities.filter((opportunity) => opportunity.walletContactId === selectedContact.id)
    : [];
  const selectedCardId = selectedContact?.card?.id ?? null;
  const selectedIntroductions = selectedCardId
    ? introductions.filter(
        (introduction) =>
          introduction.personACardId === selectedCardId ||
          introduction.personBCardId === selectedCardId ||
          introduction.introducerCardId === selectedCardId
      )
    : [];
  const selectedReferrals = selectedCardId
    ? referrals.filter(
        (referral) =>
          referral.referrerCardId === selectedCardId || referral.recipientCardId === selectedCardId
      )
    : [];
  const introducibleContacts = normalizedContacts.filter(
    (contact) => contact.id !== selectedContact?.id && contact.card?.id && contact.card.isPublished
  );
  const publicUrl = card?.slug ? absoluteUrl(`/card/${card.slug}`) : null;
  const tabCounts: Record<WalletOsTab, number> = {
    all: normalizedContacts.length,
    connected: connectedContacts.length,
    favourites: favouriteContacts.length,
    "follow-ups": followUpContacts.length,
    scanned: scannedContacts.length,
    recommended: recommendedContacts.length,
    recent: Math.min(normalizedContacts.length, 12)
  };
  const noticeMessage = notice ? NOTICE_MESSAGES[notice] : null;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;
  const primaryActionClassName =
    "rounded-2xl border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] text-[var(--cc-theme-button-text)] shadow-[var(--cc-theme-button-shadow)] hover:brightness-110";
  const secondaryActionClassName =
    "rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] text-foreground shadow-[var(--cc-theme-secondary-shadow)] hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)]";

  return (
    <div
      className="circle-card-public-theme relative min-h-screen overflow-hidden pb-10"
      style={themeStyle}
      data-circle-card-surface={theme.surfaceStyle.toLowerCase()}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[image:var(--cc-theme-page-bg)]"
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[image:var(--cc-theme-hero-bg)] p-5 shadow-[var(--cc-theme-hero-shadow)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ThemeBadge tone="strong">
                  <WalletCards size={13} />
                  Circle Wallet
                </ThemeBadge>
                {theme.presetLabel ? <ThemeBadge>{theme.presetLabel}</ThemeBadge> : null}
                <ThemeBadge>{theme.surfaceStyle.toLowerCase()}</ThemeBadge>
              </div>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                Circle Wallet
              </h1>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-silver">
                Your people. Your relationships. Your Circle.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/circle-card" className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "gap-2")}>
                <ContactRound size={16} />
                My Card
              </Link>
              {card?.isPublished && publicUrl ? (
                <CircleCardShareButton
                  title={`${card.fullName} | Circle Card`}
                  publicUrl={publicUrl}
                  cardId={card.id}
                  analyticsSource="wallet_os"
                  label="Share Card"
                  hideStatus
                  buttonClassName={cn(secondaryActionClassName, "gap-2")}
                />
              ) : null}
              <Link href="/dashboard/circle-card?section=network#connect-hub" className={cn(buttonVariants(), primaryActionClassName, "gap-2")}>
                <Sparkles size={16} />
                Add Relationship
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total Saved" value={normalizedContacts.length} icon={WalletCards} />
            <StatCard label="Connected" value={connectedContacts.length} icon={UserCheck} />
            <StatCard label="Favourites" value={favouriteContacts.length} icon={Star} />
            <StatCard label="Follow-Ups" value={followUpContacts.length} icon={CalendarDays} />
            <StatCard label="Recently Added" value={recentlyAddedContacts.length} icon={Clock3} />
          </div>
        </header>

        {noticeMessage || errorMessage ? (
          <div className="mt-4 space-y-2">
            {noticeMessage ? (
              <p className="rounded-2xl border border-[color:var(--cc-theme-button-border)] bg-gold/10 px-4 py-3 text-sm text-gold">
                {noticeMessage}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </div>
        ) : null}

        <main className="mt-5 grid gap-5 xl:grid-cols-[minmax(320px,440px)_minmax(0,1fr)] xl:items-start">
          <section className="rounded-[1.5rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-4 shadow-[var(--cc-theme-secondary-shadow)] backdrop-blur">
            <form action="/dashboard/circle-card/wallet" className="grid gap-3">
              <input type="hidden" name="view" value={view} />
              <div className="relative">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search people, notes, tags, where met..."
                  className="h-12 rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/28 pl-10"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Select
                  name="category"
                  defaultValue={category}
                  aria-label="Wallet category"
                  className="h-12 rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/28"
                >
                  <option value="">All categories</option>
                  {walletCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Button type="submit" className={cn(primaryActionClassName, "h-12 gap-2")}>
                  <Search size={16} />
                  Search
                </Button>
              </div>
            </form>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {WALLET_OS_TABS.map((tab) => {
                const selected = view === tab.value;

                return (
                  <Link
                    key={tab.value}
                    href={buildWalletOsHref({ view: tab.value, q, category })}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition",
                      selected
                        ? "border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] text-[var(--cc-theme-button-text)] shadow-[var(--cc-theme-button-shadow)]"
                        : "border-[color:var(--cc-theme-secondary-border)] bg-background/20 text-silver hover:border-[color:var(--cc-theme-button-border)] hover:text-foreground"
                    )}
                  >
                    {tab.label}
                    <span className="rounded-full bg-background/22 px-1.5 py-0.5 text-[10px]">
                      {tabCounts[tab.value]}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3">
              {visibleContacts.length ? (
                visibleContacts.map((contact) => {
                  const selected = selectedContact?.id === contact.id;

                  return (
                    <Link
                      key={contact.id}
                      href={buildWalletOsHref({ view, q, category, contactId: contact.id })}
                      className={cn(
                        "group rounded-[1.25rem] border p-3 transition hover:-translate-y-0.5",
                        selected
                          ? "border-[color:var(--cc-theme-button-border)] bg-gold/10 shadow-[var(--cc-theme-button-shadow)]"
                          : "border-[color:var(--cc-theme-secondary-border)] bg-background/18 hover:border-[color:var(--cc-theme-button-border)]"
                      )}
                    >
                      <div className="flex gap-3">
                        <WalletAvatar
                          name={contact.display.fullName}
                          src={contact.display.profileImageUrl}
                          className="h-14 w-14 text-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {contact.display.fullName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-silver">
                                {[contact.display.role, contact.display.businessName].filter(Boolean).join(" at ") ||
                                  contact.display.sourceLabel}
                              </p>
                            </div>
                            {contact.favourite ? <Star size={15} className="shrink-0 fill-gold text-gold" /> : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {contact.isSpunConnection ? (
                              <ThemeBadge tone="strong">
                                <Sparkles size={11} />
                                Spun CC
                              </ThemeBadge>
                            ) : null}
                            {contact.cardId ? <ThemeBadge>In Circle</ThemeBadge> : null}
                            {contact.isMutualConnection ? (
                              <ThemeBadge tone="success">
                                <CheckCircle2 size={11} />
                                Mutual
                              </ThemeBadge>
                            ) : null}
                            {contact.followUpStatus ? (
                              <ThemeBadge tone={contact.followUpStatus.isDue ? "warning" : "soft"}>
                                <CalendarDays size={11} />
                                {contact.followUpStatus.label}
                              </ThemeBadge>
                            ) : null}
                            {contact.category ? <ThemeBadge>{contact.category}</ThemeBadge> : null}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-6 text-center">
                  <p className="font-display text-2xl text-foreground">
                    Your Circle starts with one connection.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Spin a Circle Card. Scan a business card. Build your network.
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <Link href="/dashboard/circle-card?section=network#discover" className={cn(buttonVariants(), primaryActionClassName, "gap-2")}>
                      <Sparkles size={16} />
                      Spin A Card
                    </Link>
                    <Link href="/dashboard/circle-card?section=network#business-card-scanner" className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "gap-2")}>
                      <Camera size={16} />
                      Scan A Card
                    </Link>
                    <Link href="/dashboard/circle-card?section=network#connect-hub" className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "gap-2")}>
                      <LinkIcon size={16} />
                      Enter Card Link
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[linear-gradient(145deg,hsl(var(--card)/0.9),rgba(4,10,24,0.94))] p-4 shadow-[var(--cc-theme-hero-shadow)] backdrop-blur sm:p-5">
            {selectedContact ? (
              <div className="space-y-5">
                <div className="relative overflow-hidden rounded-[1.5rem] border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-media-bg)] p-5">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <WalletAvatar
                        name={selectedContact.display.fullName}
                        src={selectedContact.display.profileImageUrl}
                        className="h-20 w-20 text-xl"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <ThemeBadge tone="strong">{selectedContact.display.sourceLabel}</ThemeBadge>
                          {selectedContact.isSpunConnection ? (
                            <ThemeBadge tone="strong">
                              <Sparkles size={12} />
                              Spun CC
                            </ThemeBadge>
                          ) : null}
                          {selectedContact.isMutualConnection ? (
                            <ThemeBadge tone="success">
                              <ShieldCheck size={12} />
                              Mutual connection
                            </ThemeBadge>
                          ) : null}
                        </div>
                        <h2 className="mt-3 font-display text-3xl font-semibold text-foreground sm:text-4xl">
                          {selectedContact.display.fullName}
                        </h2>
                        <p className="mt-1 text-sm text-silver">
                          {[selectedContact.display.role, selectedContact.display.businessName].filter(Boolean).join(" at ") ||
                            "Relationship profile"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedContact.display.publicCardHref ? (
                        <Link
                          href={selectedContact.display.publicCardHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "gap-2")}
                        >
                          Open Card
                          <ArrowUpRight size={16} />
                        </Link>
                      ) : null}
                      {selectedContact.display.publicCardHref ? (
                        <CircleCardShareButton
                          title={`${selectedContact.display.fullName} | Circle Card`}
                          publicUrl={absoluteUrl(selectedContact.display.publicCardHref)}
                          cardId={selectedContact.card?.id}
                          analyticsSource="wallet_os"
                          label="Share"
                          hideStatus
                          buttonClassName={cn(secondaryActionClassName, "gap-2")}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                {selectedContact.isSpunConnection ? (
                  <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-button-border)] bg-gold/10 p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
                      <Sparkles size={16} />
                      {normalizedContacts.length === 1 ? "Your Circle Has Begun" : "Spin To Connect relationship"}
                    </p>
                    <p className="mt-2 text-sm text-silver">
                      Relationship timestamp: {formatRelationshipDate(selectedContact.savedAt)}
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-silver">Saved</p>
                          <p className="mt-1 text-sm text-foreground">{formatDate(selectedContact.savedAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-silver">Last interaction</p>
                          <p className="mt-1 text-sm text-foreground">
                            {selectedContact.lastInteractionDate
                              ? formatRelationshipDate(selectedContact.lastInteractionDate)
                              : "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-silver">Where met</p>
                          <p className="mt-1 text-sm text-foreground">{selectedContact.metAt || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-silver">Follow-up</p>
                          <p className="mt-1 text-sm text-foreground">
                            {selectedContact.followUpDate
                              ? formatRelationshipDate(selectedContact.followUpDate)
                              : "No follow-up"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <form
                      action={updateCircleWalletContactDetailsAction}
                      className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4"
                    >
                      <input type="hidden" name="walletContactId" value={selectedContact.id} />
                      <input type="hidden" name="returnPath" value={walletReturnPath} />
                      <div className="flex items-center gap-2">
                        <StickyNote size={16} className="text-gold" />
                        <h3 className="font-display text-xl text-foreground">Relationship Notes</h3>
                      </div>
                      <div className="mt-4 grid gap-4">
                        <Textarea
                          name="notes"
                          defaultValue={selectedContact.notes ?? ""}
                          rows={5}
                          placeholder="Private notes, context, next step..."
                          className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="wallet-met-at">Where met</Label>
                            <Input
                              id="wallet-met-at"
                              name="metAt"
                              list="wallet-met-at-options"
                              defaultValue={selectedContact.metAt ?? ""}
                              className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                            />
                            <datalist id="wallet-met-at-options">
                              {CIRCLE_WALLET_MET_AT_OPTIONS.map((option) => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wallet-category">Category</Label>
                            <Input
                              id="wallet-category"
                              name="category"
                              list="wallet-category-options"
                              defaultValue={selectedContact.category ?? ""}
                              className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                            />
                            <datalist id="wallet-category-options">
                              {walletCategoryOptions.map((option) => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wallet-follow-up">Follow-up date</Label>
                            <Input
                              id="wallet-follow-up"
                              type="date"
                              name="followUpDate"
                              defaultValue={toDateInputValue(selectedContact.followUpDate)}
                              className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wallet-last-interaction">Last interaction</Label>
                            <Input
                              id="wallet-last-interaction"
                              type="date"
                              name="lastInteractionDate"
                              defaultValue={toDateInputValue(selectedContact.lastInteractionDate)}
                              className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wallet-tags">Tags</Label>
                          <Input
                            id="wallet-tags"
                            name="tagsInput"
                            defaultValue={selectedContact.tags.join(", ")}
                            placeholder="mentor, client, local, podcast..."
                            className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                          />
                        </div>
                        <Button type="submit" className={cn(primaryActionClassName, "gap-2")}>
                          <StickyNote size={16} />
                          Save Relationship
                        </Button>
                      </div>
                    </form>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <form action={upsertCircleCardRecommendationAction} className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                        <input type="hidden" name="recommendationId" value={selectedRecommendation?.id ?? ""} />
                        <input type="hidden" name="walletContactId" value={selectedContact.id} />
                        <input type="hidden" name="returnPath" value={walletReturnPath} />
                        <h3 className="inline-flex items-center gap-2 font-display text-xl text-foreground">
                          <UserCheck size={16} className="text-gold" />
                          Recommend
                        </h3>
                        <div className="mt-4 grid gap-3">
                          <Select name="category" defaultValue={selectedRecommendationCategory} className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26">
                            {CIRCLE_CARD_RECOMMENDATION_CATEGORIES.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </Select>
                          <Select name="visibility" defaultValue={selectedRecommendation?.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE"} className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26">
                            <option value="PRIVATE">Private note only</option>
                            <option value="PUBLIC" disabled={!selectedContact.card?.id}>
                              Public recommendation
                            </option>
                          </Select>
                          <Textarea
                            name="reason"
                            rows={3}
                            defaultValue={selectedRecommendation?.reason ?? ""}
                            placeholder="Why would you recommend them?"
                            className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                          />
                          <Button type="submit" className={cn(primaryActionClassName, "gap-2")}>
                            <UserCheck size={16} />
                            Save Recommendation
                          </Button>
                        </div>
                      </form>

                      <form action={createCircleCardOpportunityAction} className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                        <input type="hidden" name="walletContactId" value={selectedContact.id} />
                        <input type="hidden" name="status" value="LEAD" />
                        <input type="hidden" name="currency" value="GBP" />
                        <input type="hidden" name="sourceType" value="CONNECTION" />
                        <input type="hidden" name="returnPath" value={walletReturnPath} />
                        <h3 className="inline-flex items-center gap-2 font-display text-xl text-foreground">
                          <Handshake size={16} className="text-gold" />
                          Create Opportunity
                        </h3>
                        <div className="mt-4 grid gap-3">
                          <Input
                            name="title"
                            defaultValue={`Opportunity with ${selectedContact.display.fullName}`}
                            className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                          />
                          <Input
                            name="nextFollowUpAt"
                            type="date"
                            className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                          />
                          <Textarea
                            name="notes"
                            rows={3}
                            placeholder="Opportunity notes..."
                            className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                          />
                          <Button type="submit" className={cn(primaryActionClassName, "gap-2")}>
                            <Handshake size={16} />
                            Create Opportunity
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                      <h3 className="font-display text-xl text-foreground">Quick Actions</h3>
                      <div className="mt-4 grid gap-2">
                        <form action={toggleCircleWalletFavouriteAction}>
                          <input type="hidden" name="walletContactId" value={selectedContact.id} />
                          <input type="hidden" name="returnPath" value={walletReturnPath} />
                          <Button type="submit" variant="outline" className={cn(secondaryActionClassName, "w-full justify-start gap-2")}>
                            <Star size={16} className={selectedContact.favourite ? "fill-gold text-gold" : undefined} />
                            {selectedContact.favourite ? "Remove Favourite" : "Favourite"}
                          </Button>
                        </form>
                        <Link href="#wallet-follow-up" className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "justify-start gap-2")}>
                          <CalendarDays size={16} />
                          Set Follow-Up
                        </Link>
                        <Link href="/dashboard/circle-card?section=network#introductions" className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "justify-start gap-2")}>
                          <Users size={16} />
                          Introduce
                        </Link>
                        <Link href="/dashboard/circle-card?section=business#referrals" className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "justify-start gap-2")}>
                          <Send size={16} />
                          Refer
                        </Link>
                        <form action={removeCircleWalletContactAction}>
                          <input type="hidden" name="walletContactId" value={selectedContact.id} />
                          <input type="hidden" name="returnPath" value="/dashboard/circle-card/wallet" />
                          <Button type="submit" variant="outline" className="w-full justify-start gap-2 rounded-2xl border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15">
                            <Trash2 size={16} />
                            Remove
                          </Button>
                        </form>
                      </div>
                    </div>

                    <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                      <h3 className="font-display text-xl text-foreground">Relationship Context</h3>
                      <div className="mt-4 grid gap-2 text-sm">
                        <p className="flex items-center justify-between gap-3 text-silver">
                          <span>Recommendations</span>
                          <span className="font-semibold text-foreground">{selectedContact.recommendations.length}</span>
                        </p>
                        <p className="flex items-center justify-between gap-3 text-silver">
                          <span>Introductions</span>
                          <span className="font-semibold text-foreground">{selectedIntroductions.length}</span>
                        </p>
                        <p className="flex items-center justify-between gap-3 text-silver">
                          <span>Referrals</span>
                          <span className="font-semibold text-foreground">{selectedReferrals.length}</span>
                        </p>
                        <p className="flex items-center justify-between gap-3 text-silver">
                          <span>Opportunities</span>
                          <span className="font-semibold text-foreground">{selectedOpportunities.length}</span>
                        </p>
                      </div>
                    </div>

                    {selectedContact.tags.length ? (
                      <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                        <h3 className="inline-flex items-center gap-2 font-display text-xl text-foreground">
                          <Tag size={16} className="text-gold" />
                          Tags
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedContact.tags.map((tag) => (
                            <ThemeBadge key={tag}>{tag}</ThemeBadge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </aside>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                    <h3 className="font-display text-xl text-foreground">Recommendations</h3>
                    <div className="mt-3 space-y-2 text-sm text-silver">
                      {selectedContact.recommendations.length ? (
                        selectedContact.recommendations.slice(0, 3).map((recommendation) => (
                          <p key={recommendation.id} className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3">
                            <span className="block font-semibold text-foreground">{recommendation.category}</span>
                            <span>{circleCardRecommendationVisibilityLabel(recommendation.visibility)}</span>
                          </p>
                        ))
                      ) : (
                        <p>No recommendations yet.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                    <h3 className="font-display text-xl text-foreground">Introductions & Referrals</h3>
                    <div className="mt-3 space-y-2 text-sm text-silver">
                      {selectedIntroductions.slice(0, 2).map((introduction) => (
                        <p key={introduction.id} className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3">
                          Introduction: <span className="font-semibold text-foreground">{introduction.status}</span>
                        </p>
                      ))}
                      {selectedReferrals.slice(0, 2).map((referral) => (
                        <p key={referral.id} className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3">
                          Referral: <span className="font-semibold text-foreground">{referral.status}</span>
                        </p>
                      ))}
                      {!selectedIntroductions.length && !selectedReferrals.length ? <p>No introductions or referrals yet.</p> : null}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                    <h3 className="font-display text-xl text-foreground">Opportunities</h3>
                    <div className="mt-3 space-y-2 text-sm text-silver">
                      {selectedOpportunities.length ? (
                        selectedOpportunities.slice(0, 3).map((opportunity) => (
                          <p key={opportunity.id} className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3">
                            <span className="block font-semibold text-foreground">{opportunity.title}</span>
                            <span>{circleCardOpportunityStatusLabel(opportunity.status)}</span>
                            {isCircleCardOpportunityOpenStatus(opportunity.status) && opportunity.nextFollowUpAt ? (
                              <span className="block">Next: {formatRelationshipDate(opportunity.nextFollowUpAt)}</span>
                            ) : null}
                          </p>
                        ))
                      ) : (
                        <p>No opportunities yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedContact.card?.id && introducibleContacts.length ? (
                  <form action={createCircleCardIntroductionAction} className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                    <input type="hidden" name="personAWalletContactId" value={selectedContact.id} />
                    <input type="hidden" name="returnPath" value={walletReturnPath} />
                    <h3 className="inline-flex items-center gap-2 font-display text-xl text-foreground">
                      <Users size={16} className="text-gold" />
                      Introduce Them
                    </h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <Select name="personBWalletContactId" className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26">
                        {introducibleContacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.display.fullName}
                          </option>
                        ))}
                      </Select>
                      <Input
                        name="reason"
                        placeholder="Why should they meet?"
                        className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                      />
                      <Button type="submit" className={cn(primaryActionClassName, "gap-2")}>
                        <Users size={16} />
                        Introduce
                      </Button>
                    </div>
                  </form>
                ) : null}

                {selectedContact.card?.id ? (
                  <form action={createCircleCardReferralAction} className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-4">
                    <input type="hidden" name="recipientWalletContactId" value={selectedContact.id} />
                    <input type="hidden" name="recipientCardId" value="" />
                    <input type="hidden" name="visibility" value="PRIVATE" />
                    <input type="hidden" name="source" value="circle_wallet_os" />
                    <input type="hidden" name="returnPath" value={walletReturnPath} />
                    <h3 className="inline-flex items-center gap-2 font-display text-xl text-foreground">
                      <Send size={16} className="text-gold" />
                      Send Referral
                    </h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <Input
                        name="referredContactName"
                        placeholder="Who are you referring?"
                        className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                      />
                      <Input
                        name="reason"
                        placeholder="Context"
                        className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                      />
                      <Button type="submit" className={cn(primaryActionClassName, "gap-2")}>
                        <Send size={16} />
                        Refer
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : (
              <div className="grid min-h-[520px] place-items-center text-center">
                <div className="max-w-xl">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-media-bg)] text-gold">
                    <WalletCards size={32} />
                  </div>
                  <h2 className="mt-5 font-display text-4xl text-foreground">
                    Your Circle starts with one connection.
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-silver">
                    Spin a Circle Card. Scan a business card. Build your network.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Link href="/dashboard/circle-card?section=network#discover" className={cn(buttonVariants(), primaryActionClassName, "gap-2")}>
                      <Sparkles size={16} />
                      Spin A Card
                    </Link>
                    <Link href="/dashboard/circle-card?section=network#business-card-scanner" className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "gap-2")}>
                      <Camera size={16} />
                      Scan A Card
                    </Link>
                    <Link href="/dashboard/circle-card?section=network#connect-hub" className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "gap-2")}>
                      <LinkIcon size={16} />
                      Enter Card Link
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
