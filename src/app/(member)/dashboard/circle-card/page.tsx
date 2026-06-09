import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Compass,
  ContactRound,
  Camera,
  Handshake,
  Crown,
  Download,
  Eye,
  Filter,
  Link as LinkIcon,
  Lock,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  MousePointerClick,
  QrCode,
  Search,
  Send,
  Save,
  Share2,
  Star,
  StickyNote,
  Tag,
  Trash2,
  ShoppingBag,
  UserCheck,
  UserX,
  WalletCards,
  XCircle
} from "lucide-react";
import {
  acceptCircleCardConnectionRequestAction,
  acceptCircleCardIntroductionAction,
  cancelCircleCardConnectionRequestAction,
  cancelCircleCardIntroductionAction,
  createCircleCardOpportunityAction,
  createCircleCardReferralAction,
  createCircleCardIntroductionAction,
  deleteCircleCardLinkAction,
  declineCircleCardConnectionRequestAction,
  declineCircleCardIntroductionAction,
  generateBusinessCardClaimLinkAction,
  markAllCircleCardNotificationsReadAction,
  markCircleCardNotificationReadAction,
  moveCircleCardLinkAction,
  removeCircleWalletContactAction,
  resolveCircleCardLinkAction,
  saveCircleWalletContactAction,
  sendCircleCardConnectionRequestAction,
  toggleCircleWalletFavouriteAction,
  toggleCircleCardLinkAction,
  updateCircleCardOpportunityAction,
  updateCircleCardOpportunityStatusAction,
  updateCircleCardRecommendationStatusAction,
  updateCircleCardReferralStatusAction,
  updateCircleWalletContactDetailsAction,
  upsertCircleCardRecommendationAction,
  upsertCircleCardAction,
  upsertCircleCardLinkAction
} from "@/actions/circle-card.actions";
import {
  BusinessCardScanner,
  CircleCardBcnDiscoveryPanel,
  CircleCardCopyLinkButton,
  CircleCardDashboardSection,
  CircleCardImageUploadField,
  CircleCardInstallPrompt,
  CircleCardQrPanel,
  CircleCardShareAssetsPanel,
  CircleCardShareButton,
  CircleCardTrackedLink,
  CircleCardSmartLinkFields
} from "@/components/circle-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  circleCardFileActionLabel,
  circleCardFileKindLabel,
  detectCircleCardFileKind,
  resolveCircleCardFileAction
} from "@/lib/circle-card/file-actions";
import {
  getCircleCardAccountLabel,
  getCircleCardFeatureAccess,
  isCircleCardFreeAccount,
  resolveCircleCardAccessLevel
} from "@/lib/circle-card/permissions";
import { buildCircleCardShareSourceUrl } from "@/lib/circle-card/share-sources";
import { signOutAction } from "@/lib/actions/auth-actions";
import {
  CIRCLE_CARD_RECOMMENDATION_CATEGORIES,
  circleCardRecommendationVisibilityLabel
} from "@/lib/circle-card/recommendations";
import { circleCardIntroductionStatusLabel } from "@/lib/circle-card/introductions";
import {
  CIRCLE_CARD_REFERRAL_OPEN_STATUSES,
  circleCardReferralStatusLabel,
  circleCardReferralVisibilityLabel
} from "@/lib/circle-card/referrals";
import {
  CIRCLE_CARD_OPPORTUNITY_CURRENCY_OPTIONS,
  CIRCLE_CARD_OPPORTUNITY_SOURCE_TYPES,
  CIRCLE_CARD_OPPORTUNITY_STATUSES,
  circleCardOpportunitySourceTypeLabel,
  circleCardOpportunityStatusLabel,
  isCircleCardOpportunityOpenStatus
} from "@/lib/circle-card/opportunities";
import {
  CIRCLE_CARD_ACTIVITY_FILTER_OPTIONS,
  CIRCLE_CARD_ACTIVITY_FILTER_TYPE_MAP,
  type CircleCardActivityFilter,
  circleCardActivityHref,
  circleCardActivityTypeLabel,
  resolveCircleCardActivityFilter
} from "@/lib/circle-card/activity";
import {
  circleCardNotificationHref,
  circleCardNotificationTypeLabel
} from "@/lib/circle-card/notifications";
import {
  type CircleCardLinkType,
  CIRCLE_WALLET_CATEGORY_OPTIONS,
  CIRCLE_WALLET_MET_AT_OPTIONS,
  readCircleCardSocialLinks,
  readCircleWalletBusinessCardSocialLinks,
  readCircleWalletTags,
  resolveCircleCardLookupSlug
} from "@/lib/circle-card/schema";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { requireCircleCardUser } from "@/lib/session";
import { absoluteUrl, cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  createDueOpportunityNotificationsForUser,
  getCircleCardAnalyticsSummary,
  trackCircleCardEvent
} from "@/server/circle-card";

export const metadata: Metadata = createPageMetadata({
  title: "My Circle Card",
  description: "Create and manage your Circle Card inside The Business Circle Network.",
  path: "/dashboard/circle-card",
  noIndex: true
});

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CIRCLE_CARD_APP_SECTIONS = [
  "home",
  "my-card",
  "network",
  "business",
  "share",
  "settings"
] as const;

type CircleCardAppSection = (typeof CIRCLE_CARD_APP_SECTIONS)[number];

const CIRCLE_CARD_APP_SECTION_LABELS: Record<CircleCardAppSection, string> = {
  home: "Home",
  "my-card": "My Card",
  network: "Network",
  business: "Business",
  share: "Share",
  settings: "Settings"
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveCircleCardAppSection(value: string | undefined): CircleCardAppSection {
  return CIRCLE_CARD_APP_SECTIONS.includes(value as CircleCardAppSection)
    ? (value as CircleCardAppSection)
    : "home";
}

function circleCardSectionHref(section: CircleCardAppSection, hash?: string) {
  const suffix = hash ? `#${hash.replace(/^#/, "")}` : "";
  return `/dashboard/circle-card?section=${section}${suffix}`;
}

const NOTICE_MESSAGES: Record<string, string> = {
  "card-created": "Circle Card created.",
  "onboarding-complete": "Your Circle Card is live.",
  "card-updated": "Circle Card updated.",
  "card-saved": "Contact saved to your Circle Wallet.",
  "card-already-saved": "That card is already in your Circle Wallet.",
  "card-removed": "Contact removed from your Circle Wallet.",
  "favourite-added": "Contact marked as a favourite.",
  "favourite-removed": "Contact removed from favourites.",
  "relationship-updated": "Relationship details updated.",
  "connection-request-sent": "Connection request sent.",
  "connection-request-accepted": "Connection request accepted. You are now mutually saved.",
  "connection-request-declined": "Connection request declined.",
  "connection-request-cancelled": "Connection request cancelled.",
  "connection-request-pending": "A connection request is already pending.",
  "connection-request-incoming": "That contact has already sent you a request.",
  "connection-already-connected": "You are already connected.",
  "card-link-resolved": "Circle Card link resolved.",
  "business-card-contact-created": "Scanned business card saved to your Circle Wallet.",
  "business-card-match-found": "Existing Circle Card found for that business card.",
  "business-card-duplicate": "That contact is already in your Circle Wallet.",
  "claim-link-generated": "Claim link generated. Copy it from the selected contact.",
  "recommendation-created": "Recommendation saved.",
  "recommendation-updated": "Recommendation updated.",
  "recommendation-hidden": "Recommendation hidden from public display.",
  "recommendation-removed": "Recommendation removed.",
  "introduction-created": "Introduction sent.",
  "introduction-accepted": "Introduction accepted.",
  "introduction-declined": "Introduction declined.",
  "introduction-completed": "Introduction completed.",
  "introduction-cancelled": "Introduction cancelled.",
  "introduction-already-accepted": "You have already accepted this introduction.",
  "referral-created": "Referral sent.",
  "referral-accepted": "Referral accepted.",
  "referral-declined": "Referral declined.",
  "referral-won": "Referral marked won.",
  "referral-lost": "Referral marked lost.",
  "referral-cancelled": "Referral cancelled.",
  "opportunity-created": "Opportunity created.",
  "opportunity-updated": "Opportunity updated.",
  "opportunity-won": "Opportunity marked won.",
  "opportunity-lost": "Opportunity marked lost.",
  "notification-read": "Notification marked as read.",
  "notifications-read": "All notifications marked as read.",
  "custom-link-created": "Custom link added.",
  "custom-link-updated": "Custom link updated.",
  "custom-link-deleted": "Custom link deleted.",
  "custom-link-enabled": "Custom link enabled.",
  "custom-link-disabled": "Custom link paused.",
  "custom-link-reordered": "Custom links reordered.",
  "own-card": "This is already your Circle Card."
};

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-card": "Check the card fields and try again.",
  "card-not-found": "That Circle Card could not be found.",
  "card-limit": "Your current Circle Card access includes one card in Phase 1.",
  "slug-taken": "That public card link is already taken.",
  "card-save-failed": "The Circle Card could not be saved.",
  "custom-link-invalid": "Check the custom link fields and try again.",
  "custom-link-not-found": "That custom link could not be found.",
  "custom-link-save-failed": "The custom link could not be saved.",
  "custom-link-access-code-required": "Generate a 4-digit access code before saving a private link.",
  "custom-link-active-limit": "Free Circle Cards can keep up to 5 active custom links in this phase.",
  "custom-link-total-limit": "This Circle Card already has the maximum number of saved custom links.",
  "connection-invalid": "Check the connection request and try again.",
  "connection-card-not-found": "That Circle Card could not be found.",
  "connection-primary-card-required": "Create your own Circle Card before sending requests.",
  "connection-save-first": "Save that Circle Card before sending a request.",
  "connection-request-not-found": "That connection request is no longer pending.",
  "connection-request-failed": "The connection request could not be sent.",
  "connection-rate-limited": "You've sent several connection requests recently. Please try again later.",
  "card-link-invalid": "Enter a valid Circle Card link or slug.",
  "card-link-not-found": "No published Circle Card was found for that link.",
  "wallet-contact-invalid": "Check the relationship details and try again.",
  "wallet-contact-not-found": "That saved contact could not be found.",
  "business-card-invalid": "Check the scanned business card details and try again.",
  "claim-link-email-required": "Add an email before generating a claim link.",
  "recommendation-invalid": "Check the recommendation fields and try again.",
  "recommendation-primary-card-required": "Create your own Circle Card before recommending someone.",
  "recommendation-self": "You cannot recommend yourself.",
  "recommendation-public-card-required": "Public recommendations need a saved public Circle Card contact.",
  "recommendation-duplicate": "You already publicly recommend this person in that category.",
  "recommendation-not-found": "That recommendation could not be found.",
  "introduction-invalid": "Check the introduction details and try again.",
  "introduction-primary-card-required": "Create your own Circle Card before making introductions.",
  "introduction-wallet-required": "Introductions need two saved published Circle Card contacts.",
  "introduction-same-contact": "Choose two different people to introduce.",
  "introduction-self": "You cannot introduce yourself.",
  "introduction-duplicate": "You already have an active introduction for that pair.",
  "introduction-not-found": "That introduction is no longer active.",
  "introduction-already-accepted": "You have already accepted this introduction.",
  "introduction-rate-limited": "You've created several introductions recently. Please try again later.",
  "referral-invalid": "Check the referral fields and try again.",
  "referral-primary-card-required": "Create your own Circle Card before sending referrals.",
  "referral-recipient-not-found": "That referral recipient could not be found.",
  "referral-self": "You cannot send a referral to yourself.",
  "referral-not-found": "That referral could not be found.",
  "referral-status-not-allowed": "That referral status change is not available.",
  "referral-rate-limited": "You've sent several referrals recently. Please try again later.",
  "opportunity-invalid": "Check the opportunity fields and try again.",
  "opportunity-primary-card-required": "Create your own Circle Card before tracking opportunities.",
  "opportunity-not-found": "That opportunity could not be found.",
  "notification-invalid": "Check the notification action and try again.",
  "notification-not-found": "That notification could not be found."
};

const WALLET_VIEW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "favourites", label: "Favourites" },
  { value: "recommended", label: "People I Recommend" },
  { value: "requests", label: "Requests" },
  { value: "recent", label: "Recent" }
] as const;

const INTRODUCTION_VIEW_OPTIONS = [
  { value: "incoming", label: "Incoming" },
  { value: "outgoing", label: "Outgoing" },
  { value: "completed", label: "Completed" }
] as const;

const REFERRAL_VIEW_OPTIONS = [
  { value: "sent", label: "Sent" },
  { value: "received", label: "Received" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" }
] as const;

const WALLET_FOLLOW_UP_FILTER_OPTIONS = [
  { value: "", label: "Any follow-up" },
  { value: "needs-follow-up", label: "Needs Follow-Up" }
] as const;

const FUTURE_ANALYTICS_FEATURES = [
  "30-day trends",
  "Lead tracking",
  "Advanced analytics",
  "Team analytics"
] as const;

const FREE_ACTIVE_CUSTOM_LINK_LIMIT = 5;

const CUSTOM_LINK_TYPE_LABELS: Record<CircleCardLinkType, string> = {
  GENERAL: "General",
  BOOK_CALL: "Book a call",
  PORTFOLIO: "Portfolio",
  LATEST_OFFER: "Latest offer",
  COMMUNITY: "Community",
  DOWNLOAD: "Download",
  REVIEW: "Review",
  SHOP: "Shop",
  MENU: "Menu",
  CASE_STUDY: "Case study"
};

const CUSTOM_LINK_EXAMPLES = [
  "Book a call",
  "View portfolio",
  "Latest offer",
  "Join my community",
  "Download brochure",
  "Leave a review",
  "Shop",
  "Menu",
  "Case studies"
] as const;

type WalletView = (typeof WALLET_VIEW_OPTIONS)[number]["value"];
type IntroductionView = (typeof INTRODUCTION_VIEW_OPTIONS)[number]["value"];
type ReferralView = (typeof REFERRAL_VIEW_OPTIONS)[number]["value"];
type WalletFollowUpFilter = (typeof WALLET_FOLLOW_UP_FILTER_OPTIONS)[number]["value"];

const ACTIVITY_FEED_PAGE_SIZE = 25;
const ACTIVITY_FEED_MAX_ITEMS = 100;

function resolveWalletView(value: string | undefined): WalletView {
  return value === "connected" ||
    value === "favourites" ||
    value === "recommended" ||
    value === "requests" ||
    value === "recent"
    ? value
    : "all";
}

function resolveWalletFollowUpFilter(value: string | undefined): WalletFollowUpFilter {
  return value === "needs-follow-up" ? value : "";
}

function resolveIntroductionView(value: string | undefined): IntroductionView {
  return value === "outgoing" || value === "completed" ? value : "incoming";
}

function resolveReferralView(value: string | undefined): ReferralView {
  return value === "received" || value === "won" || value === "lost" ? value : "sent";
}

function resolveActivityLimit(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= ACTIVITY_FEED_PAGE_SIZE) {
    return ACTIVITY_FEED_PAGE_SIZE;
  }

  return Math.min(ACTIVITY_FEED_MAX_ITEMS, parsed);
}

function buildIntroductionHref(input: { introductionView?: IntroductionView }) {
  const params = new URLSearchParams();
  params.set("section", "network");

  if (input.introductionView && input.introductionView !== "incoming") {
    params.set("introductionView", input.introductionView);
  }

  const query = params.toString();
  return `/dashboard/circle-card?${query}#introductions`;
}

function buildReferralHref(input: { referralView?: ReferralView }) {
  const params = new URLSearchParams();
  params.set("section", "business");

  if (input.referralView && input.referralView !== "sent") {
    params.set("referralView", input.referralView);
  }

  const query = params.toString();
  return `/dashboard/circle-card?${query}#referrals`;
}

function buildOpportunityHref() {
  return circleCardSectionHref("business", "opportunities");
}

function buildActivityFeedHref(input: {
  activityFilter?: CircleCardActivityFilter;
  activityLimit?: number;
}) {
  const params = new URLSearchParams();
  params.set("section", "network");

  if (input.activityFilter && input.activityFilter !== "all") {
    params.set("activityFilter", input.activityFilter);
  }

  if (input.activityLimit && input.activityLimit > ACTIVITY_FEED_PAGE_SIZE) {
    params.set("activityLimit", String(Math.min(input.activityLimit, ACTIVITY_FEED_MAX_ITEMS)));
  }

  const query = params.toString();
  return `/dashboard/circle-card?${query}#activity`;
}

function buildWalletHref(input: {
  walletQuery?: string;
  walletView?: WalletView;
  walletCategory?: string;
  walletFollowUp?: WalletFollowUpFilter;
  contactId?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("section", "network");

  if (input.walletQuery) {
    params.set("walletQuery", input.walletQuery);
  }

  if (input.walletView && input.walletView !== "all") {
    params.set("walletView", input.walletView);
  }

  if (input.walletCategory) {
    params.set("walletCategory", input.walletCategory);
  }

  if (input.walletFollowUp) {
    params.set("walletFollowUp", input.walletFollowUp);
  }

  if (input.contactId) {
    params.set("contactId", input.contactId);
  }

  const query = params.toString();
  return query ? `/dashboard/circle-card?${query}` : "/dashboard/circle-card";
}

function buildDiscoverHref(input: {
  discoverQuery?: string;
  discoverCategory?: string;
  discoverLocation?: string;
  discoverRecommended?: boolean;
  discoverBcn?: boolean;
}) {
  const params = new URLSearchParams();
  params.set("section", "network");

  if (input.discoverQuery) {
    params.set("discoverQuery", input.discoverQuery);
  }

  if (input.discoverCategory) {
    params.set("discoverCategory", input.discoverCategory);
  }

  if (input.discoverLocation) {
    params.set("discoverLocation", input.discoverLocation);
  }

  if (input.discoverRecommended) {
    params.set("discoverRecommended", "1");
  }

  if (input.discoverBcn) {
    params.set("discoverBcn", "1");
  }

  const query = params.toString();
  return `/dashboard/circle-card?${query}#discover`;
}

function walletContactMatchesQuery(input: {
  query: string;
  card: {
    fullName: string;
    businessName: string | null;
    role: string | null;
    tagline: string | null;
    location: string | null;
    email?: string | null;
    phone?: string | null;
    websiteUrl?: string | null;
    address?: string | null;
  };
  notes: string | null;
  metAt: string | null;
  category: string | null;
  tags: string[];
}) {
  if (!input.query) {
    return true;
  }

  const haystack = [
    input.card.fullName,
    input.card.businessName,
    input.card.role,
    input.card.tagline,
    input.card.location,
    input.card.email,
    input.card.phone,
    input.card.websiteUrl,
    input.card.address,
    input.notes,
    input.metAt,
    input.category,
    ...input.tags
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(input.query.toLowerCase());
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

function formatTimeAgo(value: Date | string) {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 14) {
    return `${days}d ago`;
  }

  return formatRelationshipDate(value);
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
    return {
      label: "Overdue",
      className: "border-red-500/36 bg-red-500/12 text-red-200",
      isDue: true
    };
  }

  if (followUpUtc === todayUtc) {
    return {
      label: "Needs Follow-Up",
      className: "border-amber-500/40 bg-amber-500/12 text-amber-200",
      isDue: true
    };
  }

  return {
    label: "Upcoming",
    className: "border-silver/18 bg-silver/10 text-silver",
    isDue: false
  };
}

function walletContactSourceLabel(source: string) {
  if (source === "BUSINESS_CARD_SCAN") {
    return "Scanned Business Card";
  }

  if (source === "LINK_IMPORT") {
    return "Link Import";
  }

  if (source === "MANUAL") {
    return "Manual";
  }

  return "Circle Card";
}

function activityBarWidth(value: number, maxValue: number) {
  if (value <= 0) {
    return "0%";
  }

  return `${Math.max(8, Math.round((value / Math.max(maxValue, 1)) * 100))}%`;
}

function readActivityDetail(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const label = record.label;

  if (typeof label === "string" && label.trim()) {
    return label.trim();
  }

  const method = record.method;
  return typeof method === "string" ? method.replace(/_/g, " ") : null;
}

function resolveCustomLinkType(value: string | null | undefined): CircleCardLinkType {
  return value && value in CUSTOM_LINK_TYPE_LABELS ? (value as CircleCardLinkType) : "GENERAL";
}

function customLinkTypeLabel(type: string | null | undefined) {
  return CUSTOM_LINK_TYPE_LABELS[resolveCustomLinkType(type)];
}

function displayCustomLinkUrl(value: string | null | undefined) {
  if (!value) {
    return "Uploaded file";
  }

  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

function formatReferralValue(value: { toString(): string } | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const amount = Number(value.toString());
  return Number.isFinite(amount) ? formatCurrency(amount) : null;
}

function moneyToNumber(value: { toString(): string } | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const amount = Number(value.toString());
  return Number.isFinite(amount) ? amount : 0;
}

function formatOpportunityValue(
  value: { toString(): string } | string | number | null | undefined,
  currency = "GBP"
) {
  if (value === null || value === undefined) {
    return "Value not set";
  }

  const amount = moneyToNumber(value);

  if (!Number.isFinite(amount)) {
    return "Value not set";
  }

  try {
    return formatCurrency(amount, currency);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatOpportunityTotals(
  opportunities: Array<{
    potentialValue: { toString(): string } | string | number | null;
    currency: string;
  }>
) {
  const totals = new Map<string, number>();

  opportunities.forEach((opportunity) => {
    const amount = moneyToNumber(opportunity.potentialValue);

    if (amount > 0) {
      totals.set(opportunity.currency, (totals.get(opportunity.currency) ?? 0) + amount);
    }
  });

  if (!totals.size) {
    return formatCurrency(0);
  }

  return Array.from(totals.entries())
    .map(([currency, amount]) => formatOpportunityValue(amount, currency))
    .join(" + ");
}

function getOpportunityFollowUpStatus(
  followUpDate: Date | string | null | undefined,
  todayUtc: number
) {
  if (!followUpDate) {
    return null;
  }

  const followUpUtc = utcDateNumber(followUpDate);

  if (followUpUtc < todayUtc) {
    return {
      label: "Overdue",
      className: "border-red-500/36 bg-red-500/12 text-red-200"
    };
  }

  if (followUpUtc === todayUtc) {
    return {
      label: "Follow-Up Due",
      className: "border-amber-500/40 bg-amber-500/12 text-amber-200"
    };
  }

  return null;
}

function referralContactLabel(referral: {
  referredContactName: string;
  referredContactBusiness: string | null;
}) {
  return [referral.referredContactName, referral.referredContactBusiness].filter(Boolean).join(" / ");
}

function referralRecipientLabel(referral: {
  recipientCard: {
    fullName: string;
    businessName: string | null;
  } | null;
}) {
  if (!referral.recipientCard) {
    return "Manual/private recipient";
  }

  return [referral.recipientCard.fullName, referral.recipientCard.businessName]
    .filter(Boolean)
    .join(" / ");
}

function opportunityContactLabel(opportunity: {
  walletContact: {
    fullName: string | null;
    businessName: string | null;
    role: string | null;
    card: {
      fullName: string;
      businessName: string | null;
      role: string | null;
    } | null;
  } | null;
}) {
  if (!opportunity.walletContact) {
    return "No contact linked";
  }

  const contactName =
    opportunity.walletContact.card?.fullName ??
    opportunity.walletContact.fullName ??
    opportunity.walletContact.businessName ??
    "Wallet contact";
  const contactBusiness =
    opportunity.walletContact.card?.businessName ??
    opportunity.walletContact.businessName ??
    opportunity.walletContact.card?.role ??
    opportunity.walletContact.role;

  return [contactName, contactBusiness].filter(Boolean).join(" / ");
}

function CustomLinkIcon({ icon, type }: { icon: string | null | undefined; type?: string | null }) {
  switch (resolveCustomLinkType(type)) {
    case "BOOK_CALL":
      return <CalendarDays size={16} />;
    case "PORTFOLIO":
      return <ContactRound size={16} />;
    case "LATEST_OFFER":
      return <Crown size={16} />;
    case "COMMUNITY":
      return <WalletCards size={16} />;
    case "DOWNLOAD":
      return <Download size={16} />;
    case "REVIEW":
      return <Star size={16} />;
    case "SHOP":
      return <ShoppingBag size={16} />;
    case "MENU":
      return <MenuIcon size={16} />;
    case "CASE_STUDY":
      return <BookOpen size={16} />;
    default:
      break;
  }

  switch (icon) {
    case "calendar":
      return <CalendarDays size={16} />;
    case "download":
      return <Download size={16} />;
    case "review":
      return <Star size={16} />;
    case "shop":
      return <ShoppingBag size={16} />;
    case "menu":
      return <MenuIcon size={16} />;
    case "case-studies":
      return <BookOpen size={16} />;
    case "offer":
      return <Crown size={16} />;
    case "portfolio":
      return <ContactRound size={16} />;
    case "community":
      return <WalletCards size={16} />;
    default:
      return <LinkIcon size={16} />;
  }
}

function circleCardActivityIcon(type: string) {
  switch (type) {
    case "CARD_CREATED":
    case "CARD_UPDATED":
      return ContactRound;
    case "CONTACT_SAVED":
    case "CONTACT_UPDATED":
      return WalletCards;
    case "CONNECTION_REQUEST_SENT":
    case "CONNECTION_ACCEPTED":
      return MessageSquare;
    case "RECOMMENDATION_CREATED":
    case "RECOMMENDATION_RECEIVED":
      return Star;
    case "INTRODUCTION_CREATED":
    case "INTRODUCTION_ACCEPTED":
    case "INTRODUCTION_DECLINED":
    case "INTRODUCTION_COMPLETED":
      return UserCheck;
    case "REFERRAL_CREATED":
    case "REFERRAL_RECEIVED":
    case "REFERRAL_ACCEPTED":
    case "REFERRAL_WON":
    case "REFERRAL_LOST":
      return Handshake;
    case "OPPORTUNITY_CREATED":
    case "OPPORTUNITY_UPDATED":
    case "OPPORTUNITY_WON":
    case "OPPORTUNITY_LOST":
      return BarChart3;
    case "BUSINESS_CARD_SCANNED":
    case "BUSINESS_CARD_CONTACT_CREATED":
      return Camera;
    case "SMART_LINK_CLICKED":
      return MousePointerClick;
    case "PRIVATE_LINK_UNLOCKED":
      return Lock;
    default:
      return Activity;
  }
}

export default async function CircleCardDashboardPage({ searchParams }: PageProps) {
  const session = await requireCircleCardUser();
  const params = await searchParams;
  const activeSection = resolveCircleCardAppSection(firstValue(params.section));
  const notice = firstValue(params.notice);
  const created = firstValue(params.created) === "1";
  const error = firstValue(params.error);
  const walletQuery = (firstValue(params.walletQuery) ?? "").trim();
  const walletView = resolveWalletView(firstValue(params.walletView));
  const walletCategory = (firstValue(params.walletCategory) ?? "").trim();
  const walletFollowUp = resolveWalletFollowUpFilter(firstValue(params.walletFollowUp));
  const selectedContactId = firstValue(params.contactId);
  const connectCardSlug = resolveCircleCardLookupSlug(firstValue(params.connectCard));
  const discoverQuery = (firstValue(params.discoverQuery) ?? "").trim();
  const discoverCategory = (firstValue(params.discoverCategory) ?? "").trim();
  const discoverLocation = (firstValue(params.discoverLocation) ?? "").trim();
  const discoverRecommended = firstValue(params.discoverRecommended) === "1";
  const discoverBcn = firstValue(params.discoverBcn) === "1";
  const introductionView = resolveIntroductionView(firstValue(params.introductionView));
  const referralView = resolveReferralView(firstValue(params.referralView));
  const activityFilter = resolveCircleCardActivityFilter(firstValue(params.activityFilter));
  const activityLimit = resolveActivityLimit(firstValue(params.activityLimit));
  const activityTypes =
    activityFilter === "all" ? null : CIRCLE_CARD_ACTIVITY_FILTER_TYPE_MAP[activityFilter];
  await createDueOpportunityNotificationsForUser(session.user.id);
  const [
    card,
    cardCount,
    member,
    walletContacts,
    connectionRequests,
    connectHubCard,
    discoverCandidateCards,
    introductions,
    referrals,
    opportunities,
    notifications,
    unreadNotificationCount,
    activityItems
  ] = await Promise.all([
    prisma.circleCard.findFirst({
      where: { userId: session.user.id },
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
      include: {
        customLinks: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }
      }
    }),
    prisma.circleCard.count({
      where: { userId: session.user.id }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        profile: {
          select: {
            headline: true,
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
        claimToken: true,
        claimTokenGeneratedAt: true,
        notes: true,
        metAt: true,
        followUpDate: true,
        lastInteractionDate: true,
        category: true,
        tags: true,
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
            updatedAt: true,
            recommendedCardId: true,
            walletContactId: true
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
        message: true,
        createdAt: true,
        respondedAt: true,
        requesterCard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true,
            role: true,
            profileImageUrl: true,
            isPublished: true
          }
        },
        recipientCard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true,
            role: true,
            profileImageUrl: true,
            isPublished: true
          }
        }
      }
    }),
    connectCardSlug
      ? prisma.circleCard.findFirst({
          where: {
            slug: connectCardSlug,
            isPublished: true,
            user: {
              suspended: false
            }
          },
          select: {
            id: true,
            slug: true,
            userId: true,
            fullName: true,
            businessName: true,
            role: true,
            tagline: true,
            location: true,
            profileImageUrl: true,
            businessLogoUrl: true
          }
        })
      : Promise.resolve(null),
    prisma.circleCard.findMany({
      where: {
        isPublished: true,
        userId: {
          not: session.user.id
        },
        user: {
          suspended: false,
          ...(discoverBcn
            ? {
                OR: [
                  { role: "ADMIN" },
                  {
                    subscription: {
                      is: {
                        status: {
                          in: ["ACTIVE", "TRIALING"]
                        }
                      }
                    }
                  }
                ]
              }
            : {})
        }
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 80,
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
        socialLinks: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            role: true,
            membershipTier: true,
            subscription: {
              select: {
                status: true
              }
            }
          }
        },
        recommendationsReceived: {
          where: {
            visibility: "PUBLIC",
            status: "ACTIVE",
            recommenderCard: {
              isPublished: true,
              user: {
                suspended: false
              }
            }
          },
          orderBy: [{ createdAt: "desc" }],
          take: 8,
          select: {
            id: true,
            category: true,
            reason: true,
            recommenderCardId: true,
            recommenderCard: {
              select: {
                id: true,
                slug: true,
                fullName: true,
                businessName: true,
                role: true
              }
            }
          }
        }
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
      take: 80,
      select: {
        id: true,
        introducerUserId: true,
        introducerCardId: true,
        personAUserId: true,
        personACardId: true,
        personBUserId: true,
        personBCardId: true,
        reason: true,
        status: true,
        personAAcceptedAt: true,
        personBAcceptedAt: true,
        createdAt: true,
        updatedAt: true,
        respondedAt: true,
        introducerCard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true,
            role: true,
            profileImageUrl: true
          }
        },
        personACard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true,
            role: true,
            profileImageUrl: true
          }
        },
        personBCard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true,
            role: true,
            profileImageUrl: true
          }
        }
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
        referrerUserId: true,
        referrerCardId: true,
        recipientUserId: true,
        recipientCardId: true,
        referredContactName: true,
        referredContactBusiness: true,
        referredContactEmail: true,
        referredContactPhone: true,
        referredContactWebsite: true,
        reason: true,
        status: true,
        estimatedValue: true,
        actualValue: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        respondedAt: true,
        completedAt: true,
        referrerCard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true,
            role: true,
            profileImageUrl: true
          }
        },
        recipientCard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true,
            role: true,
            profileImageUrl: true
          }
        }
      }
    }),
    prisma.opportunity.findMany({
      where: { userId: session.user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        userId: true,
        circleCardId: true,
        walletContactId: true,
        title: true,
        description: true,
        status: true,
        potentialValue: true,
        currency: true,
        sourceType: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        lastActivityAt: true,
        nextFollowUpAt: true,
        notes: true,
        walletContact: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            role: true,
            card: {
              select: {
                id: true,
                slug: true,
                fullName: true,
                businessName: true,
                role: true
              }
            }
          }
        }
      }
    }),
    prisma.circleCardNotification.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take: 24,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        entityType: true,
        entityId: true,
        isRead: true,
        readAt: true,
        createdAt: true
      }
    }),
    prisma.circleCardNotification.count({
      where: {
        userId: session.user.id,
        isRead: false
      }
    }),
    prisma.circleCardActivity.findMany({
      where: {
        userId: session.user.id,
        ...(activityTypes ? { type: { in: [...activityTypes] } } : {})
      },
      orderBy: [{ createdAt: "desc" }],
      take: activityLimit + 1,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        entityType: true,
        entityId: true,
        createdAt: true
      }
    })
  ]);
  const normalizedWalletContacts = walletContacts.map((contact) => {
    const socialLinks = readCircleWalletBusinessCardSocialLinks(contact.socialLinks);
    const fullName =
      contact.card?.fullName ??
      contact.fullName ??
      contact.businessName ??
      contact.email ??
      "Scanned contact";
    const display = {
      fullName,
      businessName: contact.card?.businessName ?? contact.businessName,
      role: contact.card?.role ?? contact.role,
      tagline: contact.card?.tagline ?? null,
      location: contact.card?.location ?? null,
      address: contact.address,
      profileImageUrl: contact.card?.profileImageUrl ?? null,
      businessLogoUrl: contact.card?.businessLogoUrl ?? null,
      websiteUrl: contact.card?.websiteUrl ?? contact.websiteUrl,
      email: contact.card?.email ?? contact.email,
      phone: contact.card?.phone ?? contact.mobilePhone ?? contact.phone,
      isPublished: contact.card?.isPublished ?? false,
      publicCardHref: contact.card?.slug ? `/card/${contact.card.slug}` : null,
      sourceLabel: walletContactSourceLabel(contact.source),
      isScannedBusinessCard: contact.source === "BUSINESS_CARD_SCAN"
    };

    return {
      ...contact,
      tags: readCircleWalletTags(contact.tags),
      socialLinks,
      display
    };
  });
  const pendingIncomingRequests = connectionRequests.filter(
    (request) => request.status === "PENDING" && request.recipientId === session.user.id
  );
  const pendingOutgoingRequests = connectionRequests.filter(
    (request) => request.status === "PENDING" && request.requesterId === session.user.id
  );
  const acceptedConnectionRequests = connectionRequests.filter(
    (request) => request.status === "ACCEPTED"
  );
  const recentAcceptedRequests = acceptedConnectionRequests
    .filter((request) => request.respondedAt)
    .sort((a, b) => Number(b.respondedAt) - Number(a.respondedAt))
    .slice(0, 4);
  const recentDeclinedRequests = connectionRequests
    .filter((request) => request.status === "DECLINED" && request.respondedAt)
    .sort((a, b) => Number(b.respondedAt) - Number(a.respondedAt))
    .slice(0, 4);
  function otherConnectionCard(request: (typeof connectionRequests)[number]) {
    return request.requesterId === session.user.id ? request.recipientCard : request.requesterCard;
  }
  const pendingOutgoingByCardId = new Map(
    pendingOutgoingRequests.map((request) => [request.recipientCardId, request])
  );
  const pendingIncomingByCardId = new Map(
    pendingIncomingRequests.map((request) => [request.requesterCardId, request])
  );
  const connectedByCardId = new Map(
    acceptedConnectionRequests.map((request) => [otherConnectionCard(request).id, request])
  );
  function walletConnectionState(cardId: string) {
    const connected = connectedByCardId.get(cardId);

    if (connected) {
      return { kind: "connected" as const, request: connected };
    }

    const incoming = pendingIncomingByCardId.get(cardId);

    if (incoming) {
      return { kind: "pending_incoming" as const, request: incoming };
    }

    const outgoing = pendingOutgoingByCardId.get(cardId);

    if (outgoing) {
      return { kind: "pending_outgoing" as const, request: outgoing };
    }

    return { kind: "none" as const, request: null };
  }

  const todayUtc = utcDateNumber(new Date());
  const savedContactCount = normalizedWalletContacts.length;
  const connectedWalletContacts = normalizedWalletContacts.filter((contact) =>
    contact.card?.id ? connectedByCardId.has(contact.card.id) : false
  );
  const favouriteWalletContacts = normalizedWalletContacts.filter((contact) => contact.favourite);
  const recommendedWalletContacts = normalizedWalletContacts.filter(
    (contact) => contact.recommendations.length > 0
  );
  const recentWalletContacts = normalizedWalletContacts.slice(0, 4);
  const needsFollowUpWalletContacts = normalizedWalletContacts.filter((contact) => {
    const status = getFollowUpStatus(contact.followUpDate, todayUtc);
    return Boolean(status?.isDue);
  });
  const upcomingFollowUpWalletContacts = normalizedWalletContacts.filter((contact) => {
    const status = getFollowUpStatus(contact.followUpDate, todayUtc);
    return status ? !status.isDue : false;
  });
  const walletCategoryOptions = Array.from(
    new Set(
      [
        ...CIRCLE_WALLET_CATEGORY_OPTIONS,
        ...normalizedWalletContacts.map((contact) => contact.category),
        walletCategory
      ].filter((category): category is string => Boolean(category?.trim()))
    )
  );
  const searchedWalletContacts = normalizedWalletContacts.filter((contact) =>
    walletContactMatchesQuery({
      query: walletQuery,
      card: contact.display,
      notes: contact.notes,
      metAt: contact.metAt,
      category: contact.category,
      tags: contact.tags
    })
  );
  const filteredWalletContacts = searchedWalletContacts.filter((contact) => {
    const categoryMatches =
      !walletCategory || contact.category?.toLowerCase() === walletCategory.toLowerCase();
    const followUpMatches =
      walletFollowUp !== "needs-follow-up" ||
      Boolean(getFollowUpStatus(contact.followUpDate, todayUtc)?.isDue);

    if (!categoryMatches || !followUpMatches) {
      return false;
    }

    if (walletView === "connected") {
      return contact.card?.id ? connectedByCardId.has(contact.card.id) : false;
    }

    if (walletView === "favourites") {
      return contact.favourite;
    }

    if (walletView === "recommended") {
      return contact.recommendations.length > 0;
    }

    if (walletView === "requests") {
      return false;
    }

    return true;
  });
  const visibleWalletContacts =
    walletView === "recent" ? filteredWalletContacts.slice(0, 8) : filteredWalletContacts;
  const selectedWalletContact =
    normalizedWalletContacts.find((contact) => contact.id === selectedContactId) ??
    visibleWalletContacts[0] ??
    normalizedWalletContacts[0] ??
    null;
  const selectedWalletConnection = selectedWalletContact
    ? selectedWalletContact.card?.id
      ? walletConnectionState(selectedWalletContact.card.id)
      : null
    : null;
  const selectedWalletRecommendation =
    selectedWalletContact?.recommendations.find((recommendation) => recommendation.status === "ACTIVE") ??
    selectedWalletContact?.recommendations[0] ??
    null;
  const selectedRecommendationCategory =
    selectedWalletRecommendation?.category &&
    CIRCLE_CARD_RECOMMENDATION_CATEGORIES.includes(
      selectedWalletRecommendation.category as (typeof CIRCLE_CARD_RECOMMENDATION_CATEGORIES)[number]
    )
      ? selectedWalletRecommendation.category
      : "Other";
  const selectedRecommendationVisibility =
    selectedWalletRecommendation?.visibility === "PUBLIC" && selectedWalletContact?.card?.id
      ? "PUBLIC"
      : "PRIVATE";
  const selectedFollowUpStatus = selectedWalletContact
    ? getFollowUpStatus(selectedWalletContact.followUpDate, todayUtc)
    : null;
  const selectedClaimLink = selectedWalletContact?.claimToken
    ? absoluteUrl(`/register?source=circle-card&claim=${selectedWalletContact.claimToken}`)
    : null;
  const walletReturnPath = buildWalletHref({
    walletQuery,
    walletView,
    walletCategory,
    walletFollowUp,
    contactId: selectedWalletContact?.id ?? null
  });
  const walletViewCounts: Record<WalletView, number> = {
    all: savedContactCount,
    connected: connectedWalletContacts.length,
    favourites: favouriteWalletContacts.length,
    recommended: recommendedWalletContacts.length,
    requests: pendingIncomingRequests.length + pendingOutgoingRequests.length,
    recent: Math.min(savedContactCount, 8)
  };
  const activeWalletFilters = Boolean(walletQuery || walletCategory || walletFollowUp);
  const connectHubSavedContact = connectHubCard
    ? normalizedWalletContacts.find((contact) => contact.card?.id === connectHubCard.id) ?? null
    : null;
  const connectHubConnectionState = connectHubCard ? walletConnectionState(connectHubCard.id) : null;
  const connectHubOwnCard = Boolean(connectHubCard && connectHubCard.userId === session.user.id);
  const connectHubReturnPath = connectHubCard
    ? `/dashboard/circle-card?section=network&connectCard=${encodeURIComponent(connectHubCard.slug)}#connect-hub`
    : circleCardSectionHref("network", "connect-hub");
  const discoverReturnPath = buildDiscoverHref({
    discoverQuery,
    discoverCategory,
    discoverLocation,
    discoverRecommended,
    discoverBcn
  });
  const discoverHasFilters = Boolean(
    discoverQuery || discoverCategory || discoverLocation || discoverRecommended || discoverBcn
  );
  const discoverCategoryOptions = Array.from(
    new Set([...CIRCLE_CARD_RECOMMENDATION_CATEGORIES, ...CIRCLE_WALLET_CATEGORY_OPTIONS])
  );
  const savedContactByCardId = new Map(
    normalizedWalletContacts
      .filter((contact) => Boolean(contact.card?.id))
      .map((contact) => [contact.card?.id ?? "", contact])
  );
  const discoverQueryLower = discoverQuery.toLowerCase();
  const discoverLocationLower = discoverLocation.toLowerCase();
  const discoverCards = discoverCandidateCards
    .map((candidate) => {
      const candidateSocialLinks = readCircleCardSocialLinks(candidate.socialLinks);
      const recommendations = candidate.recommendationsReceived;
      const recommendedByKnown = recommendations.filter((recommendation) =>
        connectedByCardId.has(recommendation.recommenderCardId)
      );
      const recommendationCategories = recommendations.map((recommendation) => recommendation.category);
      const recommendationCategoryLabels = Array.from(new Set(recommendationCategories)).slice(0, 3);
      const knownRecommenderNames = Array.from(
        new Set(recommendedByKnown.map((recommendation) => recommendation.recommenderCard.fullName))
      ).slice(0, 3);
      const isBcnMember =
        candidate.user.role === "ADMIN" ||
        candidate.user.subscription?.status === "ACTIVE" ||
        candidate.user.subscription?.status === "TRIALING";
      const savedContact = savedContactByCardId.get(candidate.id) ?? null;
      const connectionState = walletConnectionState(candidate.id);
      const searchable = [
        candidate.fullName,
        candidate.businessName,
        candidate.role,
        candidate.tagline,
        candidate.location,
        ...Object.values(candidateSocialLinks),
        ...recommendationCategories,
        ...recommendations.map((recommendation) => recommendation.reason),
        ...recommendations.map((recommendation) => recommendation.recommenderCard.fullName),
        ...recommendations.map((recommendation) => recommendation.recommenderCard.businessName)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return {
        ...candidate,
        socialLinks: candidateSocialLinks,
        recommendationCount: recommendations.length,
        recommendationCategories,
        recommendationCategoryLabels,
        recommendedByKnown,
        knownRecommenderNames,
        isBcnMember,
        savedContact,
        connectionState,
        matchesSearch: !discoverQueryLower || searchable.includes(discoverQueryLower),
        matchesLocation:
          !discoverLocationLower || Boolean(candidate.location?.toLowerCase().includes(discoverLocationLower)),
        matchesCategory: !discoverCategory || recommendationCategories.includes(discoverCategory),
        matchesRecommended: !discoverRecommended || recommendations.length > 0
      };
    })
    .filter(
      (candidate) =>
        candidate.matchesSearch &&
        candidate.matchesLocation &&
        candidate.matchesCategory &&
        candidate.matchesRecommended
    )
    .slice(0, 24);
  const introductionReturnPath = buildIntroductionHref({ introductionView });
  const introductionOutgoingReturnPath = buildIntroductionHref({ introductionView: "outgoing" });
  const introductionActiveStatuses = new Set(["PENDING", "ACCEPTED"]);
  const introductionTerminalStatuses = new Set(["COMPLETED", "DECLINED", "CANCELLED"]);
  const incomingIntroductions = introductions.filter((introduction) => {
    const viewerIsPersonA = introduction.personAUserId === session.user.id;
    const viewerIsPersonB = introduction.personBUserId === session.user.id;
    const viewerAccepted = viewerIsPersonA
      ? introduction.personAAcceptedAt
      : viewerIsPersonB
        ? introduction.personBAcceptedAt
        : null;

    return (
      (viewerIsPersonA || viewerIsPersonB) &&
      introductionActiveStatuses.has(introduction.status) &&
      !viewerAccepted
    );
  });
  const outgoingIntroductions = introductions.filter(
    (introduction) =>
      introduction.introducerUserId === session.user.id &&
      introductionActiveStatuses.has(introduction.status)
  );
  const completedIntroductions = introductions.filter((introduction) => {
    const viewerIsPersonA = introduction.personAUserId === session.user.id;
    const viewerIsPersonB = introduction.personBUserId === session.user.id;
    const viewerAccepted = viewerIsPersonA
      ? introduction.personAAcceptedAt
      : viewerIsPersonB
        ? introduction.personBAcceptedAt
        : null;

    return (
      introductionTerminalStatuses.has(introduction.status) ||
      (introduction.status === "ACCEPTED" && Boolean(viewerAccepted))
    );
  });
  const introductionViewCounts: Record<IntroductionView, number> = {
    incoming: incomingIntroductions.length,
    outgoing: outgoingIntroductions.length,
    completed: completedIntroductions.length
  };
  const visibleIntroductions =
    introductionView === "outgoing"
      ? outgoingIntroductions
      : introductionView === "completed"
        ? completedIntroductions
        : incomingIntroductions;
  const introducibleWalletContacts = normalizedWalletContacts.filter(
    (contact) => contact.card?.id && contact.card.userId !== session.user.id
  );
  const selectedIntroductionOptions =
    selectedWalletContact?.card?.id
      ? introducibleWalletContacts.filter(
          (contact) =>
            contact.id !== selectedWalletContact.id &&
            contact.card?.id !== selectedWalletContact.card?.id
        )
      : [];
  const canIntroduceSelectedContact = Boolean(
    card && selectedWalletContact?.card?.id && selectedWalletContact.card.userId !== session.user.id
  );
  const referralReturnPath = buildReferralHref({ referralView });
  const referralSentReturnPath = buildReferralHref({ referralView: "sent" });
  const referralReceivedReturnPath = buildReferralHref({ referralView: "received" });
  const referralOpenStatuses = new Set<string>(CIRCLE_CARD_REFERRAL_OPEN_STATUSES);
  const sentReferrals = referrals.filter((referral) => referral.referrerUserId === session.user.id);
  const receivedReferrals = referrals.filter(
    (referral) =>
      referral.recipientUserId === session.user.id && referralOpenStatuses.has(referral.status)
  );
  const wonReferrals = referrals.filter((referral) => referral.status === "WON");
  const lostReferrals = referrals.filter((referral) => referral.status === "LOST");
  const referralViewCounts: Record<ReferralView, number> = {
    sent: sentReferrals.length,
    received: receivedReferrals.length,
    won: wonReferrals.length,
    lost: lostReferrals.length
  };
  const visibleReferrals =
    referralView === "received"
      ? receivedReferrals
      : referralView === "won"
        ? wonReferrals
        : referralView === "lost"
          ? lostReferrals
          : sentReferrals;
  const referrableWalletContacts = normalizedWalletContacts.filter(
    (contact) => contact.card?.id && contact.card.userId !== session.user.id
  );
  const referrableDiscoverCards = discoverCards.filter((candidate) => candidate.userId !== session.user.id);
  const canSendReferralToSelectedContact = Boolean(
    card && selectedWalletContact?.card?.id && selectedWalletContact.card.userId !== session.user.id
  );
  const opportunityReturnPath = buildOpportunityHref();
  const openOpportunities = opportunities.filter((opportunity) =>
    isCircleCardOpportunityOpenStatus(opportunity.status)
  );
  const wonOpportunities = opportunities.filter((opportunity) => opportunity.status === "WON");
  const lostOpportunities = opportunities.filter((opportunity) => opportunity.status === "LOST");
  const opportunitiesByStatus = CIRCLE_CARD_OPPORTUNITY_STATUSES.reduce(
    (accumulator, status) => {
      accumulator[status] = opportunities.filter((opportunity) => opportunity.status === status);
      return accumulator;
    },
    {} as Record<(typeof CIRCLE_CARD_OPPORTUNITY_STATUSES)[number], typeof opportunities>
  );
  const walletOpportunitiesByContactId = new Map<string, typeof opportunities>();
  opportunities.forEach((opportunity) => {
    if (!opportunity.walletContactId) {
      return;
    }

    walletOpportunitiesByContactId.set(opportunity.walletContactId, [
      ...(walletOpportunitiesByContactId.get(opportunity.walletContactId) ?? []),
      opportunity
    ]);
  });
  const selectedWalletOpportunities = selectedWalletContact
    ? walletOpportunitiesByContactId.get(selectedWalletContact.id) ?? []
    : [];
  const dueOpportunityFollowUps = openOpportunities.filter((opportunity) =>
    Boolean(getOpportunityFollowUpStatus(opportunity.nextFollowUpAt, todayUtc))
  );
  const followUpsDueCount = needsFollowUpWalletContacts.length + dueOpportunityFollowUps.length;
  const notificationReturnPath = circleCardSectionHref("network", "notifications");
  const visibleActivityItems = activityItems.slice(0, activityLimit);
  const hasMoreActivityItems = activityItems.length > activityLimit;
  const activeActivityFilterLabel =
    CIRCLE_CARD_ACTIVITY_FILTER_OPTIONS.find((option) => option.value === activityFilter)?.label ?? "All";
  const activityLoadMoreHref = buildActivityFeedHref({
    activityFilter,
    activityLimit: Math.min(activityLimit + ACTIVITY_FEED_PAGE_SIZE, ACTIVITY_FEED_MAX_ITEMS)
  });
  const connectHubRecentlyConnected = [...acceptedConnectionRequests]
    .sort((a, b) => Number(b.respondedAt ?? b.createdAt) - Number(a.respondedAt ?? a.createdAt))
    .map((request) => otherConnectionCard(request))
    .slice(0, 5);
  const connectHubLookupMissing = Boolean(connectCardSlug && !connectHubCard);
  const accessLevel = resolveCircleCardAccessLevel({
    role: session.user.role,
    membershipTier: session.user.membershipTier,
    hasActiveSubscription: session.user.hasActiveSubscription
  });
  const featureAccess = getCircleCardFeatureAccess(accessLevel);
  const accountLabel = getCircleCardAccountLabel({
    role: session.user.role,
    membershipTier: session.user.membershipTier,
    hasActiveSubscription: session.user.hasActiveSubscription,
    suspended: session.user.suspended
  });
  const isCircleCardFree = isCircleCardFreeAccount({
    role: session.user.role,
    hasActiveSubscription: session.user.hasActiveSubscription,
    suspended: session.user.suspended
  });
  const customLinks = card?.customLinks ?? [];
  const activeCustomLinkCount = customLinks.filter((link) => link.isActive).length;
  const customLinkLimitLabel = isCircleCardFree
    ? `${activeCustomLinkCount}/${FREE_ACTIVE_CUSTOM_LINK_LIMIT} active links`
    : `${activeCustomLinkCount} active links`;
  const freeActiveCustomLinkLimitReached =
    isCircleCardFree && activeCustomLinkCount >= FREE_ACTIVE_CUSTOM_LINK_LIMIT;
  const socialLinks = readCircleCardSocialLinks(card?.socialLinks ?? null);
  const publicUrl = card ? absoluteUrl(`/card/${card.slug}`) : null;
  const qrUrl = publicUrl ? buildCircleCardShareSourceUrl(publicUrl, "qr") : null;
  const nfcUrl = publicUrl ? buildCircleCardShareSourceUrl(publicUrl, "nfc") : null;
  const eventUrl = publicUrl ? buildCircleCardShareSourceUrl(publicUrl, "event") : null;
  const defaultWebsite =
    card?.websiteUrl ?? member?.profile?.website ?? member?.profile?.business?.website ?? "";
  const analytics = card
    ? await getCircleCardAnalyticsSummary({
        cardId: card.id,
        fallbackViewCount: card.viewCount
      })
    : null;
  const analyticsOverview = [
    {
      label: "Total Views",
      value: analytics?.counts.CARD_VIEW ?? card?.viewCount ?? 0,
      description: "Public card views",
      icon: Eye
    },
    {
      label: "Wallet Saves",
      value: analytics?.counts.WALLET_SAVE ?? 0,
      description: "People who saved this card",
      icon: WalletCards
    },
    {
      label: "Shares",
      value: analytics?.counts.SHARE ?? 0,
      description: "Native shares and copied links",
      icon: Share2
    },
    {
      label: "Link Clicks",
      value: analytics?.counts.CUSTOM_LINK_CLICK ?? 0,
      description: "Custom link hub clicks",
      icon: MousePointerClick
    },
    {
      label: "Contact Downloads",
      value: analytics?.counts.VCARD_DOWNLOAD ?? 0,
      description: "vCard downloads",
      icon: Download
    }
  ];
  const analyticsActivityMix = [
    { label: "QR views", value: analytics?.counts.QR_VIEW ?? 0 },
    { label: "Website clicks", value: analytics?.counts.WEBSITE_CLICK ?? 0 },
    { label: "Email clicks", value: analytics?.counts.EMAIL_CLICK ?? 0 },
    { label: "Phone clicks", value: analytics?.counts.PHONE_CLICK ?? 0 },
    { label: "Custom link clicks", value: analytics?.counts.CUSTOM_LINK_CLICK ?? 0 },
    { label: "Connect Hub shares", value: analytics?.counts.CONNECT_HUB_SHARE ?? 0 },
    { label: "Connect Hub copies", value: analytics?.counts.CONNECT_HUB_COPY_LINK ?? 0 },
    { label: "Card link resolves", value: analytics?.counts.CARD_LINK_RESOLVED ?? 0 },
    { label: "Business card scans", value: analytics?.counts.BUSINESS_CARD_SCANNED ?? 0 },
    { label: "Business card matches", value: analytics?.counts.BUSINESS_CARD_MATCH_FOUND ?? 0 },
    { label: "Scanned contacts", value: analytics?.counts.BUSINESS_CARD_CONTACT_CREATED ?? 0 },
    { label: "Claim links", value: analytics?.counts.CLAIM_LINK_GENERATED ?? 0 },
    { label: "Recommendations created", value: analytics?.counts.RECOMMENDATION_CREATED ?? 0 },
    { label: "Recommendations updated", value: analytics?.counts.RECOMMENDATION_UPDATED ?? 0 },
    { label: "Recommendations removed", value: analytics?.counts.RECOMMENDATION_REMOVED ?? 0 },
    { label: "Public recommendations viewed", value: analytics?.counts.PUBLIC_RECOMMENDATION_VIEWED ?? 0 },
    { label: "Discover searches", value: analytics?.counts.DISCOVER_SEARCH ?? 0 },
    { label: "Discover card views", value: analytics?.counts.DISCOVER_CARD_VIEWED ?? 0 },
    { label: "Discover saves", value: analytics?.counts.DISCOVER_CARD_SAVED ?? 0 },
    { label: "Discover connection requests", value: analytics?.counts.DISCOVER_CONNECTION_REQUEST_SENT ?? 0 },
    { label: "Introductions created", value: analytics?.counts.INTRODUCTION_CREATED ?? 0 },
    { label: "Introductions accepted", value: analytics?.counts.INTRODUCTION_ACCEPTED ?? 0 },
    { label: "Introductions declined", value: analytics?.counts.INTRODUCTION_DECLINED ?? 0 },
    { label: "Introductions completed", value: analytics?.counts.INTRODUCTION_COMPLETED ?? 0 },
    { label: "Referrals created", value: analytics?.counts.REFERRAL_CREATED ?? 0 },
    { label: "Referrals accepted", value: analytics?.counts.REFERRAL_ACCEPTED ?? 0 },
    { label: "Referrals declined", value: analytics?.counts.REFERRAL_DECLINED ?? 0 },
    { label: "Referrals won", value: analytics?.counts.REFERRAL_WON ?? 0 },
    { label: "Referrals lost", value: analytics?.counts.REFERRAL_LOST ?? 0 },
    { label: "Referrals cancelled", value: analytics?.counts.REFERRAL_CANCELLED ?? 0 },
    { label: "Opportunities created", value: analytics?.counts.OPPORTUNITY_CREATED ?? 0 },
    { label: "Opportunities updated", value: analytics?.counts.OPPORTUNITY_UPDATED ?? 0 },
    { label: "Opportunities won", value: analytics?.counts.OPPORTUNITY_WON ?? 0 },
    { label: "Opportunities lost", value: analytics?.counts.OPPORTUNITY_LOST ?? 0 },
    { label: "Opportunity follow-ups set", value: analytics?.counts.OPPORTUNITY_FOLLOWUP_SET ?? 0 },
    { label: "Notifications read", value: analytics?.counts.NOTIFICATION_READ ?? 0 },
    { label: "Notification mark-all reads", value: analytics?.counts.NOTIFICATION_MARK_ALL_READ ?? 0 },
    { label: "Wallet removes", value: analytics?.counts.WALLET_REMOVE ?? 0 }
  ];
  const appSectionItems: Array<{
    section: CircleCardAppSection;
    icon: typeof Activity;
    badge?: number;
  }> = [
    {
      section: "home",
      icon: Activity,
      badge: unreadNotificationCount + pendingIncomingRequests.length + followUpsDueCount
    },
    { section: "my-card", icon: ContactRound },
    {
      section: "network",
      icon: WalletCards,
      badge: pendingIncomingRequests.length + incomingIntroductions.length
    },
    {
      section: "business",
      icon: ShoppingBag,
      badge: receivedReferrals.length + dueOpportunityFollowUps.length
    },
    { section: "share", icon: QrCode },
    { section: "settings", icon: MenuIcon }
  ];
  const homeQuickStats = [
    {
      label: "Notifications",
      value: unreadNotificationCount,
      href: circleCardSectionHref("network", "notifications"),
      icon: Bell
    },
    {
      label: "Pending requests",
      value: pendingIncomingRequests.length,
      href: `${buildWalletHref({ walletView: "requests" })}#wallet`,
      icon: MessageSquare
    },
    {
      label: "Follow-ups due",
      value: followUpsDueCount,
      href: followUpsDueCount === dueOpportunityFollowUps.length
        ? circleCardSectionHref("business", "opportunities")
        : `${buildWalletHref({ walletFollowUp: "needs-follow-up" })}#wallet`,
      icon: CalendarDays
    },
    {
      label: "Public views",
      value: analytics?.counts.CARD_VIEW ?? card?.viewCount ?? 0,
      href: circleCardSectionHref("my-card", "analytics"),
      icon: Eye
    },
    {
      label: "Wallet contacts",
      value: savedContactCount,
      href: circleCardSectionHref("network", "wallet"),
      icon: WalletCards
    }
  ];
  const recentHomeActivity = visibleActivityItems.slice(0, 3);

  if (card && discoverHasFilters) {
    await trackCircleCardEvent({
      cardId: card.id,
      eventType: "DISCOVER_SEARCH",
      userId: session.user.id,
      metadata: {
        source: "discover",
        query: discoverQuery || null,
        category: discoverCategory || null,
        location: discoverLocation || null,
        recommendedOnly: discoverRecommended,
        bcnOnly: discoverBcn,
        resultCount: discoverCards.length
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="member-accent-panel rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--member-accent-border)/0.32)] bg-[hsl(var(--member-accent)/0.12)] px-3 py-1 text-xs uppercase tracking-[0.08em] text-[hsl(var(--member-accent-text))]">
              <ContactRound size={14} />
              My Circle Card
            </div>
            <h1 className="mt-4 font-display text-4xl text-foreground sm:text-5xl">
              Your relationship identity layer
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--member-accent-muted))] sm:text-base">
              Create a clean card, share it with a QR code, and give new contacts a direct route
              back to you and the Business Circle ecosystem.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={circleCardSectionHref("share", "share-assets-qr")}
                className={cn(buttonVariants(), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <QrCode size={16} />
                QR
              </Link>
              <Link
                href={circleCardSectionHref("my-card", "circle-card-form")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <ContactRound size={16} />
                {card ? "Edit Card" : "Create Card"}
              </Link>
              <Link
                href={circleCardSectionHref("network", "connect-hub")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <Share2 size={16} />
                Connect Hub
              </Link>
              <Link
                href={circleCardSectionHref("network", "discover")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <Compass size={16} />
                Discover
              </Link>
              <Link
                href={circleCardSectionHref("network", "introductions")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <UserCheck size={16} />
                Introductions
              </Link>
              <Link
                href={circleCardSectionHref("business", "referrals")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <Handshake size={16} />
                Referrals
              </Link>
              <Link
                href={circleCardSectionHref("business", "opportunities")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <ShoppingBag size={16} />
                Opportunities
              </Link>
              <Link
                href={circleCardSectionHref("network", "wallet")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <WalletCards size={16} />
                Wallet
              </Link>
              <Link
                href={circleCardSectionHref("my-card", "analytics")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <BarChart3 size={16} />
                Analytics
              </Link>
              {card ? (
                <Link
                  href={`/card/${card.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
                >
                  Public card
                  <ArrowUpRight size={16} />
                </Link>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{accountLabel}</Badge>
            <Badge variant="outline" className="border-silver/18 text-silver">
              {cardCount}/{featureAccess.cardLimit} active
            </Badge>
          </div>
        </div>
      </section>

      <nav
        aria-label="Circle Card sections"
        className="sticky top-0 z-20 -mx-2 overflow-x-auto border-y border-silver/12 bg-background/88 px-2 py-3 backdrop-blur-xl sm:rounded-2xl sm:border sm:bg-card/72"
      >
        <div className="flex min-w-max gap-2">
          {appSectionItems.map((item) => {
            const Icon = item.icon;
            const selected = activeSection === item.section;

            return (
              <Link
                key={item.section}
                href={circleCardSectionHref(item.section)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
                  selected
                    ? "border-gold/42 bg-gold/14 text-gold shadow-inner-surface"
                    : "border-silver/14 bg-background/25 text-muted hover:border-silver/30 hover:text-foreground"
                )}
              >
                <Icon size={16} />
                <span>{CIRCLE_CARD_APP_SECTION_LABELS[item.section]}</span>
                {item.badge ? (
                  <span className="rounded-full border border-gold/24 bg-gold/12 px-2 py-0.5 text-[11px] text-gold">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <CircleCardInstallPrompt />

      {isCircleCardFree ? <CircleCardBcnDiscoveryPanel /> : null}

      {created && card && publicUrl ? (
        <section className="rounded-2xl border border-gold/28 bg-gold/10 p-5 shadow-gold-soft sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                Circle Card published
              </p>
              <h2 className="mt-2 font-display text-3xl text-foreground">
                Your Circle Card is live.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Share your public card, copy the link, or open the QR panel whenever you are ready
                to use it.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
              <Link href={`/card/${card.slug}`} target="_blank" rel="noopener noreferrer">
                <Button type="button" className="w-full gap-2">
                  View Card
                  <ArrowUpRight size={16} />
                </Button>
              </Link>
              <CircleCardCopyLinkButton publicUrl={publicUrl} className="w-full" />
              <a
                href={circleCardSectionHref("share", "share-assets-qr")}
                className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
              >
                <QrCode size={16} />
                View QR
              </a>
              <CircleCardShareButton
                title={`${card.fullName} | Circle Card`}
                publicUrl={publicUrl}
                cardId={card.id}
                analyticsSource="dashboard_created"
                label="Share Card"
                hideStatus
              />
            </div>
          </div>
        </section>
      ) : null}

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

      <section className={cn("space-y-4", activeSection !== "home" && "hidden")}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <Card className="border-gold/22 bg-gold/8">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="inline-flex items-center gap-2">
                    <ContactRound size={18} className="text-gold" />
                    Circle Card Home
                  </CardTitle>
                  <CardDescription>
                    Quick actions and the signals that need attention today.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit border-gold/28 text-gold">
                  {card?.isPublished ? "Published" : card ? "Unpublished" : "Setup needed"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {card && publicUrl ? (
                <>
                  <Link href={`/card/${card.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button type="button" className="h-12 w-full gap-2">
                      <ArrowUpRight size={16} />
                      Public Card
                    </Button>
                  </Link>
                  <Link href={circleCardSectionHref("share", "share-assets-qr")}>
                    <Button type="button" variant="outline" className="h-12 w-full gap-2">
                      <QrCode size={16} />
                      My QR
                    </Button>
                  </Link>
                  <Link href={circleCardSectionHref("network", "business-card-scanner")}>
                    <Button type="button" variant="outline" className="h-12 w-full gap-2">
                      <Camera size={16} />
                      Scan
                    </Button>
                  </Link>
                  <CircleCardShareButton
                    title={`${card.fullName} | Circle Card`}
                    publicUrl={publicUrl}
                    cardId={card.id}
                    analyticsSource="dashboard_home"
                    label="Share"
                    hideStatus
                    buttonClassName="h-12"
                  />
                </>
              ) : (
                <Link href={circleCardSectionHref("my-card", "circle-card-form")} className="sm:col-span-2 xl:col-span-4">
                  <Button type="button" className="h-12 w-full gap-2">
                    <ContactRound size={16} />
                    Create your Circle Card
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Activity size={18} className="text-gold" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest Circle Card movement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentHomeActivity.length ? (
                recentHomeActivity.map((activityItem) => (
                  <Link
                    key={activityItem.id}
                    href={circleCardSectionHref("network", "activity")}
                    className="block rounded-2xl border border-silver/14 bg-background/20 p-3 hover:border-gold/24"
                  >
                    <p className="text-sm font-medium text-foreground">{activityItem.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{activityItem.message}</p>
                    <p className="mt-2 text-xs text-silver">{formatTimeAgo(activityItem.createdAt)}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                  Recent activity will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {homeQuickStats.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-2xl border border-silver/14 bg-card/54 p-4 transition-colors hover:border-gold/28 hover:bg-card/72"
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon size={17} className="text-gold" />
                  <Badge variant={item.value ? "outline" : "muted"} className={item.value ? "border-gold/28 text-gold" : ""}>
                    {item.value}
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{item.label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <CircleCardDashboardSection
        id="notifications"
        title="Notification Centre"
        summary="Recent Circle Card activity and relationship items that need attention"
        className={activeSection === "network" ? undefined : "hidden"}
        defaultOpen={unreadNotificationCount > 0}
        badge={
          <Badge variant="outline" className="border-gold/28 text-gold">
            {unreadNotificationCount} unread
          </Badge>
        }
      >
        <div className="space-y-5">
          <Card className="border-silver/16 bg-card/62">
            <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Recent notifications</p>
                <p className="mt-1 text-sm text-muted">
                  Relationship activity, pending responses, and due follow-ups appear here.
                </p>
              </div>
              <form action={markAllCircleCardNotificationsReadAction}>
                <input type="hidden" name="returnPath" value={notificationReturnPath} />
                <Button type="submit" variant="outline" className="w-full gap-2 sm:w-auto" disabled={!unreadNotificationCount}>
                  <CheckCircle2 size={16} />
                  Mark all as read
                </Button>
              </form>
            </CardContent>
          </Card>

          {notifications.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "border-silver/16 bg-card/62",
                    notification.isRead ? "opacity-72" : "border-gold/24 bg-gold/8"
                  )}
                >
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={notification.isRead ? "border-silver/18 text-silver" : "border-gold/28 text-gold"}
                          >
                            {circleCardNotificationTypeLabel(notification.type)}
                          </Badge>
                          {!notification.isRead ? (
                            <Badge variant="outline" className="border-gold/28 text-gold">
                              Unread
                            </Badge>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-foreground">{notification.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted">{notification.message}</p>
                      </div>
                      <p className="shrink-0 text-xs text-muted">{formatTimeAgo(notification.createdAt)}</p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <a
                        href={circleCardNotificationHref(notification.type)}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                      >
                        Open related section
                        <ArrowUpRight size={14} />
                      </a>
                      {!notification.isRead ? (
                        <form action={markCircleCardNotificationReadAction}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <input type="hidden" name="returnPath" value={notificationReturnPath} />
                          <Button type="submit" size="sm" className="w-full gap-2">
                            <CheckCircle2 size={14} />
                            Mark as read
                          </Button>
                        </form>
                      ) : (
                        <div className="flex min-h-9 items-center rounded-md border border-silver/12 px-3 text-xs text-muted">
                          Read{notification.readAt ? ` ${formatTimeAgo(notification.readAt)}` : ""}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-silver/18 bg-card/48">
              <CardContent className="py-10 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-silver/16 bg-background/24 text-silver">
                  <Bell size={20} />
                </div>
                <h3 className="mt-4 font-display text-2xl text-foreground">No notifications yet</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                  New connection requests, introductions, referrals and due opportunity follow-ups will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="activity"
        title="Activity Feed"
        summary="A relationship timeline for your Circle Card, wallet, referrals and opportunities"
        className={activeSection === "network" ? undefined : "hidden"}
        defaultOpen={visibleActivityItems.length > 0}
        badge={
          <Badge variant="outline" className="border-silver/18 text-silver">
            {activeActivityFilterLabel}
          </Badge>
        }
      >
        <div className="space-y-5">
          <Card className="border-silver/16 bg-card/62">
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Recent Activity</p>
                  <p className="mt-1 text-sm text-muted">
                    Showing the latest {Math.min(activityLimit, visibleActivityItems.length || activityLimit)} timeline
                    item{Math.min(activityLimit, visibleActivityItems.length || activityLimit) === 1 ? "" : "s"}.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-gold/24 text-gold">
                  {visibleActivityItems.length} shown
                </Badge>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {CIRCLE_CARD_ACTIVITY_FILTER_OPTIONS.map((option) => (
                  <Link
                    key={option.value}
                    href={buildActivityFeedHref({ activityFilter: option.value })}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      activityFilter === option.value
                        ? "border-gold/32 bg-gold/10 text-gold"
                        : "border-silver/14 bg-background/20 text-muted hover:border-silver/28 hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {visibleActivityItems.length ? (
            <div className="space-y-3">
              {visibleActivityItems.map((activityItem) => {
                const ActivityIcon = circleCardActivityIcon(activityItem.type);

                return (
                  <Card key={activityItem.id} className="border-silver/16 bg-card/62">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                      <div className="flex min-w-0 gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-silver/16 bg-background/24 text-silver">
                          <ActivityIcon size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-silver/18 text-silver">
                              {circleCardActivityTypeLabel(activityItem.type)}
                            </Badge>
                            <span className="text-xs text-muted">{formatTimeAgo(activityItem.createdAt)}</span>
                          </div>
                          <h3 className="mt-2 text-base font-semibold text-foreground">{activityItem.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted">{activityItem.message}</p>
                        </div>
                      </div>
                      <a
                        href={circleCardActivityHref(activityItem)}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-2")}
                      >
                        Open related
                        <ArrowUpRight size={14} />
                      </a>
                    </CardContent>
                  </Card>
                );
              })}

              {hasMoreActivityItems ? (
                <div className="flex justify-center pt-2">
                  <Link href={activityLoadMoreHref} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                    Load more
                    <ArrowDown size={16} />
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <Card className="border-dashed border-silver/18 bg-card/48">
              <CardContent className="py-10 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-silver/16 bg-background/24 text-silver">
                  <Activity size={20} />
                </div>
                <h3 className="mt-4 font-display text-2xl text-foreground">No activity yet</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                  Your Circle Card activity will appear here as you connect, save contacts, receive referrals and grow
                  your network.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="introductions"
        title="Introductions"
        summary="Introduce two people from your Circle Wallet and track private responses"
        className={activeSection === "network" ? undefined : "hidden"}
        defaultOpen={incomingIntroductions.length > 0}
        badge={
          <Badge variant="outline" className="border-gold/28 text-gold">
            {incomingIntroductions.length} incoming
          </Badge>
        }
      >
        <div className="space-y-5">
          <Card className="border-silver/16 bg-card/62">
            <CardContent className="space-y-4 pt-6 sm:pt-7">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {INTRODUCTION_VIEW_OPTIONS.map((option) => (
                  <Link
                    key={option.value}
                    href={buildIntroductionHref({ introductionView: option.value })}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      introductionView === option.value
                        ? "border-gold/32 bg-gold/10 text-gold"
                        : "border-silver/14 bg-background/20 text-muted hover:border-silver/28 hover:text-foreground"
                    )}
                  >
                    {option.label} ({introductionViewCounts[option.value]})
                  </Link>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-muted">
                Introductions are private dashboard activity. They are not shown on public Circle Cards.
              </p>
            </CardContent>
          </Card>

          {visibleIntroductions.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleIntroductions.map((introduction) => {
                const viewerIsPersonA = introduction.personAUserId === session.user.id;
                const viewerIsPersonB = introduction.personBUserId === session.user.id;
                const viewerAccepted = viewerIsPersonA
                  ? introduction.personAAcceptedAt
                  : viewerIsPersonB
                    ? introduction.personBAcceptedAt
                    : null;
                const otherCard = viewerIsPersonA ? introduction.personBCard : introduction.personACard;
                const acceptedCount =
                  Number(Boolean(introduction.personAAcceptedAt)) +
                  Number(Boolean(introduction.personBAcceptedAt));
                const statusLabel = circleCardIntroductionStatusLabel(introduction.status);
                const canRespond =
                  (viewerIsPersonA || viewerIsPersonB) &&
                  introductionActiveStatuses.has(introduction.status) &&
                  !viewerAccepted;
                const canCancel =
                  introduction.introducerUserId === session.user.id &&
                  introductionActiveStatuses.has(introduction.status);

                return (
                  <Card key={introduction.id} className="border-silver/16 bg-card/62">
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                introduction.status === "COMPLETED"
                                  ? "border-gold/25 text-gold"
                                  : "border-silver/18 text-silver"
                              }
                            >
                              {statusLabel}
                            </Badge>
                            {acceptedCount ? (
                              <Badge variant="outline" className="border-gold/20 text-gold">
                                {acceptedCount}/2 accepted
                              </Badge>
                            ) : null}
                          </div>
                          {introductionView === "incoming" ? (
                            <>
                              <h3 className="mt-3 text-base font-semibold text-foreground">
                                Introduced by {introduction.introducerCard.fullName}
                              </h3>
                              <p className="mt-1 text-sm text-silver">
                                With {otherCard.fullName}
                                {otherCard.businessName ? `, ${otherCard.businessName}` : ""}
                              </p>
                            </>
                          ) : (
                            <>
                              <h3 className="mt-3 text-base font-semibold text-foreground">
                                {introduction.personACard.fullName} <span className="text-muted">{"<->"}</span>{" "}
                                {introduction.personBCard.fullName}
                              </h3>
                              <p className="mt-1 text-sm text-silver">
                                Introduced by {introduction.introducerCard.fullName}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex -space-x-2">
                          {[introduction.personACard, introduction.personBCard].map((introCard) => (
                            <div
                              key={introCard.id}
                              className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-background bg-card text-xs font-semibold text-foreground shadow-inner-surface"
                              title={introCard.fullName}
                            >
                              {introCard.profileImageUrl ? (
                                <img
                                  src={introCard.profileImageUrl}
                                  alt={introCard.fullName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                introCard.fullName.slice(0, 2).toUpperCase()
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-silver">Reason</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          &ldquo;{introduction.reason}&rdquo;
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Link
                          href={`/card/${introduction.personACard.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
                        >
                          {introduction.personACard.fullName}
                          <ArrowUpRight size={16} />
                        </Link>
                        <Link
                          href={`/card/${introduction.personBCard.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
                        >
                          {introduction.personBCard.fullName}
                          <ArrowUpRight size={16} />
                        </Link>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {[introduction.personACard, introduction.personBCard].map((introCard) => {
                          const introWalletContact = savedContactByCardId.get(introCard.id);

                          return (
                            <form key={introCard.id} action={createCircleCardOpportunityAction}>
                              <input type="hidden" name="returnPath" value={opportunityReturnPath} />
                              <input
                                type="hidden"
                                name="walletContactId"
                                value={introWalletContact?.id ?? ""}
                              />
                              <input
                                type="hidden"
                                name="title"
                                value={`Opportunity with ${introCard.fullName}`}
                              />
                              <input type="hidden" name="description" value={introduction.reason} />
                              <input type="hidden" name="sourceType" value="INTRODUCTION" />
                              <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                                <ShoppingBag size={14} />
                                Create Opportunity
                              </Button>
                            </form>
                          );
                        })}
                      </div>

                      {canRespond ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <form action={acceptCircleCardIntroductionAction}>
                            <input type="hidden" name="introductionId" value={introduction.id} />
                            <input type="hidden" name="returnPath" value={introductionReturnPath} />
                            <Button type="submit" className="w-full gap-2">
                              <UserCheck size={16} />
                              Accept
                            </Button>
                          </form>
                          <form action={declineCircleCardIntroductionAction}>
                            <input type="hidden" name="introductionId" value={introduction.id} />
                            <input type="hidden" name="returnPath" value={introductionReturnPath} />
                            <Button type="submit" variant="outline" className="w-full gap-2">
                              <UserX size={16} />
                              Decline
                            </Button>
                          </form>
                        </div>
                      ) : null}

                      {canCancel ? (
                        <form action={cancelCircleCardIntroductionAction}>
                          <input type="hidden" name="introductionId" value={introduction.id} />
                          <input type="hidden" name="returnPath" value={introductionOutgoingReturnPath} />
                          <Button type="submit" variant="outline" className="w-full gap-2">
                            <XCircle size={16} />
                            Cancel Introduction
                          </Button>
                        </form>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-silver/18 bg-card/48">
              <CardContent className="py-10 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-silver/16 bg-background/24 text-silver">
                  <UserCheck size={20} />
                </div>
                <h3 className="mt-4 font-display text-2xl text-foreground">
                  No introductions here yet
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                  Use the Introduce panel inside a wallet contact to connect two saved Circle Card contacts.
                </p>
                <Link href={circleCardSectionHref("network", "wallet")} className={cn(buttonVariants({ variant: "outline" }), "mt-5 gap-2")}>
                  <WalletCards size={16} />
                  Open Wallet
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="opportunities"
        title="Opportunity Pipeline"
        summary="Track real business opportunities created through relationships and Circle Card activity"
        className={activeSection === "business" ? undefined : "hidden"}
        defaultOpen={openOpportunities.length > 0}
        badge={
          <span className="inline-flex gap-2">
            <Badge variant="outline" className="border-gold/28 text-gold">
              {openOpportunities.length} open
            </Badge>
            <Badge variant="muted">{wonOpportunities.length} won</Badge>
          </span>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="border-silver/16 bg-card/62">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-silver">Open Opportunities</p>
                <p className="mt-2 font-display text-3xl text-foreground">{openOpportunities.length}</p>
              </CardContent>
            </Card>
            <Card className="border-silver/16 bg-card/62">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-silver">Won Opportunities</p>
                <p className="mt-2 font-display text-3xl text-foreground">{wonOpportunities.length}</p>
              </CardContent>
            </Card>
            <Card className="border-silver/16 bg-card/62">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-silver">Lost Opportunities</p>
                <p className="mt-2 font-display text-3xl text-foreground">{lostOpportunities.length}</p>
              </CardContent>
            </Card>
            <Card className="border-gold/18 bg-gold/8 lg:col-span-1">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-gold">Pipeline Value</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatOpportunityTotals(openOpportunities)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-gold/18 bg-gold/8 lg:col-span-1">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-gold">Won Value</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatOpportunityTotals(wonOpportunities)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-lg">
                <ShoppingBag size={18} className="text-gold" />
                Create Opportunity
              </CardTitle>
              <CardDescription>Add a new opportunity manually or link it to a saved wallet contact.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createCircleCardOpportunityAction} className="grid gap-4 xl:grid-cols-2">
                <input type="hidden" name="returnPath" value={opportunityReturnPath} />
                <div className="space-y-2">
                  <Label htmlFor="opportunity-title">Title</Label>
                  <Input
                    id="opportunity-title"
                    name="title"
                    maxLength={160}
                    required
                    placeholder="Website redesign for Sarah's Studio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opportunity-wallet-contact">Wallet contact</Label>
                  <Select id="opportunity-wallet-contact" name="walletContactId">
                    <option value="">No linked contact</option>
                    {normalizedWalletContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.display.fullName}
                        {contact.display.businessName ? `, ${contact.display.businessName}` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="opportunity-description">Description</Label>
                  <Textarea
                    id="opportunity-description"
                    name="description"
                    rows={3}
                    maxLength={1400}
                    placeholder="What the client needs, where it came from, and what should happen next."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opportunity-value">Potential Value</Label>
                  <Input
                    id="opportunity-value"
                    name="potentialValue"
                    inputMode="decimal"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opportunity-currency">Currency</Label>
                  <Select id="opportunity-currency" name="currency" defaultValue="GBP">
                    {CIRCLE_CARD_OPPORTUNITY_CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opportunity-source">Source Type</Label>
                  <Select id="opportunity-source" name="sourceType" defaultValue="MANUAL">
                    {CIRCLE_CARD_OPPORTUNITY_SOURCE_TYPES.map((sourceType) => (
                      <option key={sourceType} value={sourceType}>
                        {circleCardOpportunitySourceTypeLabel(sourceType)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opportunity-follow-up">Next Follow-Up Date</Label>
                  <Input id="opportunity-follow-up" name="nextFollowUpAt" type="date" />
                </div>
                <div className="flex items-end xl:col-span-2">
                  <Button type="submit" className="w-full gap-2" disabled={!card}>
                    <ShoppingBag size={16} />
                    Create Opportunity
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-6">
            {CIRCLE_CARD_OPPORTUNITY_STATUSES.map((status) => {
              const stageOpportunities = opportunitiesByStatus[status];

              return (
                <div key={status} className="space-y-3 rounded-2xl border border-silver/14 bg-background/14 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {circleCardOpportunityStatusLabel(status)}
                      </h3>
                      <p className="mt-1 text-xs text-muted">{formatOpportunityTotals(stageOpportunities)}</p>
                    </div>
                    <Badge variant="muted">{stageOpportunities.length}</Badge>
                  </div>

                  {stageOpportunities.length ? (
                    stageOpportunities.map((opportunity) => {
                      const followUpStatus = getOpportunityFollowUpStatus(
                        opportunity.nextFollowUpAt,
                        todayUtc
                      );
                      const quickActions = [
                        { status: "QUALIFIED", label: "Mark Qualified", icon: UserCheck },
                        { status: "PROPOSAL_SENT", label: "Send Proposal", icon: Send },
                        { status: "NEGOTIATION", label: "Move To Negotiation", icon: Handshake },
                        { status: "WON", label: "Mark Won", icon: CheckCircle2 },
                        { status: "LOST", label: "Mark Lost", icon: XCircle }
                      ].filter((action) => action.status !== opportunity.status);

                      return (
                        <Card key={opportunity.id} className="border-silver/16 bg-card/72">
                          <CardContent className="space-y-4 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  opportunity.status === "WON"
                                    ? "border-gold/25 text-gold"
                                    : opportunity.status === "LOST"
                                      ? "border-red-500/30 text-red-200"
                                      : "border-silver/18 text-silver"
                                }
                              >
                                {circleCardOpportunityStatusLabel(opportunity.status)}
                              </Badge>
                              <Badge variant="outline" className="border-silver/18 text-silver">
                                {circleCardOpportunitySourceTypeLabel(opportunity.sourceType)}
                              </Badge>
                              {followUpStatus ? (
                                <Badge variant="outline" className={followUpStatus.className}>
                                  {followUpStatus.label}
                                </Badge>
                              ) : null}
                            </div>

                            <div>
                              <h4 className="text-base font-semibold text-foreground">{opportunity.title}</h4>
                              <p className="mt-1 text-xs text-muted">{opportunityContactLabel(opportunity)}</p>
                            </div>

                            {opportunity.description ? (
                              <p className="text-sm leading-relaxed text-muted">{opportunity.description}</p>
                            ) : null}

                            <div className="grid gap-2 text-xs text-muted">
                              <p>
                                <span className="font-medium text-foreground">Potential Value: </span>
                                {formatOpportunityValue(opportunity.potentialValue, opportunity.currency)}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">Last Activity: </span>
                                {opportunity.lastActivityAt
                                  ? formatRelationshipDate(opportunity.lastActivityAt)
                                  : "Not set"}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">Next Follow-Up: </span>
                                {opportunity.nextFollowUpAt
                                  ? formatRelationshipDate(opportunity.nextFollowUpAt)
                                  : "Not set"}
                              </p>
                              {opportunity.closedAt ? (
                                <p>
                                  <span className="font-medium text-foreground">Closed: </span>
                                  {formatDate(opportunity.closedAt)}
                                </p>
                              ) : null}
                            </div>

                            <form action={updateCircleCardOpportunityStatusAction} className="grid gap-2">
                              <input type="hidden" name="opportunityId" value={opportunity.id} />
                              <input type="hidden" name="returnPath" value={opportunityReturnPath} />
                              <Select name="status" defaultValue={opportunity.status} aria-label="Opportunity status">
                                {CIRCLE_CARD_OPPORTUNITY_STATUSES.map((statusOption) => (
                                  <option key={statusOption} value={statusOption}>
                                    {circleCardOpportunityStatusLabel(statusOption)}
                                  </option>
                                ))}
                              </Select>
                              <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                                <ArrowUpRight size={14} />
                                Move Stage
                              </Button>
                            </form>

                            <div className="grid gap-2">
                              {quickActions.map((action) => {
                                const Icon = action.icon;

                                return (
                                  <form key={action.status} action={updateCircleCardOpportunityStatusAction}>
                                    <input type="hidden" name="opportunityId" value={opportunity.id} />
                                    <input type="hidden" name="status" value={action.status} />
                                    <input type="hidden" name="returnPath" value={opportunityReturnPath} />
                                    <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                                      <Icon size={14} />
                                      {action.label}
                                    </Button>
                                  </form>
                                );
                              })}
                            </div>

                            <details className="rounded-xl border border-silver/14 bg-background/18 p-3">
                              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                                Opportunity Detail
                              </summary>
                              <form action={updateCircleCardOpportunityAction} className="mt-4 space-y-3">
                                <input type="hidden" name="opportunityId" value={opportunity.id} />
                                <input type="hidden" name="returnPath" value={opportunityReturnPath} />
                                <div className="space-y-2">
                                  <Label htmlFor={`opportunity-title-${opportunity.id}`}>Title</Label>
                                  <Input
                                    id={`opportunity-title-${opportunity.id}`}
                                    name="title"
                                    maxLength={160}
                                    required
                                    defaultValue={opportunity.title}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`opportunity-status-${opportunity.id}`}>Status</Label>
                                  <Select
                                    id={`opportunity-status-${opportunity.id}`}
                                    name="status"
                                    defaultValue={opportunity.status}
                                  >
                                    {CIRCLE_CARD_OPPORTUNITY_STATUSES.map((statusOption) => (
                                      <option key={statusOption} value={statusOption}>
                                        {circleCardOpportunityStatusLabel(statusOption)}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor={`opportunity-value-${opportunity.id}`}>Potential Value</Label>
                                    <Input
                                      id={`opportunity-value-${opportunity.id}`}
                                      name="potentialValue"
                                      inputMode="decimal"
                                      defaultValue={opportunity.potentialValue?.toString() ?? ""}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`opportunity-currency-${opportunity.id}`}>Currency</Label>
                                    <Select
                                      id={`opportunity-currency-${opportunity.id}`}
                                      name="currency"
                                      defaultValue={opportunity.currency}
                                    >
                                      {CIRCLE_CARD_OPPORTUNITY_CURRENCY_OPTIONS.map((currency) => (
                                        <option key={currency} value={currency}>
                                          {currency}
                                        </option>
                                      ))}
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`opportunity-source-${opportunity.id}`}>Source Type</Label>
                                  <Select
                                    id={`opportunity-source-${opportunity.id}`}
                                    name="sourceType"
                                    defaultValue={opportunity.sourceType}
                                  >
                                    {CIRCLE_CARD_OPPORTUNITY_SOURCE_TYPES.map((sourceType) => (
                                      <option key={sourceType} value={sourceType}>
                                        {circleCardOpportunitySourceTypeLabel(sourceType)}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor={`opportunity-last-activity-${opportunity.id}`}>
                                      Last Activity
                                    </Label>
                                    <Input
                                      id={`opportunity-last-activity-${opportunity.id}`}
                                      name="lastActivityAt"
                                      type="date"
                                      defaultValue={toDateInputValue(opportunity.lastActivityAt)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`opportunity-next-follow-up-${opportunity.id}`}>
                                      Next Follow-Up
                                    </Label>
                                    <Input
                                      id={`opportunity-next-follow-up-${opportunity.id}`}
                                      name="nextFollowUpAt"
                                      type="date"
                                      defaultValue={toDateInputValue(opportunity.nextFollowUpAt)}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`opportunity-description-${opportunity.id}`}>Description</Label>
                                  <Textarea
                                    id={`opportunity-description-${opportunity.id}`}
                                    name="description"
                                    rows={3}
                                    maxLength={1400}
                                    defaultValue={opportunity.description ?? ""}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`opportunity-notes-${opportunity.id}`}>Notes</Label>
                                  <Textarea
                                    id={`opportunity-notes-${opportunity.id}`}
                                    name="notes"
                                    rows={4}
                                    maxLength={2400}
                                    defaultValue={opportunity.notes ?? ""}
                                  />
                                </div>
                                <Button type="submit" className="w-full gap-2">
                                  <Save size={16} />
                                  Save Opportunity
                                </Button>
                              </form>
                            </details>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                      No opportunities in this stage.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="discover"
        title="Discover"
        summary="Find published Circle Cards, save useful people, and start connection requests"
        className={activeSection === "network" ? undefined : "hidden"}
        defaultOpen
        badge={
          <Badge variant="outline" className="border-gold/28 text-gold">
            {discoverCards.length} result{discoverCards.length === 1 ? "" : "s"}
          </Badge>
        }
      >
        <div className="space-y-5">
          <Card className="border-silver/16 bg-card/62">
            <CardContent className="space-y-4 pt-6 sm:pt-7">
              <form
                action="/dashboard/circle-card#discover"
                method="get"
                className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_180px_160px_150px_auto]"
              >
                <input type="hidden" name="section" value="network" />
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} />
                  <Input
                    name="discoverQuery"
                    defaultValue={discoverQuery}
                    placeholder="Search name, business, role, tagline or handles"
                    className="pl-10"
                    aria-label="Search Circle Cards"
                  />
                </div>
                <Select
                  name="discoverCategory"
                  defaultValue={discoverCategory}
                  aria-label="Discover category filter"
                >
                  <option value="">All categories</option>
                  {discoverCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
                <div className="relative">
                  <Compass className="pointer-events-none absolute left-3 top-3 text-muted" size={16} />
                  <Input
                    name="discoverLocation"
                    defaultValue={discoverLocation}
                    placeholder="Location"
                    className="pl-10"
                    aria-label="Discover location filter"
                  />
                </div>
                <label
                  htmlFor="discoverRecommended"
                  className="flex h-11 items-center gap-2 rounded-xl border border-silver/14 bg-background/20 px-3 text-sm text-foreground"
                >
                  <input
                    id="discoverRecommended"
                    name="discoverRecommended"
                    type="checkbox"
                    value="1"
                    defaultChecked={discoverRecommended}
                    className="h-4 w-4 rounded border-silver/30 bg-background"
                  />
                  Recommended
                </label>
                <label
                  htmlFor="discoverBcn"
                  className="flex h-11 items-center gap-2 rounded-xl border border-silver/14 bg-background/20 px-3 text-sm text-foreground"
                >
                  <input
                    id="discoverBcn"
                    name="discoverBcn"
                    type="checkbox"
                    value="1"
                    defaultChecked={discoverBcn}
                    className="h-4 w-4 rounded border-silver/30 bg-background"
                  />
                  BCN member
                </label>
                <Button type="submit" variant="outline" className="w-full gap-2 xl:w-auto">
                  <Filter size={16} />
                  Filter
                </Button>
              </form>

              <div className="flex flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing published cards, excluding your own. Recently updated cards appear first.
                </p>
                {discoverHasFilters ? (
                  <Link
                    href={circleCardSectionHref("network", "discover")}
                    className="text-xs font-medium text-silver hover:text-foreground"
                  >
                    Clear discover filters
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {discoverCards.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {discoverCards.map((candidate) => {
                const roleLine =
                  [candidate.role, candidate.businessName].filter(Boolean).join(" at ") ||
                  "Circle Card contact";
                const topRecommendation = candidate.recommendationsReceived[0] ?? null;
                const recommendedByKnown = candidate.recommendedByKnown.length > 0;
                const isSaved = Boolean(candidate.savedContact);

                return (
                  <Card key={candidate.id} className="border-silver/16 bg-card/62">
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div className="flex min-w-0 gap-3">
                        <div className="relative h-16 w-16 shrink-0">
                          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-silver/16 bg-background/28 text-base font-semibold text-foreground">
                            {candidate.profileImageUrl ? (
                              <img
                                src={candidate.profileImageUrl}
                                alt={candidate.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              candidate.fullName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          {candidate.businessLogoUrl ? (
                            <div className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center overflow-hidden rounded-xl border border-background bg-card shadow-inner-surface">
                              <img
                                src={candidate.businessLogoUrl}
                                alt={`${candidate.fullName} business logo`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-foreground">{candidate.fullName}</h3>
                            {candidate.isBcnMember ? (
                              <Badge variant="outline" className="border-gold/25 text-gold">
                                BCN member
                              </Badge>
                            ) : null}
                            {isSaved ? (
                              <Badge variant="outline" className="border-gold/25 text-gold">
                                Saved
                              </Badge>
                            ) : null}
                            {candidate.connectionState.kind === "connected" ? (
                              <Badge variant="outline" className="border-gold/25 text-gold">
                                Connected
                              </Badge>
                            ) : null}
                            {candidate.connectionState.kind === "pending_outgoing" ? (
                              <Badge variant="outline" className="border-silver/18 text-silver">
                                Request Pending
                              </Badge>
                            ) : null}
                            {candidate.connectionState.kind === "pending_incoming" ? (
                              <Badge variant="outline" className="border-gold/25 text-gold">
                                Request Incoming
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-silver">{roleLine}</p>
                          {candidate.tagline ? (
                            <p className="mt-2 text-sm leading-relaxed text-muted">{candidate.tagline}</p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {candidate.location ? <Badge variant="muted">{candidate.location}</Badge> : null}
                            <Badge variant="outline" className="border-silver/18 text-silver">
                              {candidate.recommendationCount} recommendation
                              {candidate.recommendationCount === 1 ? "" : "s"}
                            </Badge>
                            {candidate.recommendationCategoryLabels.map((category) => (
                              <Badge key={category} variant="outline" className="border-silver/18 text-silver">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {candidate.recommendationCount ? (
                        <div className="rounded-2xl border border-gold/16 bg-gold/8 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Star size={15} className="text-gold" />
                            {recommendedByKnown
                              ? "Recommended by people you know"
                              : "Recommended by trusted connections"}
                          </div>
                          {candidate.knownRecommenderNames.length ? (
                            <p className="mt-2 text-xs text-silver">
                              {candidate.knownRecommenderNames.join(", ")}
                            </p>
                          ) : topRecommendation ? (
                            <p className="mt-2 text-xs text-silver">
                              {topRecommendation.recommenderCard.fullName}
                              {topRecommendation.recommenderCard.businessName
                                ? `, ${topRecommendation.recommenderCard.businessName}`
                                : ""}
                            </p>
                          ) : null}
                          {topRecommendation?.reason ? (
                            <p className="mt-3 text-sm leading-relaxed text-muted">
                              &ldquo;{topRecommendation.reason}&rdquo;
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-silver/14 bg-background/18 p-4 text-sm text-muted">
                          Public recommendations will appear here when trusted connections vouch for this card.
                        </div>
                      )}

                      <div className="grid gap-2 sm:grid-cols-2">
                        <CircleCardTrackedLink
                          href={`/card/${candidate.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          cardId={candidate.id}
                          eventType="DISCOVER_CARD_VIEWED"
                          metadata={{
                            source: "discover",
                            query: discoverQuery || null,
                            category: discoverCategory || null,
                            location: discoverLocation || null
                          }}
                          className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
                        >
                          View Card
                          <ArrowUpRight size={16} />
                        </CircleCardTrackedLink>

                        {!isSaved ? (
                          <form action={saveCircleWalletContactAction}>
                            <input type="hidden" name="cardId" value={candidate.id} />
                            <input type="hidden" name="returnPath" value={discoverReturnPath} />
                            <input type="hidden" name="source" value="discover" />
                            <Button type="submit" className="w-full gap-2">
                              <WalletCards size={16} />
                              Save to Wallet
                            </Button>
                          </form>
                        ) : null}

                        {isSaved && candidate.connectionState.kind === "none" ? (
                          card ? (
                            <form action={sendCircleCardConnectionRequestAction}>
                              <input type="hidden" name="recipientCardId" value={candidate.id} />
                              <input type="hidden" name="returnPath" value={discoverReturnPath} />
                              <input type="hidden" name="source" value="discover" />
                              <Button type="submit" className="w-full gap-2">
                                <Send size={16} />
                                Send Connection Request
                              </Button>
                            </form>
                          ) : (
                            <Button type="button" variant="outline" disabled className="w-full gap-2">
                              <Send size={16} />
                              Create card to connect
                            </Button>
                          )
                        ) : null}

                        {!isSaved ? (
                          <Button type="button" variant="outline" disabled className="w-full gap-2">
                            <Send size={16} />
                            Save first to connect
                          </Button>
                        ) : null}

                        {isSaved && candidate.connectionState.kind === "pending_outgoing" ? (
                          <form action={cancelCircleCardConnectionRequestAction}>
                            <input
                              type="hidden"
                              name="requestId"
                              value={candidate.connectionState.request.id}
                            />
                            <input type="hidden" name="returnPath" value={discoverReturnPath} />
                            <Button type="submit" variant="outline" className="w-full gap-2">
                              <XCircle size={16} />
                              Cancel Request
                            </Button>
                          </form>
                        ) : null}

                        {isSaved && candidate.connectionState.kind === "pending_incoming" ? (
                          <Link
                            href={`${buildWalletHref({ walletView: "requests" })}#wallet`}
                            className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
                          >
                            <MessageSquare size={16} />
                            Request Incoming
                          </Link>
                        ) : null}

                        {isSaved && candidate.connectionState.kind === "connected" ? (
                          <Button type="button" variant="outline" disabled className="w-full gap-2">
                            <CheckCircle2 size={16} />
                            Connected
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-silver/18 bg-card/48">
              <CardContent className="py-10 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-silver/16 bg-background/24 text-silver">
                  <Compass size={20} />
                </div>
                <h3 className="mt-4 font-display text-2xl text-foreground">
                  No Circle Cards found yet.
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                  Try a different search, add people through Connect Hub, or share your card so
                  more people can find their way back to you.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {discoverHasFilters ? (
                    <Link href={circleCardSectionHref("network", "discover")}>
                      <Button type="button" variant="outline">
                        Try a different search
                      </Button>
                    </Link>
                  ) : null}
                  <Link href={circleCardSectionHref("network", "connect-hub")} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                    <Share2 size={16} />
                    Add people through Connect Hub
                  </Link>
                  <Link href={circleCardSectionHref("share", "share-assets")} className={cn(buttonVariants(), "gap-2")}>
                    <QrCode size={16} />
                    Share your card
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="referrals"
        title="Referrals"
        summary="Send, receive, and track business referrals through Circle Card"
        className={activeSection === "business" ? undefined : "hidden"}
        defaultOpen={receivedReferrals.length > 0}
        badge={
          <Badge variant="outline" className="border-gold/28 text-gold">
            {receivedReferrals.length} received
          </Badge>
        }
      >
        <div className="space-y-5">
          <Card className="border-silver/16 bg-card/62">
            <CardContent className="space-y-5 pt-6 sm:pt-7">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {REFERRAL_VIEW_OPTIONS.map((option) => (
                  <Link
                    key={option.value}
                    href={buildReferralHref({ referralView: option.value })}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      referralView === option.value
                        ? "border-gold/32 bg-gold/10 text-gold"
                        : "border-silver/14 bg-background/20 text-muted hover:border-silver/28 hover:text-foreground"
                    )}
                  >
                    {option.label} ({referralViewCounts[option.value]})
                  </Link>
                ))}
              </div>

              <form action={createCircleCardReferralAction} className="grid gap-4 xl:grid-cols-2">
                <input type="hidden" name="returnPath" value={referralSentReturnPath} />
                <input type="hidden" name="source" value="referral_centre" />
                <div className="space-y-2">
                  <Label htmlFor="referral-wallet-recipient">Saved recipient</Label>
                  <Select id="referral-wallet-recipient" name="recipientWalletContactId">
                    <option value="">Manual/private recipient</option>
                    {referrableWalletContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.display.fullName}
                        {contact.display.businessName ? `, ${contact.display.businessName}` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral-discover-recipient">Discovered Circle Card</Label>
                  <Select id="referral-discover-recipient" name="recipientCardId">
                    <option value="">No discovered card</option>
                    {referrableDiscoverCards.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.fullName}
                        {candidate.businessName ? `, ${candidate.businessName}` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral-contact-name">Referred contact name</Label>
                  <Input
                    id="referral-contact-name"
                    name="referredContactName"
                    maxLength={140}
                    required
                    placeholder="Sarah Mitchell"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral-contact-business">Business</Label>
                  <Input
                    id="referral-contact-business"
                    name="referredContactBusiness"
                    maxLength={140}
                    placeholder="Sarah's Studio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral-contact-email">Email</Label>
                  <Input
                    id="referral-contact-email"
                    name="referredContactEmail"
                    type="email"
                    maxLength={320}
                    placeholder="sarah@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral-contact-phone">Phone</Label>
                  <Input
                    id="referral-contact-phone"
                    name="referredContactPhone"
                    maxLength={48}
                    placeholder="07700 900000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral-contact-website">Website</Label>
                  <Input
                    id="referral-contact-website"
                    name="referredContactWebsite"
                    maxLength={2048}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral-estimated-value">Estimated value</Label>
                  <Input
                    id="referral-estimated-value"
                    name="estimatedValue"
                    inputMode="decimal"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="referral-reason">Reason</Label>
                  <Textarea
                    id="referral-reason"
                    name="reason"
                    rows={4}
                    maxLength={800}
                    required
                    placeholder="Sarah needs help improving her website."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral-visibility">Visibility</Label>
                  <Select id="referral-visibility" name="visibility" defaultValue="PRIVATE">
                    <option value="PRIVATE">Private</option>
                    <option value="PUBLIC_SUCCESS">Public success if won</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full gap-2" disabled={!card}>
                    <Handshake size={16} />
                    Send Referral
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {visibleReferrals.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleReferrals.map((referral) => {
                const estimatedValue = formatReferralValue(referral.estimatedValue);
                const actualValue = formatReferralValue(referral.actualValue);
                const canCancel =
                  referral.referrerUserId === session.user.id && referral.status === "SENT";
                const canRespond =
                  referral.recipientUserId === session.user.id && referral.status === "SENT";
                const canComplete =
                  (referral.recipientUserId === session.user.id ||
                    (referral.referrerUserId === session.user.id && !referral.recipientUserId)) &&
                  referralOpenStatuses.has(referral.status);

                return (
                  <Card key={referral.id} className="border-silver/16 bg-card/62">
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                referral.status === "WON"
                                  ? "border-gold/25 text-gold"
                                  : "border-silver/18 text-silver"
                              }
                            >
                              {circleCardReferralStatusLabel(referral.status)}
                            </Badge>
                            <Badge variant="outline" className="border-silver/18 text-silver">
                              {circleCardReferralVisibilityLabel(referral.visibility)}
                            </Badge>
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-foreground">
                            {referralView === "received"
                              ? `Referred by ${referral.referrerCard.fullName}`
                              : referralRecipientLabel(referral)}
                          </h3>
                          <p className="mt-1 text-sm text-silver">
                            Contact: {referralContactLabel(referral)}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-muted">{formatDate(referral.createdAt)}</p>
                      </div>

                      <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-silver">Reason</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{referral.reason}</p>
                      </div>

                      <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-foreground">Recipient: </span>
                          {referralRecipientLabel(referral)}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Referrer: </span>
                          {referral.referrerCard.fullName}
                        </p>
                        {estimatedValue ? (
                          <p>
                            <span className="font-medium text-foreground">Estimated: </span>
                            {estimatedValue}
                          </p>
                        ) : null}
                        {actualValue ? (
                          <p>
                            <span className="font-medium text-foreground">Actual: </span>
                            {actualValue}
                          </p>
                        ) : null}
                        {referral.referredContactEmail ? (
                          <p className="break-all">
                            <span className="font-medium text-foreground">Email: </span>
                            {referral.referredContactEmail}
                          </p>
                        ) : null}
                        {referral.referredContactPhone ? (
                          <p>
                            <span className="font-medium text-foreground">Phone: </span>
                            {referral.referredContactPhone}
                          </p>
                        ) : null}
                        {referral.referredContactWebsite ? (
                          <p className="break-all">
                            <span className="font-medium text-foreground">Website: </span>
                            {referral.referredContactWebsite}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {referral.referrerCard.slug ? (
                          <Link
                            href={`/card/${referral.referrerCard.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                          >
                            Referrer card
                            <ArrowUpRight size={14} />
                          </Link>
                        ) : null}
                        {referral.recipientCard?.slug ? (
                          <Link
                            href={`/card/${referral.recipientCard.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                          >
                            Recipient card
                            <ArrowUpRight size={14} />
                          </Link>
                        ) : null}
                      </div>

                      <form action={createCircleCardOpportunityAction}>
                        <input type="hidden" name="returnPath" value={opportunityReturnPath} />
                        <input type="hidden" name="title" value={referralContactLabel(referral)} />
                        <input type="hidden" name="description" value={referral.reason} />
                        <input type="hidden" name="potentialValue" value={referral.estimatedValue?.toString() ?? ""} />
                        <input type="hidden" name="sourceType" value="REFERRAL" />
                        <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                          <ShoppingBag size={14} />
                          Create Opportunity
                        </Button>
                      </form>

                      {canRespond ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <form action={updateCircleCardReferralStatusAction}>
                            <input type="hidden" name="referralId" value={referral.id} />
                            <input type="hidden" name="status" value="ACCEPTED" />
                            <input type="hidden" name="returnPath" value={referralReceivedReturnPath} />
                            <Button type="submit" className="w-full gap-2">
                              <UserCheck size={16} />
                              Accept
                            </Button>
                          </form>
                          <form action={updateCircleCardReferralStatusAction}>
                            <input type="hidden" name="referralId" value={referral.id} />
                            <input type="hidden" name="status" value="DECLINED" />
                            <input type="hidden" name="returnPath" value={referralReceivedReturnPath} />
                            <Button type="submit" variant="outline" className="w-full gap-2">
                              <UserX size={16} />
                              Decline
                            </Button>
                          </form>
                        </div>
                      ) : null}

                      {canComplete ? (
                        <div className="grid gap-3">
                          <form
                            action={updateCircleCardReferralStatusAction}
                            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                          >
                            <input type="hidden" name="referralId" value={referral.id} />
                            <input type="hidden" name="status" value="WON" />
                            <input
                              type="hidden"
                              name="returnPath"
                              value={referralView === "received" ? referralReceivedReturnPath : referralReturnPath}
                            />
                            <Input name="actualValue" inputMode="decimal" placeholder="Actual value" />
                            <Select name="visibility" defaultValue={referral.visibility}>
                              <option value="PRIVATE">Private</option>
                              <option value="PUBLIC_SUCCESS">Public success</option>
                            </Select>
                            <Button type="submit" className="gap-2">
                              <CheckCircle2 size={16} />
                              Mark Won
                            </Button>
                          </form>
                          <form action={updateCircleCardReferralStatusAction}>
                            <input type="hidden" name="referralId" value={referral.id} />
                            <input type="hidden" name="status" value="LOST" />
                            <input
                              type="hidden"
                              name="returnPath"
                              value={referralView === "received" ? referralReceivedReturnPath : referralReturnPath}
                            />
                            <Button type="submit" variant="outline" className="w-full gap-2">
                              <XCircle size={16} />
                              Mark Lost
                            </Button>
                          </form>
                        </div>
                      ) : null}

                      {canCancel ? (
                        <form action={updateCircleCardReferralStatusAction}>
                          <input type="hidden" name="referralId" value={referral.id} />
                          <input type="hidden" name="status" value="CANCELLED" />
                          <input type="hidden" name="returnPath" value={referralSentReturnPath} />
                          <Button type="submit" variant="outline" className="w-full gap-2">
                            <XCircle size={16} />
                            Cancel Referral
                          </Button>
                        </form>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-silver/18 bg-card/48">
              <CardContent className="py-10 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-silver/16 bg-background/24 text-silver">
                  <Handshake size={20} />
                </div>
                <h3 className="mt-4 font-display text-2xl text-foreground">
                  No referrals here yet
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                  Send a referral from this centre or use Send Referral inside a wallet contact.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="connect-hub"
        title="Connect Hub"
        summary="Share your card, add someone by link, and move quickly into wallet connections"
        className={activeSection === "network" ? undefined : "hidden"}
        defaultOpen
        badge={
          <Badge variant="outline" className="border-gold/28 text-gold">
            {pendingIncomingRequests.length + pendingOutgoingRequests.length} request
            {pendingIncomingRequests.length + pendingOutgoingRequests.length === 1 ? "" : "s"}
          </Badge>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="grid gap-4">
            <Card className="border-gold/18 bg-gold/8">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="inline-flex items-center gap-2 text-lg">
                      <Share2 size={17} className="text-gold" />
                      Share My Card
                    </CardTitle>
                    <CardDescription>
                      Send your Circle Card to someone so they can save you or connect back.
                    </CardDescription>
                  </div>
                  {card?.isPublished ? (
                    <Badge variant="outline" className="w-fit border-gold/28 text-gold">
                      Published
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {card && publicUrl ? (
                  <>
                    <div className="rounded-2xl border border-gold/18 bg-background/24 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gold">
                        Public card link
                      </p>
                      <p className="mt-2 break-all text-sm text-foreground">{publicUrl}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      <CircleCardCopyLinkButton
                        publicUrl={publicUrl}
                        label="Copy Link"
                        className="h-10 w-full"
                        analytics={{
                          cardId: card.id,
                          eventType: "CONNECT_HUB_COPY_LINK",
                          source: "connect_hub"
                        }}
                      />
                      <CircleCardShareButton
                        title={`${card.fullName} | Circle Card`}
                        publicUrl={publicUrl}
                        cardId={card.id}
                        analyticsSource="connect_hub"
                        eventType="CONNECT_HUB_SHARE"
                        label="Share"
                        hideStatus
                        buttonClassName="h-10"
                      />
                      <Link href={circleCardSectionHref("share", "share-assets-qr")} className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-2")}>
                        <QrCode size={16} />
                        QR
                      </Link>
                      <Link
                        href={circleCardSectionHref("share", "share-assets")}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "h-auto min-h-10 gap-2 px-2 text-center text-xs leading-tight sm:text-sm"
                        )}
                      >
                        <QrCode size={16} />
                        <span>Need QR/NFC assets?</span>
                      </Link>
                      <Link href={`/card/${card.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="outline" className="h-10 w-full gap-2">
                          Open
                          <ArrowUpRight size={16} />
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                    Create and publish your Circle Card before sharing.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-silver/16 bg-card/62">
                <CardHeader>
                  <CardTitle className="inline-flex items-center gap-2 text-lg">
                    <Camera size={17} className="text-silver" />
                    Scan QR
                  </CardTitle>
                  <CardDescription>Camera scanning will live here when the scanner route is ready.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                    QR scanning is coming soon.
                  </div>
                  <Button type="button" variant="outline" disabled className="w-full gap-2">
                    <QrCode size={16} />
                    Scanner Coming Soon
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-silver/16 bg-card/62">
                <CardHeader>
                  <CardTitle className="inline-flex items-center gap-2 text-lg">
                    <MessageSquare size={17} className="text-silver" />
                    Connection Requests
                  </CardTitle>
                  <CardDescription>
                    {pendingIncomingRequests.length} incoming, {pendingOutgoingRequests.length} outgoing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <a
                    href={`${buildWalletHref({ walletView: "requests" })}#wallet`}
                    className="rounded-2xl border border-gold/18 bg-gold/8 p-4 hover:border-gold/32"
                  >
                    <span className="text-2xl font-semibold text-foreground">{pendingIncomingRequests.length}</span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.08em] text-gold">Incoming</span>
                  </a>
                  <a
                    href={`${buildWalletHref({ walletView: "requests" })}#wallet`}
                    className="rounded-2xl border border-silver/14 bg-background/18 p-4 hover:border-silver/28"
                  >
                    <span className="text-2xl font-semibold text-foreground">{pendingOutgoingRequests.length}</span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.08em] text-silver">Outgoing</span>
                  </a>
                </CardContent>
              </Card>
            </div>

            <BusinessCardScanner canSendConnectionRequest={Boolean(card)} />
          </div>

          <div className="grid gap-4">
            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-lg">
                  <LinkIcon size={17} className="text-silver" />
                  Enter Card Link
                </CardTitle>
                <CardDescription>Paste a Circle Card link, path or slug.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={resolveCircleCardLinkAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    name="cardLookup"
                    defaultValue={connectHubCard ? `/card/${connectHubCard.slug}` : ""}
                    placeholder="https://thebusinesscircle.net/card/rhys"
                    aria-label="Circle Card link or slug"
                  />
                  <Button type="submit" className="w-full gap-2 sm:w-auto">
                    <Search size={16} />
                    Find Card
                  </Button>
                </form>

                {connectHubLookupMissing ? (
                  <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                    No preview is available for that card link.
                  </div>
                ) : null}

                {connectHubCard ? (
                  <div className="rounded-2xl border border-silver/14 bg-background/20 p-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative h-14 w-14 shrink-0">
                        <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-silver/16 bg-background/28 text-sm font-semibold text-foreground">
                          {connectHubCard.profileImageUrl ? (
                            <img
                              src={connectHubCard.profileImageUrl}
                              alt={connectHubCard.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            connectHubCard.fullName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        {connectHubCard.businessLogoUrl ? (
                          <div className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center overflow-hidden rounded-xl border border-background bg-card shadow-inner-surface">
                            <img
                              src={connectHubCard.businessLogoUrl}
                              alt={`${connectHubCard.fullName} business logo`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">{connectHubCard.fullName}</h3>
                          {connectHubOwnCard ? (
                            <Badge variant="outline" className="border-gold/25 text-gold">
                              This is your card
                            </Badge>
                          ) : null}
                          {connectHubSavedContact ? (
                            <Badge variant="outline" className="border-gold/25 text-gold">
                              Saved
                            </Badge>
                          ) : null}
                          {connectHubConnectionState?.kind === "connected" ? (
                            <Badge variant="outline" className="border-gold/25 text-gold">
                              Connected
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-silver">
                          {[connectHubCard.role, connectHubCard.businessName].filter(Boolean).join(" at ") ||
                            "Circle Card contact"}
                        </p>
                        {connectHubCard.tagline ? (
                          <p className="mt-2 text-sm text-muted">{connectHubCard.tagline}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Link href={`/card/${connectHubCard.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="outline" className="w-full gap-2">
                          Open Card
                          <ArrowUpRight size={16} />
                        </Button>
                      </Link>

                      {!connectHubOwnCard && !connectHubSavedContact ? (
                        <form action={saveCircleWalletContactAction}>
                          <input type="hidden" name="cardId" value={connectHubCard.id} />
                          <input type="hidden" name="returnPath" value={connectHubReturnPath} />
                          <Button type="submit" className="w-full gap-2">
                            <WalletCards size={16} />
                            Save to Wallet
                          </Button>
                        </form>
                      ) : null}

                      {!connectHubOwnCard && connectHubSavedContact && connectHubConnectionState?.kind === "none" ? (
                        card ? (
                          <form action={sendCircleCardConnectionRequestAction} className="space-y-2 sm:col-span-2">
                            <input type="hidden" name="recipientCardId" value={connectHubCard.id} />
                            <input type="hidden" name="returnPath" value={connectHubReturnPath} />
                            <Textarea
                              name="message"
                              rows={2}
                              maxLength={240}
                              placeholder="Hi, good to connect through Circle Card."
                              aria-label="Connection request message"
                            />
                            <Button type="submit" className="w-full gap-2">
                              <Send size={16} />
                              Send Connection Request
                            </Button>
                          </form>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted sm:col-span-2">
                            Create your Circle Card before sending connection requests.
                          </div>
                        )
                      ) : null}

                      {!connectHubOwnCard && connectHubSavedContact && connectHubConnectionState?.kind === "pending_outgoing" ? (
                        <form action={cancelCircleCardConnectionRequestAction}>
                          <input type="hidden" name="requestId" value={connectHubConnectionState.request.id} />
                          <input type="hidden" name="returnPath" value={connectHubReturnPath} />
                          <Button type="submit" variant="outline" className="w-full gap-2">
                            <XCircle size={16} />
                            Cancel Request
                          </Button>
                        </form>
                      ) : null}

                      {!connectHubOwnCard && connectHubSavedContact && connectHubConnectionState?.kind === "pending_incoming" ? (
                        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                          <form action={acceptCircleCardConnectionRequestAction}>
                            <input type="hidden" name="requestId" value={connectHubConnectionState.request.id} />
                            <input type="hidden" name="returnPath" value={connectHubReturnPath} />
                            <Button type="submit" className="w-full gap-2">
                              <UserCheck size={16} />
                              Accept
                            </Button>
                          </form>
                          <form action={declineCircleCardConnectionRequestAction}>
                            <input type="hidden" name="requestId" value={connectHubConnectionState.request.id} />
                            <input type="hidden" name="returnPath" value={connectHubReturnPath} />
                            <Button type="submit" variant="outline" className="w-full gap-2">
                              <UserX size={16} />
                              Decline
                            </Button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-silver/16 bg-card/62">
                <CardHeader>
                  <CardTitle className="inline-flex items-center gap-2 text-lg">
                    <WalletCards size={17} className="text-silver" />
                    Recently Added
                  </CardTitle>
                  <CardDescription>Latest saved wallet contacts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentWalletContacts.slice(0, 5).length ? (
                    recentWalletContacts.slice(0, 5).map((contact) => (
                      <Link
                        key={contact.id}
                        href={`${buildWalletHref({ contactId: contact.id })}#wallet`}
                        className="block rounded-2xl border border-silver/14 bg-background/20 px-4 py-3 text-sm text-foreground hover:border-silver/28"
                      >
                        {contact.display.fullName}
                        <span className="mt-1 block text-xs text-muted">
                          {contact.display.businessName || contact.display.role || contact.display.sourceLabel}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted">Saved cards will appear here.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-silver/16 bg-card/62">
                <CardHeader>
                  <CardTitle className="inline-flex items-center gap-2 text-lg">
                    <UserCheck size={17} className="text-silver" />
                    Connected People
                  </CardTitle>
                  <CardDescription>Latest mutual Circle Card connections.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {connectHubRecentlyConnected.length ? (
                    connectHubRecentlyConnected.map((connectedCard) => (
                      <Link
                        key={connectedCard.id}
                        href={`/card/${connectedCard.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-2xl border border-gold/18 bg-gold/8 px-4 py-3 text-sm text-foreground hover:border-gold/32"
                      >
                        {connectedCard.fullName}
                        <span className="mt-1 block text-xs text-muted">
                          {[connectedCard.role, connectedCard.businessName].filter(Boolean).join(" at ") ||
                            "Circle Card contact"}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted">Mutual connections will appear here.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="share-assets"
        title="Share Assets"
        summary="Public link, QR code, NFC-ready URL and print asset placeholders"
        className={activeSection === "share" ? undefined : "hidden"}
        defaultOpen={Boolean(card)}
      >
        {card && publicUrl && qrUrl && nfcUrl && eventUrl ? (
          <CircleCardShareAssetsPanel
            cardId={card.id}
            fullName={card.fullName}
            slug={card.slug}
            publicUrl={publicUrl}
            qrUrl={qrUrl}
            nfcUrl={nfcUrl}
            eventUrl={eventUrl}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
            Create and publish your Circle Card before generating share assets.
          </div>
        )}
      </CircleCardDashboardSection>

      <div className={cn("grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]", activeSection !== "my-card" && "hidden")}>
        <Card id="circle-card-form" className="scroll-mt-24 border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle>{card ? "Edit your Circle Card" : "Create your first Circle Card"}</CardTitle>
            <CardDescription>
              Keep the card focused on the details people need when they want to reconnect.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertCircleCardAction} className="space-y-5">
              <input type="hidden" name="returnPath" value={circleCardSectionHref("my-card", "circle-card-form")} />
              {card ? <input type="hidden" name="cardId" value={card.id} /> : null}

              <CircleCardDashboardSection
                id="card-identity"
                title="Card identity"
                summary={card?.fullName || "Name, role, slug, tagline and about text"}
                defaultOpen
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      defaultValue={card?.fullName ?? member?.name ?? ""}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business name</Label>
                    <Input
                      id="businessName"
                      name="businessName"
                      defaultValue={card?.businessName ?? member?.profile?.business?.companyName ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      name="role"
                      defaultValue={card?.role ?? member?.profile?.headline ?? ""}
                      placeholder="Founder, operator, advisor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Public link slug</Label>
                    <Input id="slug" name="slug" defaultValue={card?.slug ?? ""} placeholder="your-name" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      name="tagline"
                      defaultValue={card?.tagline ?? ""}
                      placeholder="Sharper strategy for growing businesses"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="about">About</Label>
                    <Textarea
                      id="about"
                      name="about"
                      rows={5}
                      defaultValue={card?.about ?? member?.profile?.bio ?? ""}
                    />
                  </div>
                </div>
              </CircleCardDashboardSection>

              <CircleCardDashboardSection
                id="card-images"
                title="Images"
                summary={card?.profileImageUrl || card?.businessLogoUrl ? "Profile photo and logo set" : "Profile photo, business logo and crop controls"}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <CircleCardImageUploadField
                    id="profileImageUrl"
                    name="profileImageUrl"
                    label="Profile photo"
                    uploadKind="profile-photo"
                    defaultValue={card?.profileImageUrl ?? member?.image ?? ""}
                    positionXName="profileImagePositionX"
                    positionYName="profileImagePositionY"
                    scaleName="profileImageScale"
                    defaultPositionX={card?.profileImagePositionX}
                    defaultPositionY={card?.profileImagePositionY}
                    defaultScale={card?.profileImageScale}
                    previewAlt="Circle Card profile preview"
                    helperText="Upload a JPG, PNG or WebP from your device, adjust the crop, or keep using an image URL."
                    previewClassName="rounded-full"
                  />
                  <CircleCardImageUploadField
                    id="businessLogoUrl"
                    name="businessLogoUrl"
                    label="Business logo"
                    uploadKind="business-logo"
                    defaultValue={card?.businessLogoUrl ?? ""}
                    positionXName="businessLogoPositionX"
                    positionYName="businessLogoPositionY"
                    scaleName="businessLogoScale"
                    defaultPositionX={card?.businessLogoPositionX}
                    defaultPositionY={card?.businessLogoPositionY}
                    defaultScale={card?.businessLogoScale}
                    previewAlt="Circle Card business logo preview"
                    helperText="Optional. This appears as the small circular identity badge on your public card."
                    previewClassName="rounded-full"
                  />
                </div>
              </CircleCardDashboardSection>

              <CircleCardDashboardSection
                id="card-contact-details"
                title="Contact details"
                summary={[card?.websiteUrl, card?.email, card?.phone, card?.location].filter(Boolean).length ? "Website, email, phone and location" : "Add direct ways for people to reach you"}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">Website</Label>
                    <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={defaultWebsite} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={card?.email ?? member?.email ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={card?.phone ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      defaultValue={card?.location ?? member?.profile?.location ?? ""}
                      placeholder="London, United Kingdom"
                    />
                  </div>
                </div>
              </CircleCardDashboardSection>

              <CircleCardDashboardSection
                id="card-social-profiles"
                title="Social profiles"
                summary={`${Object.values(socialLinks).filter(Boolean).length} social profile${Object.values(socialLinks).filter(Boolean).length === 1 ? "" : "s"} connected`}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn</Label>
                    <Input
                      id="linkedinUrl"
                      name="linkedinUrl"
                      type="url"
                      defaultValue={socialLinks.linkedin ?? member?.profile?.linkedin ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagramUrl">Instagram</Label>
                    <Input
                      id="instagramUrl"
                      name="instagramUrl"
                      type="url"
                      defaultValue={socialLinks.instagram ?? member?.profile?.instagram ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktokUrl">TikTok</Label>
                    <Input
                      id="tiktokUrl"
                      name="tiktokUrl"
                      type="url"
                      defaultValue={socialLinks.tiktok ?? member?.profile?.tiktok ?? ""}
                      placeholder="https://www.tiktok.com/@..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebookUrl">Facebook</Label>
                    <Input
                      id="facebookUrl"
                      name="facebookUrl"
                      type="url"
                      defaultValue={socialLinks.facebook ?? member?.profile?.facebook ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="xUrl">X</Label>
                    <Input id="xUrl" name="xUrl" type="url" defaultValue={socialLinks.x ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtubeUrl">YouTube</Label>
                    <Input
                      id="youtubeUrl"
                      name="youtubeUrl"
                      type="url"
                      defaultValue={socialLinks.youtube ?? member?.profile?.youtube ?? ""}
                    />
                  </div>
                </div>
              </CircleCardDashboardSection>

              <label
                htmlFor="isPublished"
                className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
              >
                <input
                  id="isPublished"
                  name="isPublished"
                  type="checkbox"
                  defaultChecked={card?.isPublished ?? true}
                  className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                />
                <span>
                  Published
                  <span className="mt-1 block text-xs text-muted">
                    Public cards are available at their /card link.
                  </span>
                </span>
              </label>

              <Button type="submit" className="w-full gap-2 sm:w-auto">
                <Save size={16} />
                {card ? "Save Circle Card" : "Create Circle Card"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <CircleCardDashboardSection
            id="public-card"
            title="Public card"
            summary={publicUrl ? "QR, copy link, view public card and share tools" : "Public tools appear after your first save"}
          >
            <div className="space-y-4">
              {publicUrl && card ? (
                <>
                  <CircleCardQrPanel publicUrl={publicUrl} slug={card.slug} />
                  <Link href={`/card/${card.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button type="button" variant="outline" className="w-full gap-2">
                      View public card
                      <ArrowUpRight size={16} />
                    </Button>
                  </Link>
                  <CircleCardShareButton
                    title={`${card.fullName} | Circle Card`}
                    publicUrl={publicUrl}
                    cardId={card.id}
                    analyticsSource="dashboard"
                    label="Share card"
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                  Your public link and QR code will appear after the first save.
                </div>
              )}
            </div>
          </CircleCardDashboardSection>

          <div className="grid gap-4">
            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <WalletCards size={17} className="text-silver" />
                  Circle Wallet
                </CardTitle>
                <CardDescription>
                  {savedContactCount} saved contact{savedContactCount === 1 ? "" : "s"} in your wallet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">
                  Search, favourites, private notes and tags are available in the wallet section
                  below.
                </p>
              </CardContent>
            </Card>

            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <BarChart3 size={17} className="text-silver" />
                  Analytics
                </CardTitle>
                <CardDescription>
                  {card?.viewCount ?? 0} public view{(card?.viewCount ?? 0) === 1 ? "" : "s"} recorded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">
                  Deeper scan and contact analytics can plug into this surface later.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-gold/10">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Crown size={17} className="text-gold" />
                  {isCircleCardFree ? "Future Circle Card tools" : "Upgrade path"}
                </CardTitle>
                <CardDescription>
                  {isCircleCardFree
                    ? "More relationship tools can build on your card, wallet and analytics over time."
                    : "Pro, Teams and BCN tier benefits are prepared in the access layer."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-gold/25 text-gold">
                    Wallet
                  </Badge>
                  <Badge variant="outline" className="border-gold/25 text-gold">
                    Analytics
                  </Badge>
                  <Badge variant="outline" className="border-gold/25 text-gold">
                    Teams
                  </Badge>
                  <Badge variant="outline" className="border-gold/25 text-gold">
                    BCN badges
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      <CircleCardDashboardSection
        id="custom-links"
        title="Featured links"
        summary="Smart action blocks for bookings, offers, downloads, reviews, shops, menus and case studies"
        className={activeSection === "my-card" ? undefined : "hidden"}
        badge={
          <span className="inline-flex gap-2">
            <Badge variant="muted">{customLinks.length} saved</Badge>
            <Badge variant="outline" className="border-gold/25 text-gold">
              {customLinkLimitLabel}
            </Badge>
          </span>
        }
      >
        <div className="space-y-5">

        {card ? (
          <>
            <Card className="border-gold/18 bg-gold/8">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <LinkIcon size={17} className="text-gold" />
                  Add link
                </CardTitle>
                <CardDescription>
                  Add booking pages, offers, downloads, reviews, shops, menus or portfolio links.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={upsertCircleCardLinkAction} className="space-y-4">
                  <input type="hidden" name="returnPath" value={circleCardSectionHref("my-card", "custom-links")} />
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="sortOrder" value={customLinks.length} />

                  <CircleCardSmartLinkFields idPrefix="customLinkNew" />

                  <label
                    htmlFor="customLinkIsActive"
                    className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
                  >
                    <input
                      id="customLinkIsActive"
                      name="isActive"
                      type="checkbox"
                      defaultChecked={!freeActiveCustomLinkLimitReached}
                      className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                    />
                    <span>
                      Active on public card
                      <span className="mt-1 block text-xs text-muted">
                        Free cards can keep up to {FREE_ACTIVE_CUSTOM_LINK_LIMIT} active custom links.
                      </span>
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {CUSTOM_LINK_EXAMPLES.map((example) => (
                      <Badge key={example} variant="outline" className="border-silver/18 text-silver">
                        {example}
                      </Badge>
                    ))}
                  </div>

                  <Button type="submit" className="w-full gap-2 sm:w-auto">
                    <Save size={16} />
                    Add link
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-3">
                {customLinks.length ? (
                  customLinks.map((customLink, index) => {
                    const isFirst = index === 0;
                    const isLast = index === customLinks.length - 1;

                    return (
                      <Card
                        key={customLink.id}
                        className={cn(
                          "border-silver/16 bg-card/62",
                          customLink.isActive ? "border-gold/20" : "opacity-78"
                        )}
                      >
                        <CardContent className="space-y-4 p-4 sm:p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex min-w-0 gap-3">
                              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/18 bg-gold/10 text-gold">
                                <CustomLinkIcon icon={customLink.icon} type={customLink.type} />
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-base font-semibold text-foreground">
                                    {customLink.label}
                                  </h3>
                                  <Badge
                                    variant={customLink.isActive ? "outline" : "muted"}
                                    className={customLink.isActive ? "border-gold/25 text-gold" : ""}
                                  >
                                    {customLink.isActive ? "Active" : "Paused"}
                                  </Badge>
                                  {customLink.visibility === "PRIVATE_CODE" ? (
                                    <Badge variant="outline" className="gap-1 border-gold/25 text-gold">
                                      <Lock size={12} />
                                      Private code
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-1 truncate text-sm text-silver">
                                  {displayCustomLinkUrl(customLink.fileUrl || customLink.url)}
                                </p>
                                {customLink.description ? (
                                  <p className="mt-2 text-sm leading-relaxed text-muted">
                                    {customLink.description}
                                  </p>
                                ) : null}
                                <p className="mt-2 text-xs text-muted">
                                  {customLinkTypeLabel(customLink.type)}
                                  {customLink.fileName ? ` · ${customLink.fileName}` : ""}
                                  {customLink.fileUrl || customLink.fileMimeType ? (
                                    <>
                                      {" · "}
                                      {circleCardFileKindLabel(detectCircleCardFileKind(customLink))}
                                      {" · "}
                                      {circleCardFileActionLabel(resolveCircleCardFileAction(customLink))}
                                    </>
                                  ) : null}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:justify-end">
                              <form action={moveCircleCardLinkAction}>
                                <input type="hidden" name="returnPath" value={circleCardSectionHref("my-card", "custom-links")} />
                                <input type="hidden" name="cardId" value={card.id} />
                                <input type="hidden" name="linkId" value={customLink.id} />
                                <input type="hidden" name="direction" value="up" />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                  className="h-10 w-full gap-2 sm:w-10 sm:px-0"
                                  disabled={isFirst}
                                  title="Move link up"
                                >
                                  <ArrowUp size={14} />
                                  <span className="sm:sr-only">Move up</span>
                                </Button>
                              </form>
                              <form action={moveCircleCardLinkAction}>
                                <input type="hidden" name="returnPath" value={circleCardSectionHref("my-card", "custom-links")} />
                                <input type="hidden" name="cardId" value={card.id} />
                                <input type="hidden" name="linkId" value={customLink.id} />
                                <input type="hidden" name="direction" value="down" />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                  className="h-10 w-full gap-2 sm:w-10 sm:px-0"
                                  disabled={isLast}
                                  title="Move link down"
                                >
                                  <ArrowDown size={14} />
                                  <span className="sm:sr-only">Move down</span>
                                </Button>
                              </form>
                              <form action={toggleCircleCardLinkAction}>
                                <input type="hidden" name="returnPath" value={circleCardSectionHref("my-card", "custom-links")} />
                                <input type="hidden" name="cardId" value={card.id} />
                                <input type="hidden" name="linkId" value={customLink.id} />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                  className="h-10 w-full gap-2 sm:w-auto"
                                >
                                  {customLink.isActive ? "Pause" : "Activate"}
                                </Button>
                              </form>
                              <form action={deleteCircleCardLinkAction}>
                                <input type="hidden" name="returnPath" value={circleCardSectionHref("my-card", "custom-links")} />
                                <input type="hidden" name="cardId" value={card.id} />
                                <input type="hidden" name="linkId" value={customLink.id} />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                  className="h-10 w-full gap-2 sm:w-auto"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </Button>
                              </form>
                            </div>
                          </div>

                          <details className="rounded-2xl border border-silver/14 bg-background/18 p-3">
                            <summary className="cursor-pointer list-none text-sm font-medium text-silver">
                              Edit link
                            </summary>
                            <form action={upsertCircleCardLinkAction} className="mt-4 space-y-4">
                              <input type="hidden" name="returnPath" value={circleCardSectionHref("my-card", "custom-links")} />
                              <input type="hidden" name="cardId" value={card.id} />
                              <input type="hidden" name="linkId" value={customLink.id} />
                              <input type="hidden" name="sortOrder" value={customLink.sortOrder} />

                              <CircleCardSmartLinkFields
                                idPrefix={`customLink-${customLink.id}`}
                                defaultType={customLink.type}
                                defaultLabel={customLink.label}
                                defaultUrl={customLink.url}
                                defaultDescription={customLink.description}
                                defaultFileUrl={customLink.fileUrl}
                                defaultFileName={customLink.fileName}
                                defaultFileMimeType={customLink.fileMimeType}
                                defaultButtonText={customLink.buttonText}
                                defaultExpiresAt={customLink.expiresAt}
                                defaultActionMode={customLink.actionMode}
                                defaultVisibility={customLink.visibility}
                                defaultAccessCodeHint={customLink.accessCodeHint}
                                hasAccessCode={Boolean(customLink.accessCodeHash)}
                              />

                              <label
                                htmlFor={`customLinkIsActive-${customLink.id}`}
                                className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
                              >
                                <input
                                  id={`customLinkIsActive-${customLink.id}`}
                                  name="isActive"
                                  type="checkbox"
                                  defaultChecked={customLink.isActive}
                                  className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                                />
                                <span>
                                  Active on public card
                                  <span className="mt-1 block text-xs text-muted">
                                    Paused links stay saved but hidden from /card/{card.slug}.
                                  </span>
                                </span>
                              </label>

                              <Button type="submit" className="w-full gap-2 sm:w-auto">
                                <Save size={16} />
                                Save link
                              </Button>
                            </form>
                          </details>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="border-dashed border-silver/18 bg-card/48">
                    <CardContent className="py-8 text-center">
                      <LinkIcon className="mx-auto text-silver" size={22} />
                      <h3 className="mt-4 font-display text-2xl text-foreground">
                        No custom links yet
                      </h3>
                      <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                        Add a booking page, portfolio, offer, review page or download to turn this
                        Circle Card into a link hub.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <aside className="space-y-5">
                <Card className="border-silver/16 bg-card/62">
                  <CardHeader>
                    <CardTitle className="text-lg">Public behavior</CardTitle>
                    <CardDescription>
                      Active links appear below website, phone, email and social rows on your
                      public Circle Card.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted">
                    <p>Each public custom link opens externally and records a basic click event.</p>
                    <p>
                      Private file-backed links appear locked and only resolve after the visitor enters
                      the access code.
                    </p>
                    <p>
                      Link click metadata stores the link id, label and a query-stripped URL for
                      sensible analytics.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-gold/18 bg-gold/8">
                  <CardHeader>
                    <CardTitle className="text-lg">Phase limit</CardTitle>
                    <CardDescription>
                      Free Circle Cards can keep up to {FREE_ACTIVE_CUSTOM_LINK_LIMIT} active
                      custom links. Paused links can stay saved for later.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </aside>
            </div>
          </>
        ) : (
          <Card className="border-dashed border-silver/18 bg-card/48">
            <CardContent className="py-8 text-center">
              <LinkIcon className="mx-auto text-silver" size={22} />
              <h3 className="mt-4 font-display text-2xl text-foreground">
                Create your card before adding links
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                Once your Circle Card exists, you can add useful public links and turn it into a
                professional action hub.
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="analytics"
        title="Analytics"
        summary="Views, wallet saves, shares, downloads and featured-link clicks"
        className={activeSection === "my-card" ? undefined : "hidden"}
        badge={
          <Badge variant="outline" className="w-fit border-gold/25 text-gold">
            Basic analytics included
          </Badge>
        }
      >
        <div className="space-y-5">

        {card ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {analyticsOverview.map((item) => (
                <Card key={item.label} className="border-silver/16 bg-card/62">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-muted">{item.label}</p>
                        <p className="mt-3 font-display text-3xl text-foreground">{item.value}</p>
                      </div>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                        <item.icon size={17} />
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <Card className="border-silver/16 bg-card/62">
                <CardHeader>
                  <CardTitle className="inline-flex items-center gap-2">
                    <Activity size={17} className="text-silver" />
                    Recent activity
                  </CardTitle>
                  <CardDescription>
                    The latest public actions tracked for this Circle Card.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics?.recentEvents.length ? (
                    analytics.recentEvents.map((event) => {
                      const detail = readActivityDetail(event.metadata);

                      return (
                        <div
                          key={event.id}
                          className="flex items-start justify-between gap-3 rounded-2xl border border-silver/14 bg-background/20 p-4"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{event.label}</p>
                            {detail ? (
                              <p className="mt-1 text-xs capitalize text-muted">{detail}</p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-right text-xs text-muted">
                            {formatDate(event.createdAt)}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-5 text-sm text-muted">
                      Activity will appear here as people view, save and share your card.
                    </div>
                  )}
                </CardContent>
              </Card>

              <aside className="space-y-5">
                <Card className="border-silver/16 bg-card/62">
                  <CardHeader>
                    <CardTitle className="inline-flex items-center gap-2">
                      <MousePointerClick size={17} className="text-silver" />
                      Activity mix
                    </CardTitle>
                    <CardDescription>Simple action totals for quick scanning.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analyticsActivityMix.map((item) => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted">{item.label}</span>
                          <span className="font-medium text-foreground">{item.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-background/46">
                          <div
                            className="h-full rounded-full bg-gold"
                            style={{
                              width: activityBarWidth(item.value, analytics?.maxActivityCount ?? 1)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-gold/18 bg-gold/8">
                  <CardHeader>
                    <CardTitle className="text-lg">Coming soon</CardTitle>
                    <CardDescription>
                      Future Pro and Teams analytics can build from the events now being captured.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {FUTURE_ANALYTICS_FEATURES.map((feature) => (
                        <Badge key={feature} variant="outline" className="border-gold/25 text-gold">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </>
        ) : (
          <Card className="border-dashed border-silver/18 bg-card/48">
            <CardContent className="py-8 text-center">
              <BarChart3 className="mx-auto text-silver" size={22} />
              <h3 className="mt-4 font-display text-2xl text-foreground">
                Analytics start after your first card is live
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                Create a Circle Card and the activity foundation will begin tracking views, saves,
                shares and contact actions.
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="wallet"
        title="Circle Wallet"
        summary="Search saved contacts, follow-ups, categories and private relationship context"
        className={activeSection === "network" ? undefined : "hidden"}
        badge={
          <span className="inline-flex gap-2">
            <Badge variant="muted">{savedContactCount} saved</Badge>
            <Badge variant="outline" className="border-gold/28 text-gold">
              {connectedWalletContacts.length} connected
            </Badge>
            <Badge variant="outline" className="border-gold/28 text-gold">
              {recommendedWalletContacts.length} recommended
            </Badge>
            {pendingIncomingRequests.length ? (
              <Badge variant="outline" className="border-gold/28 text-gold">
                {pendingIncomingRequests.length} request{pendingIncomingRequests.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
            <Badge variant="outline" className="border-silver/18 text-silver">
              {needsFollowUpWalletContacts.length} follow-up
            </Badge>
          </span>
        }
      >
        <div className="space-y-5">
        <Card className="border-silver/16 bg-card/62">
          <CardContent className="pt-5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {WALLET_VIEW_OPTIONS.map((option) => (
                <Link
                  key={option.value}
                  href={buildWalletHref({
                    walletQuery,
                    walletView: option.value,
                    walletCategory,
                    walletFollowUp
                  })}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    walletView === option.value
                      ? "border-gold/32 bg-gold/10 text-gold"
                      : "border-silver/14 bg-background/20 text-muted hover:border-silver/28 hover:text-foreground"
                  )}
                >
                  {option.label} ({walletViewCounts[option.value]})
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {walletView === "requests" ? (
          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="inline-flex items-center gap-2">
                    <MessageSquare size={18} className="text-gold" />
                    Request Centre
                  </CardTitle>
                  <CardDescription>Incoming, outgoing and recently resolved Circle Card requests.</CardDescription>
                </div>
                <Badge variant="outline" className="w-fit border-gold/28 text-gold">
                  {pendingIncomingRequests.length + pendingOutgoingRequests.length} pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Incoming</h3>
                    <Badge variant="muted">{pendingIncomingRequests.length}</Badge>
                  </div>
                  {pendingIncomingRequests.length ? (
                    pendingIncomingRequests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-gold/18 bg-gold/8 p-4">
                        <div className="flex min-w-0 gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-gold/20 bg-background/24 text-xs font-semibold text-foreground">
                            {request.requesterCard.profileImageUrl ? (
                              <img
                                src={request.requesterCard.profileImageUrl}
                                alt={request.requesterCard.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              request.requesterCard.fullName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {request.requesterCard.fullName}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              {[request.requesterCard.role, request.requesterCard.businessName]
                                .filter(Boolean)
                                .join(" at ") || "Circle Card contact"}
                            </p>
                          </div>
                        </div>
                        {request.message ? (
                          <p className="mt-3 rounded-xl border border-gold/14 bg-background/18 p-3 text-sm text-muted">
                            &ldquo;{request.message}&rdquo;
                          </p>
                        ) : null}
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <form action={acceptCircleCardConnectionRequestAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="returnPath" value={`${buildWalletHref({ walletView: "requests" })}#wallet`} />
                            <Button type="submit" size="sm" className="w-full gap-2">
                              <UserCheck size={14} />
                              Accept
                            </Button>
                          </form>
                          <form action={declineCircleCardConnectionRequestAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="returnPath" value={`${buildWalletHref({ walletView: "requests" })}#wallet`} />
                            <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                              <UserX size={14} />
                              Decline
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                      No incoming requests.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Outgoing</h3>
                    <Badge variant="muted">{pendingOutgoingRequests.length}</Badge>
                  </div>
                  {pendingOutgoingRequests.length ? (
                    pendingOutgoingRequests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                        <div className="flex min-w-0 gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-silver/16 bg-background/24 text-xs font-semibold text-foreground">
                            {request.recipientCard.profileImageUrl ? (
                              <img
                                src={request.recipientCard.profileImageUrl}
                                alt={request.recipientCard.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              request.recipientCard.fullName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {request.recipientCard.fullName}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              {[request.recipientCard.role, request.recipientCard.businessName]
                                .filter(Boolean)
                                .join(" at ") || "Circle Card contact"}
                            </p>
                          </div>
                        </div>
                        {request.message ? (
                          <p className="mt-3 rounded-xl border border-silver/14 bg-background/20 p-3 text-sm text-muted">
                            &ldquo;{request.message}&rdquo;
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <Badge variant="outline" className="border-silver/18 text-silver">
                            Pending
                          </Badge>
                          <form action={cancelCircleCardConnectionRequestAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="returnPath" value={`${buildWalletHref({ walletView: "requests" })}#wallet`} />
                            <Button type="submit" variant="outline" size="sm" className="gap-2">
                              <XCircle size={14} />
                              Cancel
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                      No outgoing requests.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Accepted Recently</h3>
                    <Badge variant="muted">{recentAcceptedRequests.length}</Badge>
                  </div>
                  {recentAcceptedRequests.length ? (
                    recentAcceptedRequests.map((request) => {
                      const connectedCard = otherConnectionCard(request);

                      return (
                        <Link
                          key={request.id}
                          href={`/card/${connectedCard.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-2xl border border-gold/18 bg-gold/8 p-4 hover:border-gold/32"
                        >
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {connectedCard.fullName}
                              </p>
                              <p className="mt-1 text-xs text-muted">
                                {formatRelationshipDate(request.respondedAt ?? request.createdAt)}
                              </p>
                            </div>
                            <CheckCircle2 size={16} className="shrink-0 text-gold" />
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                      Accepted requests will appear here.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Declined Recently</h3>
                    <Badge variant="muted">{recentDeclinedRequests.length}</Badge>
                  </div>
                  {recentDeclinedRequests.length ? (
                    recentDeclinedRequests.map((request) => {
                      const declinedCard = otherConnectionCard(request);

                      return (
                        <div key={request.id} className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {declinedCard.fullName}
                              </p>
                              <p className="mt-1 text-xs text-muted">
                                {formatRelationshipDate(request.respondedAt ?? request.createdAt)}
                              </p>
                            </div>
                            <UserX size={16} className="shrink-0 text-silver" />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                      Declined requests will appear here.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {walletView !== "requests" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <Card className="border-silver/16 bg-card/62">
              <CardContent className="space-y-4 pt-6 sm:pt-7">
                <form action="/dashboard/circle-card" method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px_auto]">
                  <input type="hidden" name="section" value="network" />
                  {walletView !== "all" ? (
                    <input type="hidden" name="walletView" value={walletView} />
                  ) : null}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} />
                    <Input
                      name="walletQuery"
                      defaultValue={walletQuery}
                      placeholder="Search names, companies, notes, where-met or category"
                      className="pl-10"
                    />
                  </div>
                  <Select name="walletCategory" defaultValue={walletCategory} aria-label="Wallet category filter">
                    <option value="">All categories</option>
                    {walletCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                  <Select name="walletFollowUp" defaultValue={walletFollowUp} aria-label="Follow-up filter">
                    {WALLET_FOLLOW_UP_FILTER_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="outline" className="w-full gap-2 lg:w-auto">
                    <Filter size={16} />
                    Filter
                  </Button>
                </form>

                {activeWalletFilters ? (
                  <Link
                    href={buildWalletHref({ walletView })}
                    className="inline-flex text-xs font-medium text-silver hover:text-foreground"
                  >
                    Clear wallet filters
                  </Link>
                ) : null}
              </CardContent>
            </Card>

            {savedContactCount === 0 ? (
              <Card className="border-dashed border-silver/18 bg-card/48">
                <CardContent className="py-10 text-center">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-silver/16 bg-background/24 text-silver">
                    <WalletCards size={20} />
                  </div>
                  <h3 className="mt-4 font-display text-2xl text-foreground">
                    No saved contacts yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                    Saved Circle Cards and scanned business cards will appear here with private
                    notes, tags and favourite status.
                  </p>
                  <Link href="/circle-card" className="mt-5 inline-flex">
                    <Button variant="outline">Explore Circle Card</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 xl:grid-cols-3">
                  <Card className="border-gold/18 bg-gold/8">
                    <CardHeader>
                      <CardTitle className="inline-flex items-center gap-2 text-lg">
                        <Star size={16} className="text-gold" />
                        Favourite contacts
                      </CardTitle>
                      <CardDescription>People you want close at hand.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {favouriteWalletContacts.length ? (
                        favouriteWalletContacts.slice(0, 4).map((contact) => (
                          <Link
                            key={contact.id}
                            href={buildWalletHref({
                              walletQuery,
                              walletView,
                              walletCategory,
                              walletFollowUp,
                              contactId: contact.id
                            })}
                            className="block rounded-2xl border border-gold/18 bg-background/22 px-4 py-3 text-sm text-foreground hover:border-gold/32"
                          >
                            {contact.display.fullName}
                            <span className="mt-1 block text-xs text-muted">
                              {contact.display.businessName || contact.display.role || contact.display.sourceLabel}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <p className="text-sm text-muted">Favourite important contacts as you save them.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-silver/16 bg-card/62">
                    <CardHeader>
                      <CardTitle className="inline-flex items-center gap-2 text-lg">
                        <CalendarDays size={16} className="text-silver" />
                        Recently saved
                      </CardTitle>
                      <CardDescription>Your newest relationship context.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {recentWalletContacts.map((contact) => (
                        <Link
                          key={contact.id}
                          href={buildWalletHref({
                            walletQuery,
                            walletView,
                            walletCategory,
                            walletFollowUp,
                            contactId: contact.id
                          })}
                          className="block rounded-2xl border border-silver/14 bg-background/20 px-4 py-3 text-sm text-foreground hover:border-silver/28"
                        >
                          {contact.display.fullName}
                          <span className="mt-1 block text-xs text-muted">
                            Saved {formatDate(contact.savedAt)}
                          </span>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-silver/16 bg-card/62">
                    <CardHeader>
                      <CardTitle className="inline-flex items-center gap-2 text-lg">
                        <CalendarDays size={16} className="text-silver" />
                        Follow-up
                      </CardTitle>
                      <CardDescription>
                        {needsFollowUpWalletContacts.length} due, {upcomingFollowUpWalletContacts.length} upcoming.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {needsFollowUpWalletContacts.slice(0, 4).map((contact) => (
                        <Link
                          key={contact.id}
                          href={buildWalletHref({
                            walletQuery,
                            walletView,
                            walletCategory,
                            walletFollowUp,
                            contactId: contact.id
                          })}
                          className="block rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-foreground hover:border-amber-500/36"
                        >
                          {contact.display.fullName}
                          <span className="mt-1 block text-xs text-muted">
                            {contact.followUpDate ? formatRelationshipDate(contact.followUpDate) : "Follow-up"}
                          </span>
                        </Link>
                      ))}
                      {needsFollowUpWalletContacts.length === 0 ? (
                        <p className="text-sm text-muted">No follow-ups due today.</p>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  {visibleWalletContacts.length ? (
                    visibleWalletContacts.map((contact) => {
                      const detailHref = buildWalletHref({
                        walletQuery,
                        walletView,
                        walletCategory,
                        walletFollowUp,
                        contactId: contact.id
                      });
                      const selected = selectedWalletContact?.id === contact.id;
                      const contactConnection = contact.card?.id
                        ? walletConnectionState(contact.card.id)
                        : null;
                      const followUpStatus = getFollowUpStatus(contact.followUpDate, todayUtc);

                      return (
                        <Card
                          key={contact.id}
                          className={cn(
                            "border-silver/16 bg-card/62",
                            selected ? "border-gold/28 bg-gold/8" : ""
                          )}
                        >
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="flex min-w-0 gap-3">
                                <div className="relative h-14 w-14 shrink-0">
                                  <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-silver/16 bg-background/28 text-sm font-semibold text-foreground">
                                    {contact.display.profileImageUrl ? (
                                      <img
                                        src={contact.display.profileImageUrl}
                                        alt={contact.display.fullName}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      contact.display.fullName.slice(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  {contact.display.businessLogoUrl ? (
                                    <div className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center overflow-hidden rounded-xl border border-background bg-card shadow-inner-surface">
                                      <img
                                        src={contact.display.businessLogoUrl}
                                        alt={`${contact.display.fullName} business logo`}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-semibold text-foreground">
                                      {contact.display.fullName}
                                    </h3>
                                    {contact.display.isScannedBusinessCard ? (
                                      <Badge variant="outline" className="border-gold/25 text-gold">
                                        Scanned Business Card
                                      </Badge>
                                    ) : null}
                                    {contact.favourite ? (
                                      <Badge variant="outline" className="border-gold/25 text-gold">
                                        Favourite
                                      </Badge>
                                    ) : null}
                                    {contact.recommendations.length ? (
                                      <Badge variant="outline" className="border-gold/25 text-gold">
                                        Recommended
                                      </Badge>
                                    ) : null}
                                    {contactConnection?.kind === "connected" ? (
                                      <Badge variant="outline" className="border-gold/25 text-gold">
                                        Connected
                                      </Badge>
                                    ) : null}
                                    {contactConnection?.kind === "pending_outgoing" ? (
                                      <Badge variant="outline" className="border-silver/18 text-silver">
                                        Request Pending
                                      </Badge>
                                    ) : null}
                                    {contactConnection?.kind === "pending_incoming" ? (
                                      <Badge variant="outline" className="border-gold/25 text-gold">
                                        Request Incoming
                                      </Badge>
                                    ) : null}
                                    {contact.category ? (
                                      <Badge variant="outline" className="border-silver/18 text-silver">
                                        {contact.category}
                                      </Badge>
                                    ) : null}
                                    {followUpStatus ? (
                                      <Badge variant="outline" className={followUpStatus.className}>
                                        {followUpStatus.label}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-sm text-silver">
                                    {[contact.display.role, contact.display.businessName].filter(Boolean).join(" at ") ||
                                      contact.display.sourceLabel}
                                  </p>
                                  {contact.display.tagline ? (
                                    <p className="mt-2 text-sm text-muted">{contact.display.tagline}</p>
                                  ) : null}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {contact.display.location ? (
                                      <Badge variant="muted">{contact.display.location}</Badge>
                                    ) : null}
                                    {contact.display.email ? (
                                      <Badge variant="outline" className="border-silver/18 text-silver">
                                        {contact.display.email}
                                      </Badge>
                                    ) : null}
                                    {contact.display.phone ? (
                                      <Badge variant="outline" className="border-silver/18 text-silver">
                                        {contact.display.phone}
                                      </Badge>
                                    ) : null}
                                    {contact.metAt ? (
                                      <Badge variant="outline" className="border-silver/18 text-silver">
                                        Met: {contact.metAt}
                                      </Badge>
                                    ) : null}
                                    {contact.followUpDate ? (
                                      <Badge variant="outline" className="border-silver/18 text-silver">
                                        Follow up: {formatRelationshipDate(contact.followUpDate)}
                                      </Badge>
                                    ) : null}
                                    {contact.lastInteractionDate ? (
                                      <Badge variant="outline" className="border-silver/18 text-silver">
                                        Last: {formatRelationshipDate(contact.lastInteractionDate)}
                                      </Badge>
                                    ) : null}
                                    {contact.tags.map((tag) => (
                                      <Badge key={tag} variant="outline" className="border-silver/18 text-silver">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:justify-end">
                                {contact.display.publicCardHref ? (
                                  <Link
                                    href={contact.display.publicCardHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-w-0"
                                  >
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-10 w-full gap-2 sm:w-auto"
                                    >
                                      Public card
                                      <ArrowUpRight size={14} />
                                    </Button>
                                  </Link>
                                ) : null}
                                <Link href={detailHref} className="min-w-0">
                                  <Button
                                    type="button"
                                    variant={selected ? "default" : "outline"}
                                    size="sm"
                                    className="h-10 w-full sm:w-auto"
                                  >
                                    Details
                                  </Button>
                                </Link>
                                <form action={toggleCircleWalletFavouriteAction} className="min-w-0">
                                  <input type="hidden" name="walletContactId" value={contact.id} />
                                  <input type="hidden" name="returnPath" value={detailHref} />
                                  <Button
                                    type="submit"
                                    variant="outline"
                                    size="sm"
                                    className="h-10 w-full gap-2 sm:w-auto"
                                  >
                                    <Star size={14} />
                                    {contact.favourite ? "Unfavourite" : "Favourite"}
                                  </Button>
                                </form>
                                <form action={removeCircleWalletContactAction} className="min-w-0">
                                  <input type="hidden" name="walletContactId" value={contact.id} />
                                  {contact.card?.id ? (
                                    <input type="hidden" name="cardId" value={contact.card.id} />
                                  ) : null}
                                  <input type="hidden" name="returnPath" value={detailHref} />
                                  <Button
                                    type="submit"
                                    variant="outline"
                                    size="sm"
                                    className="h-10 w-full gap-2 sm:w-auto"
                                  >
                                    <Trash2 size={14} />
                                    Remove
                                  </Button>
                                </form>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <Card className="border-dashed border-silver/18 bg-card/48">
                      <CardContent className="py-8 text-center text-sm text-muted">
                        No saved contacts match this wallet view.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-5">
            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle>Relationship details</CardTitle>
                <CardDescription>
                  Private memory for the saved contact selected in your wallet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {selectedWalletContact ? (
                  <>
                    <div className="rounded-2xl border border-silver/14 bg-background/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                        Selected contact
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">
                        {selectedWalletContact.display.fullName}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {[selectedWalletContact.display.role, selectedWalletContact.display.businessName]
                          .filter(Boolean)
                          .join(" at ") || selectedWalletContact.display.sourceLabel}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={
                            selectedWalletContact.display.isScannedBusinessCard
                              ? "border-gold/25 text-gold"
                              : "border-silver/18 text-silver"
                          }
                        >
                          {selectedWalletContact.display.sourceLabel}
                        </Badge>
                        {selectedWalletContact.category ? (
                          <Badge variant="outline" className="border-silver/18 text-silver">
                            {selectedWalletContact.category}
                          </Badge>
                        ) : null}
                        {selectedWalletRecommendation ? (
                          <Badge variant="outline" className="border-gold/25 text-gold">
                            You recommend this person
                          </Badge>
                        ) : null}
                        {selectedWalletContact.metAt ? (
                          <Badge variant="outline" className="border-silver/18 text-silver">
                            Met: {selectedWalletContact.metAt}
                          </Badge>
                        ) : null}
                        {selectedFollowUpStatus ? (
                          <Badge variant="outline" className={selectedFollowUpStatus.className}>
                            {selectedFollowUpStatus.label}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {selectedWalletContact.display.isScannedBusinessCard ? (
                      <div className="rounded-2xl border border-gold/18 bg-gold/8 p-4">
                        <div className="flex items-center gap-2">
                          <ContactRound size={16} className="text-gold" />
                          <p className="text-sm font-semibold text-foreground">Scanned Business Card</p>
                        </div>
                        {selectedWalletContact.originalCardImageUrl ? (
                          <div className="mt-3 overflow-hidden rounded-xl border border-gold/14 bg-background/20">
                            <img
                              src={selectedWalletContact.originalCardImageUrl}
                              alt="Original scanned business card"
                              className="max-h-52 w-full object-contain"
                            />
                          </div>
                        ) : null}
                        <div className="mt-3 grid gap-2 text-sm text-muted">
                          {selectedWalletContact.display.email ? (
                            <p className="break-all">
                              <span className="font-medium text-foreground">Email: </span>
                              {selectedWalletContact.display.email}
                            </p>
                          ) : null}
                          {selectedWalletContact.display.phone ? (
                            <p>
                              <span className="font-medium text-foreground">Phone: </span>
                              {selectedWalletContact.display.phone}
                            </p>
                          ) : null}
                          {selectedWalletContact.websiteUrl ? (
                            <p className="break-all">
                              <span className="font-medium text-foreground">Website: </span>
                              {selectedWalletContact.websiteUrl}
                            </p>
                          ) : null}
                          {selectedWalletContact.address ? (
                            <p>
                              <span className="font-medium text-foreground">Address: </span>
                              {selectedWalletContact.address}
                            </p>
                          ) : null}
                        </div>
                        {Object.entries(selectedWalletContact.socialLinks).length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(selectedWalletContact.socialLinks).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="border-gold/18 text-gold">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {selectedWalletConnection ? (
                      <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={16} className="text-gold" />
                          <p className="text-sm font-semibold text-foreground">Connection</p>
                        </div>
                        {selectedWalletConnection.kind === "connected" ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gold">
                            <CheckCircle2 size={16} />
                            Connected in both Circle Wallets
                          </div>
                        ) : null}
                        {selectedWalletConnection.kind === "pending_outgoing" ? (
                          <div className="mt-3 space-y-3">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-silver">
                              <Send size={15} />
                              Request sent
                            </div>
                            {selectedWalletConnection.request.message ? (
                              <p className="rounded-xl border border-silver/14 bg-background/20 p-3 text-sm text-muted">
                                &ldquo;{selectedWalletConnection.request.message}&rdquo;
                              </p>
                            ) : null}
                            <form action={cancelCircleCardConnectionRequestAction}>
                              <input
                                type="hidden"
                                name="requestId"
                                value={selectedWalletConnection.request.id}
                              />
                              <input type="hidden" name="returnPath" value={walletReturnPath} />
                              <Button type="submit" variant="outline" size="sm" className="gap-2">
                                <XCircle size={14} />
                                Cancel request
                              </Button>
                            </form>
                          </div>
                        ) : null}
                        {selectedWalletConnection.kind === "pending_incoming" ? (
                          <div className="mt-3 space-y-3">
                            <p className="text-sm text-muted">
                              This contact has asked to connect with you.
                            </p>
                            {selectedWalletConnection.request.message ? (
                              <p className="rounded-xl border border-gold/14 bg-gold/8 p-3 text-sm text-muted">
                                &ldquo;{selectedWalletConnection.request.message}&rdquo;
                              </p>
                            ) : null}
                            <div className="grid gap-2 sm:grid-cols-2">
                              <form action={acceptCircleCardConnectionRequestAction}>
                                <input
                                  type="hidden"
                                  name="requestId"
                                  value={selectedWalletConnection.request.id}
                                />
                                <input type="hidden" name="returnPath" value={walletReturnPath} />
                                <Button type="submit" size="sm" className="w-full gap-2">
                                  <UserCheck size={14} />
                                  Accept
                                </Button>
                              </form>
                              <form action={declineCircleCardConnectionRequestAction}>
                                <input
                                  type="hidden"
                                  name="requestId"
                                  value={selectedWalletConnection.request.id}
                                />
                                <input type="hidden" name="returnPath" value={walletReturnPath} />
                                <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                                  <UserX size={14} />
                                  Decline
                                </Button>
                              </form>
                            </div>
                          </div>
                        ) : null}
                        {selectedWalletConnection.kind === "none" && selectedWalletContact.card?.id ? (
                          <form action={sendCircleCardConnectionRequestAction} className="mt-3 space-y-3">
                            <input
                              type="hidden"
                              name="recipientCardId"
                              value={selectedWalletContact.card.id}
                            />
                            <input type="hidden" name="returnPath" value={walletReturnPath} />
                            <Textarea
                              name="message"
                              rows={3}
                              maxLength={240}
                              placeholder="Hi, good to connect through Circle Card."
                              aria-label="Connection request message"
                            />
                            <Button type="submit" size="sm" className="w-full gap-2">
                              <Send size={14} />
                              Send Connection Request
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-gold/18 bg-background/18 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <UserCheck size={16} className="text-gold" />
                            <p className="text-sm font-semibold text-foreground">Introduce</p>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted">
                            Introduce this contact to another saved Circle Card contact with a short reason.
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit border-gold/20 text-gold">
                          Private
                        </Badge>
                      </div>

                      {canIntroduceSelectedContact && selectedIntroductionOptions.length ? (
                        <form action={createCircleCardIntroductionAction} className="mt-4 space-y-3">
                          <input
                            type="hidden"
                            name="personAWalletContactId"
                            value={selectedWalletContact.id}
                          />
                          <input type="hidden" name="returnPath" value={introductionOutgoingReturnPath} />
                          <div className="space-y-2">
                            <Label htmlFor="introduction-person-b">Introduce to</Label>
                            <Select id="introduction-person-b" name="personBWalletContactId" required>
                              {selectedIntroductionOptions.map((contact) => (
                                <option key={contact.id} value={contact.id}>
                                  {contact.display.fullName}
                                  {contact.display.businessName ? `, ${contact.display.businessName}` : ""}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="introduction-reason">Reason</Label>
                            <Textarea
                              id="introduction-reason"
                              name="reason"
                              rows={4}
                              maxLength={600}
                              required
                              placeholder="Sarah is looking at improving her website and Rhys specialises in web design."
                            />
                          </div>
                          <Button type="submit" className="w-full gap-2">
                            <Send size={16} />
                            Send Introduction
                          </Button>
                        </form>
                      ) : (
                        <p className="mt-4 rounded-xl border border-silver/14 bg-background/18 p-3 text-xs leading-relaxed text-muted">
                          Introductions need your own Circle Card and two saved contacts linked to published
                          Circle Cards.
                        </p>
                      )}

                      <Link
                        href={circleCardSectionHref("network", "introductions")}
                        className="mt-3 inline-flex text-xs font-medium text-silver hover:text-foreground"
                      >
                        View Introduction Centre
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-gold/18 bg-background/18 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Handshake size={16} className="text-gold" />
                            <p className="text-sm font-semibold text-foreground">Send Referral</p>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted">
                            Send someone to this contact because they may need what this contact offers.
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit border-gold/20 text-gold">
                          Referral
                        </Badge>
                      </div>

                      {canSendReferralToSelectedContact ? (
                        <form action={createCircleCardReferralAction} className="mt-4 space-y-3">
                          <input
                            type="hidden"
                            name="recipientWalletContactId"
                            value={selectedWalletContact.id}
                          />
                          <input type="hidden" name="returnPath" value={walletReturnPath} />
                          <input type="hidden" name="source" value="circle_wallet_contact" />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="wallet-referral-contact-name">Referred contact name</Label>
                              <Input
                                id="wallet-referral-contact-name"
                                name="referredContactName"
                                maxLength={140}
                                required
                                placeholder="Sarah Mitchell"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="wallet-referral-contact-business">Business</Label>
                              <Input
                                id="wallet-referral-contact-business"
                                name="referredContactBusiness"
                                maxLength={140}
                                placeholder="Sarah's Business"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="wallet-referral-contact-email">Email</Label>
                              <Input
                                id="wallet-referral-contact-email"
                                name="referredContactEmail"
                                type="email"
                                maxLength={320}
                                placeholder="sarah@example.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="wallet-referral-contact-phone">Phone</Label>
                              <Input
                                id="wallet-referral-contact-phone"
                                name="referredContactPhone"
                                maxLength={48}
                                placeholder="07700 900000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="wallet-referral-contact-website">Website</Label>
                              <Input
                                id="wallet-referral-contact-website"
                                name="referredContactWebsite"
                                maxLength={2048}
                                placeholder="https://example.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="wallet-referral-estimated-value">Estimated value</Label>
                              <Input
                                id="wallet-referral-estimated-value"
                                name="estimatedValue"
                                inputMode="decimal"
                                placeholder="Optional"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wallet-referral-reason">Reason</Label>
                            <Textarea
                              id="wallet-referral-reason"
                              name="reason"
                              rows={4}
                              maxLength={800}
                              required
                              placeholder="Sarah needs help improving her website."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wallet-referral-visibility">Visibility</Label>
                            <Select
                              id="wallet-referral-visibility"
                              name="visibility"
                              defaultValue="PRIVATE"
                            >
                              <option value="PRIVATE">Private</option>
                              <option value="PUBLIC_SUCCESS">Public success if won</option>
                            </Select>
                          </div>
                          <Button type="submit" className="w-full gap-2">
                            <Send size={16} />
                            Send Referral
                          </Button>
                        </form>
                      ) : (
                        <div className="mt-4 rounded-xl border border-silver/14 bg-background/18 p-3">
                          <p className="text-xs leading-relaxed text-muted">
                            Wallet referrals can be sent when this contact is linked to a published Circle Card.
                          </p>
                          <Link
                            href={circleCardSectionHref("business", "referrals")}
                            className="mt-2 inline-flex text-xs font-medium text-silver hover:text-foreground"
                          >
                            Open Referral Centre
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gold/18 bg-gold/8 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Star size={16} className="text-gold" />
                            <p className="text-sm font-semibold text-foreground">
                              Vouch For / Recommend
                            </p>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted">
                            Public recommendations may appear on their Circle Card and help others
                            discover trusted businesses.
                          </p>
                        </div>
                        {selectedWalletRecommendation ? (
                          <Badge
                            variant="outline"
                            className={
                              selectedWalletRecommendation.status === "ACTIVE"
                                ? "w-fit border-gold/28 text-gold"
                                : "w-fit border-silver/18 text-silver"
                            }
                          >
                            {selectedWalletRecommendation.status === "ACTIVE" ? "You recommend this person" : "Hidden"}
                          </Badge>
                        ) : null}
                      </div>

                      {selectedWalletRecommendation ? (
                        <div className="mt-4 rounded-xl border border-gold/14 bg-background/18 p-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-gold/22 text-gold">
                              {selectedWalletRecommendation.category}
                            </Badge>
                            <Badge variant="outline" className="border-silver/18 text-silver">
                              {circleCardRecommendationVisibilityLabel(selectedWalletRecommendation.visibility)}
                            </Badge>
                          </div>
                          {selectedWalletRecommendation.reason ? (
                            <p className="mt-3 text-sm leading-relaxed text-muted">
                              &ldquo;{selectedWalletRecommendation.reason}&rdquo;
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {selectedWalletRecommendation ? (
                        <form action={createCircleCardOpportunityAction} className="mt-3">
                          <input type="hidden" name="walletContactId" value={selectedWalletContact.id} />
                          <input type="hidden" name="returnPath" value={opportunityReturnPath} />
                          <input
                            type="hidden"
                            name="title"
                            value={`Opportunity with ${selectedWalletContact.display.fullName}`}
                          />
                          <input
                            type="hidden"
                            name="description"
                            value={selectedWalletRecommendation.reason ?? selectedWalletRecommendation.category}
                          />
                          <input type="hidden" name="sourceType" value="RECOMMENDATION" />
                          <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                            <ShoppingBag size={14} />
                            Create Opportunity
                          </Button>
                        </form>
                      ) : null}

                      {!selectedWalletContact.card?.id ? (
                        <p className="mt-4 rounded-xl border border-silver/14 bg-background/18 p-3 text-xs leading-relaxed text-muted">
                          This contact is not linked to a Circle Card yet. You can keep a private
                          recommendation in your wallet; public display unlocks once the contact has
                          a Circle Card.
                        </p>
                      ) : null}

                      <form action={upsertCircleCardRecommendationAction} className="mt-4 space-y-3">
                        <input type="hidden" name="walletContactId" value={selectedWalletContact.id} />
                        <input type="hidden" name="returnPath" value={walletReturnPath} />
                        {selectedWalletRecommendation ? (
                          <input
                            type="hidden"
                            name="recommendationId"
                            value={selectedWalletRecommendation.id}
                          />
                        ) : null}
                        <div className="space-y-2">
                          <Label htmlFor="recommendation-category">Category</Label>
                          <Select
                            id="recommendation-category"
                            name="category"
                            defaultValue={selectedRecommendationCategory}
                          >
                            {CIRCLE_CARD_RECOMMENDATION_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recommendation-reason">Short reason</Label>
                          <Textarea
                            id="recommendation-reason"
                            name="reason"
                            rows={3}
                            maxLength={360}
                            defaultValue={selectedWalletRecommendation?.reason ?? ""}
                            placeholder="Strong technically and easy to work with."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recommendation-visibility">Visibility</Label>
                          <Select
                            id="recommendation-visibility"
                            name="visibility"
                            defaultValue={selectedRecommendationVisibility}
                          >
                            <option value="PRIVATE">Private note only</option>
                            <option value="PUBLIC" disabled={!selectedWalletContact.card?.id}>
                              Public recommendation
                            </option>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full gap-2">
                          <Star size={16} />
                          {selectedWalletRecommendation ? "Save recommendation" : "Vouch For / Recommend"}
                        </Button>
                      </form>

                      {selectedWalletRecommendation ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {selectedWalletRecommendation.status === "ACTIVE" ? (
                            <form action={updateCircleCardRecommendationStatusAction}>
                              <input
                                type="hidden"
                                name="recommendationId"
                                value={selectedWalletRecommendation.id}
                              />
                              <input type="hidden" name="status" value="HIDDEN" />
                              <input type="hidden" name="returnPath" value={walletReturnPath} />
                              <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                                <Eye size={14} />
                                Hide
                              </Button>
                            </form>
                          ) : null}
                          <form action={updateCircleCardRecommendationStatusAction}>
                            <input
                              type="hidden"
                              name="recommendationId"
                              value={selectedWalletRecommendation.id}
                            />
                            <input type="hidden" name="status" value="REMOVED" />
                            <input type="hidden" name="returnPath" value={walletReturnPath} />
                            <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                              <Trash2 size={14} />
                              Remove
                            </Button>
                          </form>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Associated Opportunities</p>
                          <p className="mt-1 text-xs text-muted">
                            Opportunities linked to this saved contact stay visible here.
                          </p>
                        </div>
                        <Badge variant="muted" className="w-fit">
                          {selectedWalletOpportunities.length}
                        </Badge>
                      </div>

                      {selectedWalletOpportunities.length ? (
                        <div className="mt-4 space-y-2">
                          {selectedWalletOpportunities.slice(0, 4).map((opportunity) => {
                            const followUpStatus = getOpportunityFollowUpStatus(
                              opportunity.nextFollowUpAt,
                              todayUtc
                            );

                            return (
                              <Link
                                key={opportunity.id}
                                href={circleCardSectionHref("business", "opportunities")}
                                className="block rounded-xl border border-silver/14 bg-card/54 p-3 hover:border-gold/24"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="border-silver/18 text-silver">
                                    {circleCardOpportunityStatusLabel(opportunity.status)}
                                  </Badge>
                                  {followUpStatus ? (
                                    <Badge variant="outline" className={followUpStatus.className}>
                                      {followUpStatus.label}
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm font-semibold text-foreground">{opportunity.title}</p>
                                <p className="mt-1 text-xs text-muted">
                                  {formatOpportunityValue(opportunity.potentialValue, opportunity.currency)}
                                </p>
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-4 rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">
                          No opportunities linked to this contact yet.
                        </p>
                      )}

                      <form action={createCircleCardOpportunityAction} className="mt-4">
                        <input type="hidden" name="walletContactId" value={selectedWalletContact.id} />
                        <input type="hidden" name="returnPath" value={walletReturnPath} />
                        <input
                          type="hidden"
                          name="title"
                          value={`Opportunity with ${selectedWalletContact.display.fullName}`}
                        />
                        <input type="hidden" name="sourceType" value="CONNECTION" />
                        <Button type="submit" variant="outline" className="w-full gap-2">
                          <ShoppingBag size={16} />
                          Create Opportunity
                        </Button>
                      </form>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                        <CalendarDays size={16} className="text-silver" />
                        <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-silver">
                          Date saved
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {formatDate(selectedWalletContact.savedAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                        <Star size={16} className="text-silver" />
                        <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-silver">
                          Favourite
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {selectedWalletContact.favourite ? "Yes" : "No"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                        <CalendarDays size={16} className="text-silver" />
                        <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-silver">
                          Follow-up
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {selectedWalletContact.followUpDate
                            ? formatRelationshipDate(selectedWalletContact.followUpDate)
                            : "Not set"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                        <Activity size={16} className="text-silver" />
                        <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-silver">
                          Last interaction
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {selectedWalletContact.lastInteractionDate
                            ? formatRelationshipDate(selectedWalletContact.lastInteractionDate)
                            : "Not set"}
                        </p>
                      </div>
                    </div>

                    {selectedWalletContact.display.isScannedBusinessCard ? (
                      <div className="rounded-2xl border border-gold/18 bg-background/18 p-4">
                        <div className="flex items-center gap-2">
                          <WalletCards size={16} className="text-gold" />
                          <p className="text-sm font-semibold text-foreground">Claim Circle Card</p>
                        </div>
                        <p className="mt-2 text-sm text-muted">
                          We scanned your business card and added you to Circle Wallet. Claim your Circle Card.
                        </p>
                        {selectedClaimLink ? (
                          <div className="mt-3 space-y-2">
                            <Input readOnly value={selectedClaimLink} aria-label="Claim Circle Card link" />
                            <CircleCardCopyLinkButton
                              publicUrl={selectedClaimLink}
                              label="Copy Claim Link"
                              className="w-full"
                            />
                          </div>
                        ) : null}
                        <form action={generateBusinessCardClaimLinkAction} className="mt-3">
                          <input type="hidden" name="walletContactId" value={selectedWalletContact.id} />
                          <input type="hidden" name="returnPath" value={walletReturnPath} />
                          <Button
                            type="submit"
                            variant={selectedClaimLink ? "outline" : "default"}
                            className="w-full gap-2"
                            disabled={!selectedWalletContact.email}
                          >
                            <WalletCards size={16} />
                            {selectedClaimLink ? "Refresh Claim Link" : "Claim Circle Card"}
                          </Button>
                        </form>
                        {!selectedWalletContact.email ? (
                          <p className="mt-2 text-xs text-muted">Add an email to generate a claim link.</p>
                        ) : null}
                      </div>
                    ) : null}

                    <form action={updateCircleWalletContactDetailsAction} className="space-y-4">
                      <input type="hidden" name="walletContactId" value={selectedWalletContact.id} />
                      <input type="hidden" name="returnPath" value={walletReturnPath} />
                      <div className="space-y-2">
                        <Label htmlFor="wallet-notes" className="inline-flex items-center gap-2">
                          <StickyNote size={15} className="text-silver" />
                          Private Notes
                        </Label>
                        <Textarea
                          id="wallet-notes"
                          name="notes"
                          rows={5}
                          defaultValue={selectedWalletContact.notes ?? ""}
                          placeholder="Where you met, what mattered, and why to reconnect."
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="wallet-met-at" className="inline-flex items-center gap-2">
                            <ContactRound size={15} className="text-silver" />
                            Where We Met
                          </Label>
                          <Input
                            id="wallet-met-at"
                            name="metAt"
                            list="wallet-met-at-options"
                            defaultValue={selectedWalletContact.metAt ?? ""}
                            placeholder="Strelley Hall"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wallet-category" className="inline-flex items-center gap-2">
                            <Tag size={15} className="text-silver" />
                            Category
                          </Label>
                          <Input
                            id="wallet-category"
                            name="category"
                            list="wallet-category-options"
                            defaultValue={selectedWalletContact.category ?? ""}
                            placeholder="Accountant"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="wallet-follow-up-date" className="inline-flex items-center gap-2">
                            <CalendarDays size={15} className="text-silver" />
                            Follow-Up Date
                          </Label>
                          <Input
                            id="wallet-follow-up-date"
                            name="followUpDate"
                            type="date"
                            defaultValue={toDateInputValue(selectedWalletContact.followUpDate)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wallet-last-interaction-date" className="inline-flex items-center gap-2">
                            <Activity size={15} className="text-silver" />
                            Last Interaction
                          </Label>
                          <Input
                            id="wallet-last-interaction-date"
                            name="lastInteractionDate"
                            type="date"
                            defaultValue={toDateInputValue(selectedWalletContact.lastInteractionDate)}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              type="submit"
                              name="lastInteractionQuick"
                              value="today"
                              variant="outline"
                              size="sm"
                            >
                              Today
                            </Button>
                            <Button
                              type="submit"
                              name="lastInteractionQuick"
                              value="one-week-ago"
                              variant="outline"
                              size="sm"
                            >
                              1 Week Ago
                            </Button>
                            <Button
                              type="submit"
                              name="lastInteractionQuick"
                              value="one-month-ago"
                              variant="outline"
                              size="sm"
                            >
                              1 Month Ago
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wallet-tags" className="inline-flex items-center gap-2">
                          <Tag size={15} className="text-silver" />
                          Tags
                        </Label>
                        <Input
                          id="wallet-tags"
                          name="tagsInput"
                          defaultValue={selectedWalletContact.tags.join(", ")}
                          placeholder="investor, local, follow-up"
                        />
                        <div className="flex flex-wrap gap-2">
                          {selectedWalletContact.tags.length ? (
                            selectedWalletContact.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="border-silver/18 text-silver">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted">No tags added yet.</p>
                          )}
                        </div>
                      </div>
                      <datalist id="wallet-met-at-options">
                        {CIRCLE_WALLET_MET_AT_OPTIONS.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                      <datalist id="wallet-category-options">
                        {walletCategoryOptions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                      <Button type="submit" className="w-full gap-2">
                        <Save size={16} />
                        Save relationship details
                      </Button>
                    </form>

                    <div className="grid gap-3">
                      {selectedWalletContact.display.publicCardHref ? (
                        <Link
                          href={selectedWalletContact.display.publicCardHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button type="button" variant="outline" className="w-full gap-2">
                            Open public card
                            <ArrowUpRight size={16} />
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                    Save a Circle Card to start building relationship memory.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-gold/18 bg-gold/8">
              <CardHeader>
                <CardTitle className="text-lg">Relationship Memory</CardTitle>
                <CardDescription>
                  Categories, follow-ups, notes and context are kept together for future relationship tools.
                </CardDescription>
              </CardHeader>
            </Card>
          </aside>
        </div>
        ) : null}
        </div>
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="circle-card-settings"
        title="Settings"
        summary="Publishing, public link settings, standards and account controls"
        className={activeSection === "settings" ? undefined : "hidden"}
        defaultOpen
        badge={
          <Badge variant="outline" className="border-gold/28 text-gold">
            {card?.isPublished ? "Published" : card ? "Unpublished" : "Setup needed"}
          </Badge>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-lg">
                  <MenuIcon size={17} className="text-gold" />
                  Card Settings
                </CardTitle>
                <CardDescription>Manage the public slug and publishing state for this Circle Card.</CardDescription>
              </CardHeader>
              <CardContent>
                {card ? (
                  <form action={upsertCircleCardAction} className="space-y-4">
                    <input type="hidden" name="returnPath" value={circleCardSectionHref("settings", "circle-card-settings")} />
                    <input type="hidden" name="cardId" value={card.id} />
                    <input type="hidden" name="fullName" value={card.fullName} />
                    <input type="hidden" name="businessName" value={card.businessName ?? ""} />
                    <input type="hidden" name="role" value={card.role ?? ""} />
                    <input type="hidden" name="tagline" value={card.tagline ?? ""} />
                    <input type="hidden" name="about" value={card.about ?? ""} />
                    <input type="hidden" name="profileImageUrl" value={card.profileImageUrl ?? ""} />
                    <input type="hidden" name="businessLogoUrl" value={card.businessLogoUrl ?? ""} />
                    <input type="hidden" name="profileImagePositionX" value={card.profileImagePositionX ?? ""} />
                    <input type="hidden" name="profileImagePositionY" value={card.profileImagePositionY ?? ""} />
                    <input type="hidden" name="profileImageScale" value={card.profileImageScale ?? ""} />
                    <input type="hidden" name="businessLogoPositionX" value={card.businessLogoPositionX ?? ""} />
                    <input type="hidden" name="businessLogoPositionY" value={card.businessLogoPositionY ?? ""} />
                    <input type="hidden" name="businessLogoScale" value={card.businessLogoScale ?? ""} />
                    <input type="hidden" name="websiteUrl" value={card.websiteUrl ?? ""} />
                    <input type="hidden" name="email" value={card.email ?? ""} />
                    <input type="hidden" name="phone" value={card.phone ?? ""} />
                    <input type="hidden" name="location" value={card.location ?? ""} />
                    <input type="hidden" name="linkedinUrl" value={socialLinks.linkedin ?? ""} />
                    <input type="hidden" name="tiktokUrl" value={socialLinks.tiktok ?? ""} />
                    <input type="hidden" name="instagramUrl" value={socialLinks.instagram ?? ""} />
                    <input type="hidden" name="xUrl" value={socialLinks.x ?? ""} />
                    <input type="hidden" name="facebookUrl" value={socialLinks.facebook ?? ""} />
                    <input type="hidden" name="youtubeUrl" value={socialLinks.youtube ?? ""} />

                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="space-y-2">
                        <Label htmlFor="settings-slug">Public slug</Label>
                        <Input id="settings-slug" name="slug" defaultValue={card.slug} placeholder="your-name" />
                        <p className="break-all text-xs text-muted">
                          {publicUrl ?? absoluteUrl(`/card/${card.slug}`)}
                        </p>
                      </div>
                      <label
                        htmlFor="settings-isPublished"
                        className="flex min-h-11 items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
                      >
                        <input
                          id="settings-isPublished"
                          name="isPublished"
                          type="checkbox"
                          value="on"
                          defaultChecked={card.isPublished}
                          className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                        />
                        <span>
                          Published
                          <span className="mt-1 block text-xs text-muted">
                            Unpublished cards are not available at their public /card link.
                          </span>
                        </span>
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" className="gap-2">
                        <Save size={16} />
                        Save Settings
                      </Button>
                      <Link href={circleCardSectionHref("my-card", "card-identity")} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                        Edit Full Card
                        <ArrowUpRight size={16} />
                      </Link>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-5 text-sm text-muted">
                    Create your Circle Card before changing publishing settings.
                    <Link href={circleCardSectionHref("my-card", "circle-card-form")} className="mt-4 flex w-fit">
                      <Button type="button" className="gap-2">
                        <ContactRound size={16} />
                        Create Card
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-lg">
                  <BookOpen size={17} className="text-silver" />
                  Visibility Notes
                </CardTitle>
                <CardDescription>Keep public card details suitable for a professional business network.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Link href="/circle-card/community-standards" className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}>
                  Community Standards
                  <ArrowUpRight size={16} />
                </Link>
                <Link href={circleCardSectionHref("share", "share-assets")} className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}>
                  Share Controls
                  <Share2 size={16} />
                </Link>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card className="border-gold/18 bg-gold/8">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-lg">
                  <Activity size={17} className="text-gold" />
                  Future Modes
                </CardTitle>
                <CardDescription>Mode controls are reserved for a later Circle Card phase.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {["Business Mode", "Networking Mode", "Smart Mode later"].map((mode) => (
                  <Button key={mode} type="button" variant="outline" disabled className="justify-start gap-2">
                    <CheckCircle2 size={15} />
                    {mode}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-lg">
                  <Lock size={17} className="text-silver" />
                  Safety
                </CardTitle>
                <CardDescription>Public cards should stay useful, accurate and easy to trust.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted">
                <p>
                  Use the standards page for public-card expectations. If a card or interaction needs review,
                  report it from the relevant public surface or contact BCN support.
                </p>
                <Link href="/circle-card/community-standards" className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}>
                  Review Standards
                  <ArrowUpRight size={16} />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-lg">
                  <LogOut size={17} className="text-silver" />
                  Session
                </CardTitle>
                <CardDescription>Leave the Circle Card dashboard on this device.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={signOutAction}>
                  <Button type="submit" variant="outline" className="w-full gap-2">
                    <LogOut size={16} />
                    Sign Out
                  </Button>
                </form>
              </CardContent>
            </Card>
          </aside>
        </div>
      </CircleCardDashboardSection>
    </div>
  );
}
