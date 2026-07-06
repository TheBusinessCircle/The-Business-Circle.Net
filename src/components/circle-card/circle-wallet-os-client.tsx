"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ContactRound,
  Handshake,
  History,
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
import { CircleCardFramedImage, CircleCardShareButton } from "@/components/circle-card";
import { CircleCardPageHeader } from "@/components/circle-card/circle-card-page-header";
import {
  CircleCardWalletTestimonialForm,
  type CircleCardWalletTestimonialContact
} from "@/components/circle-card/circle-card-wallet-testimonial-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  circleCardOpportunityStatusLabel,
  isCircleCardOpportunityOpenStatus
} from "@/lib/circle-card/opportunities";
import { circleCardRecommendationVisibilityLabel } from "@/lib/circle-card/recommendations";
import { cn } from "@/lib/utils";

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

type DetailSectionId =
  | "notes"
  | "follow-up"
  | "recommendation"
  | "introductions"
  | "referrals"
  | "opportunities"
  | "summary"
  | "activity";

type WalletDisplay = {
  fullName: string;
  businessName?: string | null;
  role?: string | null;
  tagline?: string | null;
  location?: string | null;
  profileImageUrl?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  publicCardHref?: string | null;
  sourceLabel: string;
  isScannedBusinessCard: boolean;
};

type WalletCardSummary = {
  id: string;
  userId: string;
  slug: string;
  fullName: string;
  businessName?: string | null;
  role?: string | null;
  tagline?: string | null;
  location?: string | null;
  profileImageUrl?: string | null;
  businessLogoUrl?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  isPublished: boolean;
};

type WalletRecommendation = {
  id: string;
  category: string;
  reason?: string | null;
  visibility: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CircleWalletOsContact = {
  id: string;
  cardId?: string | null;
  source: string;
  savedAt: string;
  favourite: boolean;
  fullName?: string | null;
  businessName?: string | null;
  role?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  websiteDomain?: string | null;
  address?: string | null;
  socialLinks: Record<string, string>;
  originalCardImageUrl?: string | null;
  notes?: string | null;
  metAt?: string | null;
  followUpDate?: string | null;
  lastInteractionDate?: string | null;
  category?: string | null;
  tags: string[];
  card?: WalletCardSummary | null;
  recommendations: WalletRecommendation[];
  display: WalletDisplay;
  followUpStatus?: { label: string; isDue: boolean } | null;
  isMutualConnection: boolean;
  isSpunConnection: boolean;
};

export type CircleWalletOsOpportunity = {
  id: string;
  walletContactId?: string | null;
  title: string;
  status: string;
  nextFollowUpAt?: string | null;
  updatedAt: string;
};

export type CircleWalletOsIntroduction = {
  id: string;
  status: string;
  reason?: string | null;
  createdAt: string;
  personACardId: string;
  personBCardId: string;
  introducerCardId: string;
};

export type CircleWalletOsReferral = {
  id: string;
  status: string;
  reason?: string | null;
  createdAt: string;
  referrerCardId: string;
  recipientCardId: string;
  referredContactName?: string | null;
};

type CircleWalletOsClientProps = {
  themeStyle: CSSProperties;
  themeSurfaceStyle: string;
  themePresetLabel?: string | null;
  card?: {
    id: string;
    slug: string;
    fullName: string;
    isPublished: boolean;
  } | null;
  siteBaseUrl: string;
  publicUrl?: string | null;
  contacts: CircleWalletOsContact[];
  testimonialContacts: CircleCardWalletTestimonialContact[];
  opportunities: CircleWalletOsOpportunity[];
  introductions: CircleWalletOsIntroduction[];
  referrals: CircleWalletOsReferral[];
  initialView: WalletOsTab;
  initialQuery: string;
  initialCategory: string;
  initialContactId?: string | null;
  walletCategoryOptions: string[];
  metAtOptions: string[];
  recommendationCategories: string[];
  noticeMessage?: string | null;
  errorMessage?: string | null;
};

const primaryActionClassName =
  "rounded-2xl border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] text-[var(--cc-theme-button-text)] shadow-[var(--cc-theme-button-shadow)] hover:brightness-110";

const secondaryActionClassName =
  "rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] text-foreground shadow-[var(--cc-theme-secondary-shadow)] hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)]";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function toDateInputValue(value: string | null | undefined) {
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatRelationshipDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium"
  }).format(new Date(value));
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

  if (input.q?.trim()) {
    params.set("q", input.q.trim());
  }

  if (input.category?.trim()) {
    params.set("category", input.category.trim());
  }

  if (input.contactId) {
    params.set("contactId", input.contactId);
  }

  const query = params.toString();
  return query ? `/dashboard/circle-card/wallet?${query}` : "/dashboard/circle-card/wallet";
}

function replaceBrowserUrl(input: {
  view: WalletOsTab;
  q: string;
  category: string;
  contactId?: string | null;
}, mode: "push" | "replace" = "replace") {
  if (typeof window === "undefined") {
    return;
  }

  const href = buildWalletOsHref(input);

  if (`${window.location.pathname}${window.location.search}` === href) {
    return;
  }

  if (mode === "push") {
    window.history.pushState(null, "", href);
    return;
  }

  window.history.replaceState(null, "", href);
}

function walletContactMatchesQuery(input: {
  query: string;
  values: Array<string | null | undefined>;
}) {
  if (!input.query.trim()) {
    return true;
  }

  return input.values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(input.query.trim().toLowerCase());
}

function contactSubtitle(contact: CircleWalletOsContact) {
  return (
    [contact.display.role, contact.display.businessName].filter(Boolean).join(" at ") ||
    contact.display.sourceLabel
  );
}

function connectionLabel(contact: CircleWalletOsContact) {
  if (contact.isMutualConnection) {
    return "Mutual connection";
  }

  if (contact.cardId) {
    return "Circle Card linked";
  }

  return "Not connected";
}

function publicCardUrl(siteBaseUrl: string, href?: string | null) {
  return href ? `${siteBaseUrl}${href}` : null;
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
  tone = "soft",
  className
}: {
  children: ReactNode;
  tone?: "soft" | "strong" | "success" | "warning" | "danger";
  className?: string;
}) {
  const toneClassName =
    tone === "strong"
      ? "border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] text-[var(--cc-theme-button-text)]"
      : tone === "success"
        ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-100"
        : tone === "warning"
          ? "border-amber-300/42 bg-amber-300/12 text-amber-100"
          : tone === "danger"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] text-silver";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        toneClassName,
        className
      )}
    >
      {children}
    </span>
  );
}

function CompactMetric({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number;
  icon: typeof WalletCards;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[color:var(--cc-theme-secondary-border)] bg-background/20 px-3 py-2 text-xs text-silver">
      <Icon size={14} className="shrink-0 text-gold" />
      <span className="truncate">{label}</span>
      <strong className="text-foreground">{value}</strong>
    </span>
  );
}

function DetailSection({
  id,
  title,
  subtitle,
  count,
  icon: Icon,
  open,
  onToggle,
  children
}: {
  id: DetailSectionId;
  title: string;
  subtitle?: string;
  count?: number;
  icon: typeof WalletCards;
  open: boolean;
  onToggle: (id: DetailSectionId) => void;
  children: ReactNode;
}) {
  return (
    <section
      id={`wallet-section-${id}`}
      className="overflow-hidden rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className="flex w-full min-w-0 items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--cc-theme-secondary-border)] bg-background/24 text-gold">
            <Icon size={16} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold text-foreground">
              {title}
            </span>
            {subtitle ? <span className="block truncate text-xs text-silver">{subtitle}</span> : null}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {typeof count === "number" ? (
            <span className="rounded-full bg-background/24 px-2 py-1 text-xs font-semibold text-silver">
              {count}
            </span>
          ) : null}
          <ChevronDown
            size={18}
            className={cn("text-silver transition-transform", open ? "rotate-180" : null)}
          />
        </span>
      </button>
      <div className={cn("border-t border-[color:var(--cc-theme-secondary-border)] p-4", open ? "block" : "hidden")}>
        {children}
      </div>
    </section>
  );
}

function EmptyContactActions() {
  return (
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
  );
}

export function CircleWalletOsClient({
  themeStyle,
  themeSurfaceStyle,
  themePresetLabel,
  card,
  siteBaseUrl,
  publicUrl,
  contacts,
  testimonialContacts,
  opportunities,
  introductions,
  referrals,
  initialView,
  initialQuery,
  initialCategory,
  initialContactId,
  walletCategoryOptions,
  metAtOptions,
  recommendationCategories,
  noticeMessage,
  errorMessage
}: CircleWalletOsClientProps) {
  const [view, setView] = useState<WalletOsTab>(initialView);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(initialContactId ?? null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(Boolean(initialContactId));
  const [openSections, setOpenSections] = useState<Set<DetailSectionId>>(() => new Set(["notes"]));
  const pageScrollBeforeDetail = useRef(0);

  const tabCounts = useMemo<Record<WalletOsTab, number>>(() => {
    return {
      all: contacts.length,
      connected: contacts.filter((contact) => Boolean(contact.cardId)).length,
      favourites: contacts.filter((contact) => contact.favourite).length,
      "follow-ups": contacts.filter((contact) => Boolean(contact.followUpDate)).length,
      scanned: contacts.filter((contact) => contact.source === "BUSINESS_CARD_SCAN").length,
      recommended: contacts.filter((contact) => contact.recommendations.length > 0).length,
      recent: Math.min(contacts.length, 12)
    };
  }, [contacts]);

  const recentlyAddedCount = useMemo(() => {
    return contacts.filter((contact) => {
      const ageMs = Date.now() - new Date(contact.savedAt).getTime();
      return ageMs <= 14 * 24 * 60 * 60 * 1000;
    }).length;
  }, [contacts]);

  const visibleContacts = useMemo(() => {
    const searchedContacts = contacts.filter((contact) =>
      walletContactMatchesQuery({
        query,
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

    return view === "recent" ? tabFilteredContacts.slice(0, 12) : tabFilteredContacts;
  }, [category, contacts, query, view]);

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) ?? null;
  const selectedContactVisible = selectedContact
    ? visibleContacts.some((contact) => contact.id === selectedContact.id)
    : false;
  const selectedRecommendation =
    selectedContact?.recommendations.find((recommendation) => recommendation.status === "ACTIVE") ??
    selectedContact?.recommendations[0] ??
    null;
  const selectedRecommendationCategory =
    selectedRecommendation?.category && recommendationCategories.includes(selectedRecommendation.category)
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
  const introducibleContacts = selectedContact
    ? contacts.filter(
        (contact) =>
          contact.id !== selectedContact.id &&
          contact.card?.id &&
          contact.card.isPublished
      )
    : [];
  const walletReturnPath = buildWalletOsHref({
    view,
    q: query,
    category,
    contactId: selectedContact?.id ?? null
  });
  const allRelationshipCountsAreZero =
    !selectedContact?.recommendations.length &&
    !selectedIntroductions.length &&
    !selectedReferrals.length &&
    !selectedOpportunities.length;

  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      const nextView = params.get("view") as WalletOsTab | null;
      const validView = WALLET_OS_TABS.some((tab) => tab.value === nextView) ? nextView : "all";

      setView(validView ?? "all");
      setQuery(params.get("q") ?? "");
      setCategory(params.get("category") ?? "");
      setSelectedContactId(params.get("contactId"));
      setMobileDetailOpen(Boolean(params.get("contactId")));
      setOpenSections(new Set(["notes"]));
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (selectedContactId && !selectedContactVisible) {
      setSelectedContactId(null);
      setMobileDetailOpen(false);
      replaceBrowserUrl({ view, q: query, category });
    }
  }, [category, query, selectedContactId, selectedContactVisible, view]);

  function updateFilters(next: Partial<{ view: WalletOsTab; q: string; category: string }>) {
    const nextView = next.view ?? view;
    const nextQuery = next.q ?? query;
    const nextCategory = next.category ?? category;

    setView(nextView);
    setQuery(nextQuery);
    setCategory(nextCategory);
    setSelectedContactId(null);
    setMobileDetailOpen(false);
    replaceBrowserUrl({ view: nextView, q: nextQuery, category: nextCategory });
  }

  function selectContact(contactId: string) {
    pageScrollBeforeDetail.current = typeof window === "undefined" ? 0 : window.scrollY;
    setSelectedContactId(contactId);
    setMobileDetailOpen(true);
    setOpenSections(new Set(["notes"]));
    replaceBrowserUrl({ view, q: query, category, contactId }, "push");
  }

  function backToWalletList() {
    setMobileDetailOpen(false);
    setSelectedContactId(null);
    replaceBrowserUrl({ view, q: query, category }, "push");

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: pageScrollBeforeDetail.current });
    });
  }

  function toggleSection(id: DetailSectionId) {
    setOpenSections((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function openDetailSection(id: DetailSectionId) {
    setOpenSections((current) => new Set(current).add(id));

    window.requestAnimationFrame(() => {
      document.getElementById(`wallet-section-${id}`)?.scrollIntoView({ block: "nearest" });
    });
  }

  return (
    <div
      className="circle-card-public-theme relative min-h-screen overflow-x-hidden pb-8"
      style={themeStyle}
      data-circle-card-surface={themeSurfaceStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[image:var(--cc-theme-page-bg)]"
      />

      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
        <CircleCardPageHeader
          className="circle-card-page-header-themed"
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
                <ThemeBadge tone="strong">
                  <WalletCards size={13} />
                  Circle Wallet
                </ThemeBadge>
                {themePresetLabel ? <ThemeBadge>{themePresetLabel}</ThemeBadge> : null}
                <ThemeBadge>{themeSurfaceStyle}</ThemeBadge>
            </div>
          }
          title="Circle Wallet"
          description="Your people. Your relationships. Your Circle."
          actions={
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Link href="/dashboard/circle-card" className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "min-w-0 gap-2")}>
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
                  buttonClassName={cn(secondaryActionClassName, "min-w-0 gap-2")}
                />
              ) : null}
              <Link href="/dashboard/circle-card?section=network#connect-hub" className={cn(buttonVariants(), primaryActionClassName, "min-w-0 gap-2")}>
                <Sparkles size={16} />
                Add Relationship
              </Link>
            </div>
          }
          footer={
            <div className="flex max-w-full flex-wrap gap-2">
            <CompactMetric label="Saved" value={contacts.length} icon={WalletCards} />
            <CompactMetric label="Connected" value={tabCounts.connected} icon={UserCheck} />
            <CompactMetric label="Favourites" value={tabCounts.favourites} icon={Star} />
            <CompactMetric label="Follow-Ups" value={tabCounts["follow-ups"]} icon={CalendarDays} />
            <CompactMetric label="Recent" value={recentlyAddedCount} icon={Clock3} />
            </div>
          }
        />

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

        <section className="mt-4 rounded-[1.5rem] border border-gold/32 bg-gold/8 p-4 shadow-[0_20px_64px_rgba(212,175,95,0.1)] ring-1 ring-gold/10 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
              <Star size={18} />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">Trust network</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">Leave a Trust Signal</h2>
              <p className="mt-1 text-sm text-muted">Search your wallet to leave a verified trust signal.</p>
            </div>
          </div>
          <CircleCardWalletTestimonialForm contacts={testimonialContacts} />
        </section>

        <main className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] xl:items-start">
          <section
            className={cn(
              "min-w-0 rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-3 shadow-[var(--cc-theme-secondary-shadow)] backdrop-blur sm:p-4 xl:sticky xl:top-4",
              mobileDetailOpen ? "hidden xl:block" : "block"
            )}
          >
            <div className="sticky top-2 z-20 rounded-[1rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-2 shadow-[var(--cc-theme-secondary-shadow)] backdrop-blur">
              <form
                action="/dashboard/circle-card/wallet"
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  replaceBrowserUrl({ view, q: query, category, contactId: selectedContactId });
                }}
              >
                <input type="hidden" name="view" value={view} />
                <div className="relative min-w-0">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
                  <Input
                    name="q"
                    value={query}
                    onChange={(event) => updateFilters({ q: event.target.value })}
                    placeholder="Search people, notes, tags..."
                    className="h-11 rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/28 pl-10"
                  />
                </div>
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Select
                    name="category"
                    value={category}
                    onChange={(event) => updateFilters({ category: event.target.value })}
                    aria-label="Wallet category"
                    className="h-11 rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/28"
                  >
                    <option value="">All categories</option>
                    {walletCategoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" className={cn(primaryActionClassName, "h-11 gap-2")}>
                    <Search size={16} />
                    Search
                  </Button>
                </div>
              </form>

              <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
                {WALLET_OS_TABS.map((tab) => {
                  const selected = view === tab.value;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateFilters({ view: tab.value })}
                      className={cn(
                        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition",
                        selected
                          ? "border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] text-[var(--cc-theme-button-text)] shadow-[var(--cc-theme-button-shadow)]"
                          : "border-[color:var(--cc-theme-secondary-border)] bg-background/20 text-silver hover:border-[color:var(--cc-theme-button-border)] hover:text-foreground"
                      )}
                    >
                      {tab.label}
                      <span className="rounded-full bg-background/22 px-1.5 py-0.5 text-[10px]">
                        {tabCounts[tab.value]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid min-w-0 gap-2">
              {visibleContacts.length ? (
                visibleContacts.map((contact) => {
                  const selected = selectedContact?.id === contact.id;

                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => selectContact(contact.id)}
                      className={cn(
                        "group w-full min-w-0 rounded-[1rem] border p-3 text-left transition hover:-translate-y-0.5",
                        selected
                          ? "border-[color:var(--cc-theme-button-border)] bg-gold/10 shadow-[var(--cc-theme-button-shadow)]"
                          : "border-[color:var(--cc-theme-secondary-border)] bg-background/18 hover:border-[color:var(--cc-theme-button-border)]"
                      )}
                    >
                      <div className="flex min-w-0 gap-3">
                        <WalletAvatar
                          name={contact.display.fullName}
                          src={contact.display.profileImageUrl}
                          className="h-12 w-12 text-sm sm:h-14 sm:w-14"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {contact.display.fullName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-silver">{contactSubtitle(contact)}</p>
                            </div>
                            {contact.favourite ? <Star size={15} className="shrink-0 fill-gold text-gold" /> : null}
                          </div>
                          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                            <ThemeBadge className="max-w-[140px] truncate">{contact.display.sourceLabel}</ThemeBadge>
                            {contact.isSpunConnection ? (
                              <ThemeBadge tone="strong">
                                <Sparkles size={11} />
                                Spun CC
                              </ThemeBadge>
                            ) : null}
                            {contact.cardId ? <ThemeBadge>Linked</ThemeBadge> : null}
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
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[1rem] border border-dashed border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-5 text-center">
                  <p className="font-display text-xl text-foreground">
                    {contacts.length ? "No contacts match those filters." : "Your saved Circle Cards and scanned business cards will appear here."}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {contacts.length ? "Try another search or filter." : "Spin a Circle Card. Scan a business card. Build your network."}
                  </p>
                  {!contacts.length ? <EmptyContactActions /> : null}
                </div>
              )}
            </div>
          </section>

          <section
            className={cn(
              "min-w-0 rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-[linear-gradient(145deg,hsl(var(--card)/0.9),rgba(4,10,24,0.94))] p-3 shadow-[var(--cc-theme-hero-shadow)] backdrop-blur sm:p-4",
              mobileDetailOpen || selectedContact ? "block" : "hidden xl:block"
            )}
          >
            {selectedContact ? (
              <div key={selectedContact.id} className="min-w-0 space-y-3 sm:space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(secondaryActionClassName, "w-full justify-start gap-2 xl:hidden")}
                  onClick={backToWalletList}
                >
                  <ArrowLeft size={16} />
                  Back to Wallet
                </Button>

                <div className="relative overflow-hidden rounded-[1.25rem] border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-media-bg)] p-4">
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3 sm:gap-4">
                      <WalletAvatar
                        name={selectedContact.display.fullName}
                        src={selectedContact.display.profileImageUrl}
                        className="h-16 w-16 text-lg sm:h-20 sm:w-20"
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                          <ThemeBadge tone="strong">{selectedContact.display.sourceLabel}</ThemeBadge>
                          <ThemeBadge tone={selectedContact.isMutualConnection ? "success" : "soft"}>
                            <ShieldCheck size={12} />
                            {connectionLabel(selectedContact)}
                          </ThemeBadge>
                          {selectedContact.favourite ? (
                            <ThemeBadge tone="warning">
                              <Star size={12} className="fill-current" />
                              Favourite
                            </ThemeBadge>
                          ) : null}
                          {selectedContact.followUpStatus?.isDue ? (
                            <ThemeBadge tone="warning">
                              <CalendarDays size={12} />
                              {selectedContact.followUpStatus.label}
                            </ThemeBadge>
                          ) : null}
                        </div>
                        <h2 className="mt-3 truncate font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                          {selectedContact.display.fullName}
                        </h2>
                        <p className="mt-1 truncate text-sm text-silver">{contactSubtitle(selectedContact)}</p>
                      </div>
                    </div>
                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      {selectedContact.display.publicCardHref ? (
                        <Link
                          href={selectedContact.display.publicCardHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "min-w-0 gap-2 px-3 text-xs sm:text-sm")}
                        >
                          Open Card
                          <ArrowUpRight size={15} />
                        </Link>
                      ) : null}
                      {selectedContact.display.publicCardHref ? (
                        <CircleCardShareButton
                          title={`${selectedContact.display.fullName} | Circle Card`}
                          publicUrl={publicCardUrl(siteBaseUrl, selectedContact.display.publicCardHref) ?? siteBaseUrl}
                          cardId={selectedContact.card?.id}
                          analyticsSource="wallet_os"
                          label="Share"
                          hideStatus
                          buttonClassName={cn(secondaryActionClassName, "min-w-0 gap-2 px-3 text-xs sm:text-sm")}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold text-foreground">Quick Actions</h3>
                    <ThemeBadge>{selectedContactVisible ? "Selected" : "Filtered out"}</ThemeBadge>
                  </div>
                  <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <form action={toggleCircleWalletFavouriteAction} className="min-w-0">
                      <input type="hidden" name="walletContactId" value={selectedContact.id} />
                      <input type="hidden" name="returnPath" value={walletReturnPath} />
                      <Button type="submit" variant="outline" className={cn(secondaryActionClassName, "w-full min-w-0 justify-start gap-2 px-3")}>
                        <Star size={16} className={selectedContact.favourite ? "fill-gold text-gold" : undefined} />
                        <span className="truncate">{selectedContact.favourite ? "Unfavourite" : "Favourite"}</span>
                      </Button>
                    </form>
                    <Button type="button" variant="outline" className={cn(secondaryActionClassName, "w-full min-w-0 justify-start gap-2 px-3")} onClick={() => openDetailSection("follow-up")}>
                      <CalendarDays size={16} />
                      <span className="truncate">Set Follow-Up</span>
                    </Button>
                    <Button type="button" variant="outline" className={cn(secondaryActionClassName, "w-full min-w-0 justify-start gap-2 px-3")} onClick={() => openDetailSection("introductions")}>
                      <Users size={16} />
                      <span className="truncate">Introduce</span>
                    </Button>
                    <Button type="button" variant="outline" className={cn(secondaryActionClassName, "w-full min-w-0 justify-start gap-2 px-3")} onClick={() => openDetailSection("referrals")}>
                      <Send size={16} />
                      <span className="truncate">Refer</span>
                    </Button>
                    <Button type="button" variant="outline" className={cn(secondaryActionClassName, "w-full min-w-0 justify-start gap-2 px-3")} onClick={() => openDetailSection("opportunities")}>
                      <Handshake size={16} />
                      <span className="truncate">Create Opportunity</span>
                    </Button>
                    <form action={removeCircleWalletContactAction} className="min-w-0">
                      <input type="hidden" name="walletContactId" value={selectedContact.id} />
                      <input type="hidden" name="returnPath" value="/dashboard/circle-card/wallet" />
                      <Button type="submit" variant="outline" className="w-full min-w-0 justify-start gap-2 rounded-2xl border-destructive/30 bg-destructive/10 px-3 text-destructive hover:bg-destructive/15">
                        <Trash2 size={16} />
                        <span className="truncate">Remove</span>
                      </Button>
                    </form>
                  </div>
                </div>

                {selectedContact.isSpunConnection ? (
                  <div className="rounded-[1.25rem] border border-[color:var(--cc-theme-button-border)] bg-gold/10 p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
                      <Sparkles size={16} />
                      {contacts.length === 1 ? "Your Circle Has Begun" : "Spin To Connect relationship"}
                    </p>
                    <p className="mt-2 text-sm text-silver">
                      Relationship timestamp: {formatRelationshipDate(selectedContact.savedAt)}
                    </p>
                  </div>
                ) : null}

                <form action={updateCircleWalletContactDetailsAction} className="space-y-3">
                  <input type="hidden" name="walletContactId" value={selectedContact.id} />
                  <input type="hidden" name="returnPath" value={walletReturnPath} />

                  <DetailSection
                    id="notes"
                    title="Relationship Notes"
                    subtitle="Private context and next step"
                    icon={StickyNote}
                    open={openSections.has("notes")}
                    onToggle={toggleSection}
                  >
                    <Textarea
                      name="notes"
                      defaultValue={selectedContact.notes ?? ""}
                      rows={5}
                      placeholder="Private notes, context, next step..."
                      className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                    />
                  </DetailSection>

                  <DetailSection
                    id="follow-up"
                    title="Follow-Up & Context"
                    subtitle={selectedContact.followUpDate ? formatRelationshipDate(selectedContact.followUpDate) : "No follow-up set"}
                    icon={CalendarDays}
                    open={openSections.has("follow-up")}
                    onToggle={toggleSection}
                  >
                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`wallet-met-at-${selectedContact.id}`}>Where met</Label>
                        <Input
                          id={`wallet-met-at-${selectedContact.id}`}
                          name="metAt"
                          list={`wallet-met-at-options-${selectedContact.id}`}
                          defaultValue={selectedContact.metAt ?? ""}
                          className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                        />
                        <datalist id={`wallet-met-at-options-${selectedContact.id}`}>
                          {metAtOptions.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`wallet-category-${selectedContact.id}`}>Category</Label>
                        <Input
                          id={`wallet-category-${selectedContact.id}`}
                          name="category"
                          list={`wallet-category-options-${selectedContact.id}`}
                          defaultValue={selectedContact.category ?? ""}
                          className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                        />
                        <datalist id={`wallet-category-options-${selectedContact.id}`}>
                          {walletCategoryOptions.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`wallet-follow-up-${selectedContact.id}`}>Follow-up date</Label>
                        <Input
                          id={`wallet-follow-up-${selectedContact.id}`}
                          type="date"
                          name="followUpDate"
                          defaultValue={toDateInputValue(selectedContact.followUpDate)}
                          className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`wallet-last-interaction-${selectedContact.id}`}>Last interaction</Label>
                        <Input
                          id={`wallet-last-interaction-${selectedContact.id}`}
                          type="date"
                          name="lastInteractionDate"
                          defaultValue={toDateInputValue(selectedContact.lastInteractionDate)}
                          className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`wallet-tags-${selectedContact.id}`}>Tags</Label>
                        <Input
                          id={`wallet-tags-${selectedContact.id}`}
                          name="tagsInput"
                          defaultValue={selectedContact.tags.join(", ")}
                          placeholder="mentor, client, local, podcast..."
                          className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                        />
                      </div>
                    </div>
                  </DetailSection>

                  <Button type="submit" className={cn(primaryActionClassName, "w-full gap-2")}>
                    <StickyNote size={16} />
                    Save Relationship
                  </Button>
                </form>

                <DetailSection
                  id="recommendation"
                  title="Recommendation"
                  subtitle={selectedRecommendation ? selectedRecommendation.category : "No recommendations yet."}
                  count={selectedContact.recommendations.length}
                  icon={UserCheck}
                  open={openSections.has("recommendation")}
                  onToggle={toggleSection}
                >
                  <div className="space-y-4">
                    <div className="space-y-2 text-sm text-silver">
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
                    <form action={upsertCircleCardRecommendationAction} className="grid gap-3">
                      <input type="hidden" name="recommendationId" value={selectedRecommendation?.id ?? ""} />
                      <input type="hidden" name="walletContactId" value={selectedContact.id} />
                      <input type="hidden" name="returnPath" value={walletReturnPath} />
                      <Select name="category" defaultValue={selectedRecommendationCategory} className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26">
                        {recommendationCategories.map((option) => (
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
                      <Button type="submit" className={cn(primaryActionClassName, "w-full gap-2")}>
                        <UserCheck size={16} />
                        Save Recommendation
                      </Button>
                    </form>
                  </div>
                </DetailSection>

                <DetailSection
                  id="introductions"
                  title="Introductions"
                  subtitle={selectedIntroductions.length ? `${selectedIntroductions.length} recorded` : "No introductions yet."}
                  count={selectedIntroductions.length}
                  icon={Users}
                  open={openSections.has("introductions")}
                  onToggle={toggleSection}
                >
                  <div className="space-y-4">
                    {selectedContact.card?.id && introducibleContacts.length ? (
                      <form action={createCircleCardIntroductionAction} className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <input type="hidden" name="personAWalletContactId" value={selectedContact.id} />
                        <input type="hidden" name="returnPath" value={walletReturnPath} />
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
                      </form>
                    ) : (
                      <p className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3 text-sm text-silver">
                        Introductions need a linked published Circle Card contact and another eligible wallet contact.
                      </p>
                    )}
                    <div className="space-y-2 text-sm text-silver">
                      {selectedIntroductions.length ? (
                        selectedIntroductions.slice(0, 4).map((introduction) => (
                          <p key={introduction.id} className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3">
                            Introduction: <span className="font-semibold text-foreground">{introduction.status}</span>
                            <span className="block">{formatRelationshipDate(introduction.createdAt)}</span>
                          </p>
                        ))
                      ) : (
                        <p>No introductions yet.</p>
                      )}
                    </div>
                  </div>
                </DetailSection>

                <DetailSection
                  id="referrals"
                  title="Referrals"
                  subtitle={selectedReferrals.length ? `${selectedReferrals.length} recorded` : "No referrals yet."}
                  count={selectedReferrals.length}
                  icon={Send}
                  open={openSections.has("referrals")}
                  onToggle={toggleSection}
                >
                  <div className="space-y-4">
                    {selectedContact.card?.id ? (
                      <form action={createCircleCardReferralAction} className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <input type="hidden" name="recipientWalletContactId" value={selectedContact.id} />
                        <input type="hidden" name="recipientCardId" value="" />
                        <input type="hidden" name="visibility" value="PRIVATE" />
                        <input type="hidden" name="source" value="circle_wallet_os" />
                        <input type="hidden" name="returnPath" value={walletReturnPath} />
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
                      </form>
                    ) : (
                      <p className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3 text-sm text-silver">
                        Referrals can be sent when this contact is linked to a published Circle Card.
                      </p>
                    )}
                    <div className="space-y-2 text-sm text-silver">
                      {selectedReferrals.length ? (
                        selectedReferrals.slice(0, 4).map((referral) => (
                          <p key={referral.id} className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3">
                            Referral: <span className="font-semibold text-foreground">{referral.status}</span>
                            {referral.referredContactName ? (
                              <span className="block truncate">{referral.referredContactName}</span>
                            ) : null}
                          </p>
                        ))
                      ) : (
                        <p>No referrals yet.</p>
                      )}
                    </div>
                  </div>
                </DetailSection>

                <DetailSection
                  id="opportunities"
                  title="Opportunities"
                  subtitle={selectedOpportunities.length ? `${selectedOpportunities.length} tracked` : "No opportunities yet."}
                  count={selectedOpportunities.length}
                  icon={Handshake}
                  open={openSections.has("opportunities")}
                  onToggle={toggleSection}
                >
                  <div className="space-y-4">
                    <form action={createCircleCardOpportunityAction} className="grid min-w-0 gap-3">
                      <input type="hidden" name="walletContactId" value={selectedContact.id} />
                      <input type="hidden" name="status" value="LEAD" />
                      <input type="hidden" name="currency" value="GBP" />
                      <input type="hidden" name="sourceType" value="CONNECTION" />
                      <input type="hidden" name="returnPath" value={walletReturnPath} />
                      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(160px,220px)_auto]">
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
                        <Button type="submit" className={cn(primaryActionClassName, "gap-2")}>
                          <Handshake size={16} />
                          Create
                        </Button>
                      </div>
                      <Textarea
                        name="notes"
                        rows={3}
                        placeholder="Opportunity notes..."
                        className="rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-background/26"
                      />
                    </form>
                    <div className="space-y-2 text-sm text-silver">
                      {selectedOpportunities.length ? (
                        selectedOpportunities.slice(0, 4).map((opportunity) => (
                          <p key={opportunity.id} className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3">
                            <span className="block truncate font-semibold text-foreground">{opportunity.title}</span>
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
                </DetailSection>

                <DetailSection
                  id="summary"
                  title="Relationship Summary"
                  subtitle={allRelationshipCountsAreZero ? "Nothing recorded yet" : "Counts across this relationship"}
                  icon={WalletCards}
                  open={openSections.has("summary")}
                  onToggle={toggleSection}
                >
                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
                    <CompactMetric label="Recommendations" value={selectedContact.recommendations.length} icon={UserCheck} />
                    <CompactMetric label="Introductions" value={selectedIntroductions.length} icon={Users} />
                    <CompactMetric label="Referrals" value={selectedReferrals.length} icon={Send} />
                    <CompactMetric label="Opportunities" value={selectedOpportunities.length} icon={Handshake} />
                  </div>
                  {allRelationshipCountsAreZero ? (
                    <p className="mt-3 text-sm text-silver">
                      Nothing recorded yet. Use quick actions when there is a useful next step.
                    </p>
                  ) : null}
                </DetailSection>

                <DetailSection
                  id="activity"
                  title="Activity / History"
                  subtitle={`Saved ${formatRelationshipDate(selectedContact.savedAt)}`}
                  icon={History}
                  open={openSections.has("activity")}
                  onToggle={toggleSection}
                >
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <p className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3 text-silver">
                      <span className="block text-xs font-semibold uppercase tracking-[0.08em]">Saved</span>
                      <span className="mt-1 block text-foreground">{formatDateTime(selectedContact.savedAt)}</span>
                    </p>
                    <p className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3 text-silver">
                      <span className="block text-xs font-semibold uppercase tracking-[0.08em]">Last interaction</span>
                      <span className="mt-1 block text-foreground">
                        {selectedContact.lastInteractionDate
                          ? formatRelationshipDate(selectedContact.lastInteractionDate)
                          : "Not set"}
                      </span>
                    </p>
                    <p className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3 text-silver">
                      <span className="block text-xs font-semibold uppercase tracking-[0.08em]">Source</span>
                      <span className="mt-1 block text-foreground">{selectedContact.display.sourceLabel}</span>
                    </p>
                    <p className="rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3 text-silver">
                      <span className="block text-xs font-semibold uppercase tracking-[0.08em]">Connection</span>
                      <span className="mt-1 block text-foreground">{connectionLabel(selectedContact)}</span>
                    </p>
                  </div>
                  {selectedContact.tags.length ? (
                    <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                      {selectedContact.tags.map((tag) => (
                        <ThemeBadge key={tag}>
                          <Tag size={11} />
                          {tag}
                        </ThemeBadge>
                      ))}
                    </div>
                  ) : null}
                  {selectedContact.originalCardImageUrl ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-background/18 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-silver">Scanned card</p>
                      <img
                        src={selectedContact.originalCardImageUrl}
                        alt={`${selectedContact.display.fullName} scanned business card`}
                        className="max-h-56 w-full rounded-xl object-contain"
                      />
                    </div>
                  ) : null}
                </DetailSection>
              </div>
            ) : (
              <div className="grid min-h-[360px] place-items-center text-center">
                <div className="max-w-md">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-media-bg)] text-gold">
                    <WalletCards size={28} />
                  </div>
                  <h2 className="mt-4 font-display text-2xl text-foreground">
                    Select a contact to view relationship details.
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-silver">
                    Tap anyone in your wallet to open notes, actions, follow-ups and relationship history.
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
