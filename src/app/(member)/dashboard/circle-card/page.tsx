import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ContactRound,
  Camera,
  Crown,
  Download,
  Eye,
  Filter,
  Link as LinkIcon,
  Lock,
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
  cancelCircleCardConnectionRequestAction,
  deleteCircleCardLinkAction,
  declineCircleCardConnectionRequestAction,
  generateBusinessCardClaimLinkAction,
  moveCircleCardLinkAction,
  removeCircleWalletContactAction,
  resolveCircleCardLinkAction,
  saveCircleWalletContactAction,
  sendCircleCardConnectionRequestAction,
  toggleCircleWalletFavouriteAction,
  toggleCircleCardLinkAction,
  updateCircleWalletContactDetailsAction,
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
import { absoluteUrl, cn, formatDate } from "@/lib/utils";
import { getCircleCardAnalyticsSummary } from "@/server/circle-card";

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

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  "card-link-invalid": "Enter a valid Circle Card link or slug.",
  "card-link-not-found": "No published Circle Card was found for that link.",
  "wallet-contact-invalid": "Check the relationship details and try again.",
  "wallet-contact-not-found": "That saved contact could not be found.",
  "business-card-invalid": "Check the scanned business card details and try again.",
  "claim-link-email-required": "Add an email before generating a claim link."
};

const WALLET_VIEW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "favourites", label: "Favourites" },
  { value: "requests", label: "Requests" },
  { value: "recent", label: "Recent" }
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
type WalletFollowUpFilter = (typeof WALLET_FOLLOW_UP_FILTER_OPTIONS)[number]["value"];

function resolveWalletView(value: string | undefined): WalletView {
  return value === "connected" || value === "favourites" || value === "requests" || value === "recent"
    ? value
    : "all";
}

function resolveWalletFollowUpFilter(value: string | undefined): WalletFollowUpFilter {
  return value === "needs-follow-up" ? value : "";
}

function buildWalletHref(input: {
  walletQuery?: string;
  walletView?: WalletView;
  walletCategory?: string;
  walletFollowUp?: WalletFollowUpFilter;
  contactId?: string | null;
}) {
  const params = new URLSearchParams();

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

export default async function CircleCardDashboardPage({ searchParams }: PageProps) {
  const session = await requireCircleCardUser();
  const params = await searchParams;
  const notice = firstValue(params.notice);
  const created = firstValue(params.created) === "1";
  const error = firstValue(params.error);
  const walletQuery = (firstValue(params.walletQuery) ?? "").trim();
  const walletView = resolveWalletView(firstValue(params.walletView));
  const walletCategory = (firstValue(params.walletCategory) ?? "").trim();
  const walletFollowUp = resolveWalletFollowUpFilter(firstValue(params.walletFollowUp));
  const selectedContactId = firstValue(params.contactId);
  const connectCardSlug = resolveCircleCardLookupSlug(firstValue(params.connectCard));
  const [card, cardCount, member, walletContacts, connectionRequests, connectHubCard] = await Promise.all([
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
      : Promise.resolve(null)
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
    ? `/dashboard/circle-card?connectCard=${encodeURIComponent(connectHubCard.slug)}#connect-hub`
    : "/dashboard/circle-card#connect-hub";
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
    { label: "Wallet removes", value: analytics?.counts.WALLET_REMOVE ?? 0 }
  ];

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
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <a
                href="#connect-hub"
                className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}
              >
                <Share2 size={16} />
                Connect Hub
              </a>
              <a
                href="#public-card"
                className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}
              >
                <QrCode size={16} />
                QR
              </a>
              <a
                href="#wallet"
                className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}
              >
                <WalletCards size={16} />
                Wallet
              </a>
              <a
                href="#analytics"
                className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}
              >
                <BarChart3 size={16} />
                Analytics
              </a>
              {card ? (
                <Link
                  href={`/card/${card.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants(), "h-11 gap-2")}
                >
                  Public card
                  <ArrowUpRight size={16} />
                </Link>
              ) : (
                <a href="#circle-card-form" className={cn(buttonVariants(), "h-11 gap-2")}>
                  Create card
                  <ArrowUpRight size={16} />
                </a>
              )}
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
                href="#public-card"
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

      <CircleCardDashboardSection
        id="connect-hub"
        title="Connect Hub"
        summary="Share your card, add someone by link, and move quickly into wallet connections"
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
                      <a href="#public-card" className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-2")}>
                        <QrCode size={16} />
                        QR
                      </a>
                      <a
                        href="#share-assets"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "h-auto min-h-10 gap-2 px-2 text-center text-xs leading-tight sm:text-sm"
                        )}
                      >
                        <QrCode size={16} />
                        <span>Need QR/NFC assets?</span>
                      </a>
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
                    href="/dashboard/circle-card?walletView=requests#wallet"
                    className="rounded-2xl border border-gold/18 bg-gold/8 p-4 hover:border-gold/32"
                  >
                    <span className="text-2xl font-semibold text-foreground">{pendingIncomingRequests.length}</span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.08em] text-gold">Incoming</span>
                  </a>
                  <a
                    href="/dashboard/circle-card?walletView=requests#wallet"
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card id="circle-card-form" className="scroll-mt-24 border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle>{card ? "Edit your Circle Card" : "Create your first Circle Card"}</CardTitle>
            <CardDescription>
              Keep the card focused on the details people need when they want to reconnect.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertCircleCardAction} className="space-y-5">
              <input type="hidden" name="returnPath" value="/dashboard/circle-card" />
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
                  <input type="hidden" name="returnPath" value="/dashboard/circle-card" />
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
                                <input type="hidden" name="returnPath" value="/dashboard/circle-card" />
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
                                <input type="hidden" name="returnPath" value="/dashboard/circle-card" />
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
                                <input type="hidden" name="returnPath" value="/dashboard/circle-card" />
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
                                <input type="hidden" name="returnPath" value="/dashboard/circle-card" />
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
                              <input type="hidden" name="returnPath" value="/dashboard/circle-card" />
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
        badge={
          <span className="inline-flex gap-2">
            <Badge variant="muted">{savedContactCount} saved</Badge>
            <Badge variant="outline" className="border-gold/28 text-gold">
              {connectedWalletContacts.length} connected
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
                            <input type="hidden" name="returnPath" value="/dashboard/circle-card?walletView=requests" />
                            <Button type="submit" size="sm" className="w-full gap-2">
                              <UserCheck size={14} />
                              Accept
                            </Button>
                          </form>
                          <form action={declineCircleCardConnectionRequestAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="returnPath" value="/dashboard/circle-card?walletView=requests" />
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
                            <input type="hidden" name="returnPath" value="/dashboard/circle-card?walletView=requests" />
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
    </div>
  );
}
