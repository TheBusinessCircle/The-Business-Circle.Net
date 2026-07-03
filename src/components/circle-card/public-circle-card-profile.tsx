import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  acceptCircleCardConnectionRequestAction,
  cancelCircleCardConnectionRequestAction,
  declineCircleCardConnectionRequestAction,
  removeCircleWalletContactAction,
  saveCircleWalletContactAction,
  sendCircleCardConnectionRequestAction,
  spinToConnectCircleCardAction
} from "@/actions/circle-card.actions";
import { CircleCardAboutExpander } from "@/components/circle-card/circle-card-about-expander";
import { CircleCardFramedImage } from "@/components/circle-card/circle-card-framed-image";
import { CircleCardInstallPrompt } from "@/components/circle-card/circle-card-install-prompt";
import { CircleCardLogoMark } from "@/components/circle-card/circle-card-logo-mark";
import { CircleCardPrivateLinkAction } from "@/components/circle-card/circle-card-private-link-action";
import { PublicCircleCardGallery } from "@/components/circle-card/public-circle-card-gallery";
import { PublicCircleCardReviews } from "@/components/circle-card/public-circle-card-reviews";
import { PublicCircleTrustPanel } from "@/components/circle-card/public-circle-trust-panel";
import { CircleCardQrPanel } from "@/components/circle-card/circle-card-qr-panel";
import { CircleCardReportForm } from "@/components/circle-card/circle-card-report-form";
import { CircleCardShareButton } from "@/components/circle-card/circle-card-share-button";
import {
  CircleCardSpinToConnect,
  type CircleCardSpinState
} from "@/components/circle-card/circle-card-spin-to-connect";
import { CircleCardTrackedLink } from "@/components/circle-card/circle-card-tracked-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CircleCardEventTypeValue } from "@/lib/circle-card/analytics-events";
import type { CircleCardShareSource } from "@/lib/circle-card/share-sources";
import {
  circleCardTestimonialFlowHref
} from "@/lib/circle-card/wallet-testimonials";
import {
  getCircleCardAccountTypeLabel,
  getCircleCardIdentityTagLabel
} from "@/lib/circle-card/identity";
import {
  CIRCLE_CARD_WEEKDAYS,
  circleCardFeaturedContentPreviewImage,
  circleCardBookingPhoneHref,
  circleCardBookingWhatsAppHref,
  circleCardOpeningHoursDayLabel
} from "@/lib/circle-card/content-blocks";
import { getCircleCardTypeLabel } from "@/lib/circle-card/card-types";
import { resolvePublicCircleCardLayout } from "@/lib/circle-card/profile-layout";
import {
  buildCircleCardFileActionLabel,
  circleCardFileActionLabel,
  circleCardFileKindLabel,
  detectCircleCardFileKind,
  resolveCircleCardFileAction
} from "@/lib/circle-card/file-actions";
import { getExternalLinkProps } from "@/lib/links";
import {
  buildCircleCardThemeStyle,
  resolveCircleCardTheme
} from "@/lib/circle-card/theme";
import {
  isSafeCircleCardLinkDestination,
  type CircleCardSocialPlatform
} from "@/lib/circle-card/schema";
import { cn } from "@/lib/utils";
import type { PublicCircleCard } from "@/server/circle-card";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Award,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Crown,
  Download,
  Eye,
  Handshake,
  Facebook,
  FileText,
  Globe2,
  Instagram,
  LinkIcon,
  Linkedin,
  LogIn,
  Mail,
  Menu as MenuIcon,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Podcast,
  Send,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Twitch,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  Users,
  WalletCards,
  XCircle,
  Youtube
} from "lucide-react";

type SavedCircleWalletContact = {
  id: string;
  favourite: boolean;
} | null;

type PublicCircleCardConnectionState = {
  viewerPrimaryCardId: string | null;
  request: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
    direction: "OUTGOING" | "INCOMING";
    message: string | null;
  } | null;
};

type PublicCircleCardProfileProps = {
  card: PublicCircleCard;
  publicUrl: string;
  analyticsCardId?: string;
  viewerIsOwner: boolean;
  isAuthenticated: boolean;
  savedContact: SavedCircleWalletContact;
  connectionState: PublicCircleCardConnectionState;
  ownerAccountLabel: string;
  ownerIsBcnMember: boolean;
  source?: CircleCardShareSource;
  spinState?: CircleCardSpinState | null;
  viewerCircleConnectionCount?: number | null;
  notice?: string;
  error?: string;
};

type SocialPlatformConfig = {
  key: CircleCardSocialPlatform;
  label: string;
  icon: LucideIcon;
  handlePrefix?: boolean;
};

const NOTICE_MESSAGES: Record<string, string> = {
  "card-saved": "Card saved to your Circle Wallet.",
  "card-already-saved": "This card is already in your Circle Wallet.",
  "card-removed": "Card removed from your Circle Wallet.",
  "own-card": "This is your Circle Card.",
  "connection-request-sent": "Connection request sent.",
  "connection-request-accepted": "Connection request accepted. You are now mutually saved.",
  "connection-request-declined": "Connection request declined.",
  "connection-request-cancelled": "Connection request cancelled.",
  "connection-request-pending": "A connection request is already pending.",
  "connection-request-incoming": "They have already sent you a connection request.",
  "connection-already-connected": "You are already connected."
};

const ERROR_MESSAGES: Record<string, string> = {
  "missing-card": "That Circle Card could not be saved.",
  "card-not-found": "That Circle Card could not be found.",
  "connection-invalid": "Check the connection request and try again.",
  "connection-card-not-found": "That Circle Card could not be found.",
  "connection-primary-card-required": "Create your own Circle Card before sending requests.",
  "connection-save-first": "Save this card to your Circle Wallet before sending a request.",
  "connection-request-not-found": "That connection request is no longer pending.",
  "connection-request-failed": "The connection request could not be sent.",
  "connection-rate-limited": "You've sent several connection requests recently. Please try again later.",
  "card-save-failed": "That Circle connection could not be created."
};

const SOCIAL_CONTACT_PLATFORMS: readonly SocialPlatformConfig[] = [
  { key: "tiktok", label: "TikTok", icon: Music2, handlePrefix: true },
  { key: "instagram", label: "Instagram", icon: Instagram, handlePrefix: true },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "x", label: "X", icon: AtSign, handlePrefix: true },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "discord", label: "Discord", icon: MessageCircle },
  { key: "website", label: "Website", icon: Globe2 },
  { key: "twitch", label: "Twitch", icon: Twitch, handlePrefix: true },
  { key: "podcast", label: "Podcast", icon: Podcast },
  { key: "other", label: "Other", icon: LinkIcon }
] as const;

const primaryActionClassName =
  "h-12 w-full rounded-2xl border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] text-[var(--cc-theme-button-text)] shadow-[var(--cc-theme-button-shadow)] hover:border-gold/70 hover:brightness-110";

const secondaryActionClassName =
  "h-12 w-full rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] text-foreground shadow-[var(--cc-theme-secondary-shadow)] hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)] hover:text-foreground";

const mobileActionClassName =
  "h-12 w-full min-w-0 flex-col gap-0.5 rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] px-1 text-[11px] leading-none text-foreground shadow-[0_10px_26px_rgba(2,8,23,0.34)] hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)]";

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

function mapsHref(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function displayHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function readPathSegments(value: string) {
  try {
    return new URL(value).pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function cleanUrlSegment(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value)
      .replace(/^@+/, "")
      .replace(/\.(aspx|html?)$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
  } catch {
    return value.replace(/^@+/, "").replace(/[-_]+/g, " ").trim();
  }
}

function handleValue(value: string) {
  try {
    const cleaned = decodeURIComponent(value).replace(/^@+/, "").trim();
    return cleaned ? `@${cleaned}` : "";
  } catch {
    const cleaned = value.replace(/^@+/, "").trim();
    return cleaned ? `@${cleaned}` : "";
  }
}

function socialDisplayValue(platform: SocialPlatformConfig, href: string) {
  const url = readUrl(href);
  const segments = readPathSegments(href);
  const firstSegment = segments[0]?.toLowerCase();

  if (platform.key === "linkedin") {
    if ((firstSegment === "in" || firstSegment === "company") && segments[1]) {
      return cleanUrlSegment(segments[1]);
    }

    return cleanUrlSegment(segments[0]) || displayHost(href);
  }

  if (platform.key === "youtube") {
    if (segments[0]?.startsWith("@")) {
      return handleValue(segments[0]);
    }

    if ((firstSegment === "c" || firstSegment === "user") && segments[1]) {
      return cleanUrlSegment(segments[1]);
    }

    if (firstSegment === "channel") {
      return "YouTube channel";
    }

    return cleanUrlSegment(segments[0]) || "YouTube";
  }

  if (platform.key === "facebook") {
    if (firstSegment === "profile.php") {
      return "Facebook profile";
    }

    if ((firstSegment === "pages" || firstSegment === "groups") && segments[1]) {
      return cleanUrlSegment(segments[1]);
    }

    return cleanUrlSegment(segments[0]) || displayHost(href);
  }

  if (platform.key === "discord") {
    const host = url?.hostname.replace(/^www\./, "").toLowerCase() ?? "";

    if (host === "discord.gg") {
      return segments[0] ? `Invite: ${cleanUrlSegment(segments[0])}` : "Discord invite";
    }

    if (firstSegment === "invite" && segments[1]) {
      return `Invite: ${cleanUrlSegment(segments[1])}`;
    }

    if (firstSegment === "users" && segments[1]) {
      return handleValue(segments[1]);
    }

    if (firstSegment === "channels" || firstSegment === "servers") {
      return "Discord server";
    }

    return cleanUrlSegment(segments[0]) || "Discord";
  }

  const ignoredSegments = new Set(["i", "intent", "share", "status", "video", "reel", "p"]);
  const candidate = segments.find((segment) => !ignoredSegments.has(segment.toLowerCase()));

  if (!candidate) {
    return url ? url.hostname.replace(/^www\./, "") : displayHost(href);
  }

  if (platform.handlePrefix) {
    return handleValue(candidate);
  }

  return cleanUrlSegment(candidate);
}

function analyticsUrlValue(value: string) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

function publicCardPath(slug: string, source?: CircleCardShareSource, spin?: CircleCardSpinState) {
  const params = new URLSearchParams();

  if (source && source !== "direct") {
    params.set("source", source);
  }

  if (spin) {
    params.set("spin", spin);
  }

  const query = params.toString();
  return query ? `/card/${slug}?${query}` : `/card/${slug}`;
}

function customLinkIcon(link: PublicCircleCard["customLinks"][number]) {
  switch (link.type) {
    case "BOOK_CALL":
      return <CalendarDays size={18} />;
    case "PORTFOLIO":
      return <BriefcaseBusiness size={18} />;
    case "LATEST_OFFER":
      return <Sparkles size={18} />;
    case "COMMUNITY":
      return <Users size={18} />;
    case "DOWNLOAD":
      return <Download size={18} />;
    case "REVIEW":
      return <Star size={18} />;
    case "SHOP":
      return <ShoppingBag size={18} />;
    case "MENU":
      return <MenuIcon size={18} />;
    case "CASE_STUDY":
      return <BookOpen size={18} />;
    default:
      break;
  }

  switch (link.icon) {
    case "calendar":
      return <CalendarDays size={18} />;
    case "portfolio":
      return <BriefcaseBusiness size={18} />;
    case "offer":
      return <Sparkles size={18} />;
    case "community":
      return <Users size={18} />;
    case "download":
      return <Download size={18} />;
    case "review":
      return <Star size={18} />;
    case "shop":
      return <ShoppingBag size={18} />;
    case "menu":
      return <MenuIcon size={18} />;
    case "case-studies":
      return <BookOpen size={18} />;
    default:
      return <LinkIcon size={18} />;
  }
}

function customLinkDisplayLabel(link: PublicCircleCard["customLinks"][number]) {
  if (link.fileUrl || link.fileMimeType || link.fileName) {
    return buildCircleCardFileActionLabel({
      linkType: link.type,
      label: link.label,
      buttonText: link.buttonText,
      actionMode: link.actionMode,
      fileMimeType: link.fileMimeType,
      fileName: link.fileName,
      fileUrl: link.fileUrl
    });
  }

  if (link.buttonText) {
    return link.buttonText;
  }

  switch (link.type) {
    case "BOOK_CALL":
      return link.label || "Book a call";
    case "DOWNLOAD":
      return link.label || "Download";
    case "REVIEW":
      return link.label || "Leave a review";
    case "SHOP":
      return link.label || "Shop";
    case "MENU":
      return link.label || "View menu";
    case "CASE_STUDY":
      return link.label || "View case study";
    default:
      return link.label;
  }
}

function customLinkHref(link: PublicCircleCard["customLinks"][number]) {
  if (link.visibility === "PRIVATE_CODE") {
    return "";
  }

  const destination = link.fileUrl || link.url || "";
  return isSafeCircleCardLinkDestination(destination) ? destination : "";
}

function customLinkAnchorProps(link: PublicCircleCard["customLinks"][number], href: string) {
  if (link.fileUrl || link.fileMimeType || link.fileName) {
    const action = resolveCircleCardFileAction(link);

    if (action === "VIEW") {
      return {
        href,
        target: "_blank" as const,
        rel: "noopener noreferrer"
      };
    }
  }

  return getExternalLinkProps(href);
}

function offerEndDescription(link: PublicCircleCard["customLinks"][number]) {
  if (link.type !== "LATEST_OFFER" || !link.expiresAt) {
    return link.description;
  }

  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(link.expiresAt));

  return [link.description, `Offer ends ${dateLabel}`].filter(Boolean).join(" · ");
}

function roleLine(card: PublicCircleCard) {
  return [card.role, card.businessName].filter(Boolean).join(" at ");
}

function membershipBadgeLabel(card: PublicCircleCard, ownerIsBcnMember: boolean) {
  if (!ownerIsBcnMember) {
    return null;
  }

  if (card.user.role === "ADMIN" || card.user.membershipTier === "CORE") {
    return "BCN Core";
  }

  if (card.user.membershipTier === "INNER_CIRCLE") {
    return "BCN Inner Circle";
  }

  return "BCN Foundation";
}

type PremiumBadgeProps = {
  icon: ReactNode;
  label: string;
  muted?: boolean;
};

function PremiumBadge({ icon, label, muted = false }: PremiumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-inner-surface",
        muted
          ? "border-silver/14 bg-white/[0.035] text-silver"
          : "border-gold/28 bg-gold/12 text-gold"
      )}
    >
      {icon}
      {label}
    </span>
  );
}

type ContactActionProps = {
  icon: ReactNode;
  label: string;
  value: string;
  description?: string | null;
  href: string;
  anchorProps?: AnchorHTMLAttributes<HTMLAnchorElement>;
  analyticsCardId?: string;
  eventType?: CircleCardEventTypeValue;
  metadata?: Record<string, unknown>;
  thumbnailUrl?: string | null;
};

type ContactRow = ContactActionProps & {
  key: string;
  isSocial?: boolean;
};

function ContactAction({
  icon,
  label,
  value,
  description,
  href,
  anchorProps,
  analyticsCardId,
  eventType,
  metadata,
  thumbnailUrl
}: ContactActionProps) {
  const className =
    "group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-silver/14 bg-white/[0.035] px-3.5 py-3 text-left shadow-inner-surface transition-all hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)] sm:px-4";
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gold/18 bg-gold/10 text-gold">
          {thumbnailUrl ? (
            <CircleCardFramedImage src={thumbnailUrl} alt="" className="h-full w-full object-cover">
              {icon}
            </CircleCardFramedImage>
          ) : (
            icon
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-muted">{label}</span>
          <span className="block truncate text-sm font-medium text-foreground">{value}</span>
          {description ? (
            <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted">
              {description}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight
        size={17}
        aria-hidden="true"
        className="shrink-0 text-silver transition-colors group-hover:text-gold"
      />
    </>
  );

  if (eventType && analyticsCardId) {
    return (
      <CircleCardTrackedLink
        {...anchorProps}
        href={href}
        cardId={analyticsCardId}
        eventType={eventType}
        metadata={metadata}
        className={className}
      >
        {content}
      </CircleCardTrackedLink>
    );
  }

  return (
    <a {...anchorProps} href={href} className={className}>
      {content}
    </a>
  );
}

const CREATOR_PRIMARY_CTA_PRIORITY: Partial<Record<PublicCircleCard["customLinks"][number]["type"], number>> = {
  LATEST_OFFER: 0,
  COMMUNITY: 1,
  DOWNLOAD: 2,
  BOOK_CALL: 3
};

function creatorLinkAccentLabel(link: PublicCircleCard["customLinks"][number]) {
  switch (link.type) {
    case "LATEST_OFFER":
      return "Latest offer";
    case "COMMUNITY":
      return "Community";
    case "BOOK_CALL":
      return "Book a call";
    case "DOWNLOAD":
      return link.fileUrl ? "Download" : "Resource";
    case "SHOP":
      return "Shop";
    case "PORTFOLIO":
      return "Portfolio";
    case "CASE_STUDY":
      return "Proof";
    default:
      return "Featured";
  }
}

function creatorFeaturedLinks(card: PublicCircleCard) {
  return [...card.customLinks]
    .filter((link) => link.visibility === "PRIVATE_CODE" || Boolean(customLinkHref(link)))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function creatorPublicActionLinks(card: PublicCircleCard) {
  return [...card.customLinks]
    .filter((link) => link.visibility !== "PRIVATE_CODE" && Boolean(customLinkHref(link)))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function selectCreatorPrimaryLink(card: PublicCircleCard, websiteAvailable: boolean) {
  const publicLinks = creatorPublicActionLinks(card);
  const priorityLink =
    [...publicLinks]
      .filter((link) => CREATOR_PRIMARY_CTA_PRIORITY[link.type] !== undefined)
      .sort(
        (a, b) =>
          (CREATOR_PRIMARY_CTA_PRIORITY[a.type] ?? 20) -
            (CREATOR_PRIMARY_CTA_PRIORITY[b.type] ?? 20) ||
          a.sortOrder - b.sortOrder
      )[0] ?? null;

  if (priorityLink || websiteAvailable) {
    return priorityLink;
  }

  return publicLinks[0] ?? null;
}

function creatorLinkPlatformLabel(link: PublicCircleCard["customLinks"][number]) {
  const href = customLinkHref(link);

  if (!href) {
    return link.visibility === "PRIVATE_CODE" ? "Private access" : creatorLinkAccentLabel(link);
  }

  return displayHost(href);
}

function creatorLinkCtaLabel(link: PublicCircleCard["customLinks"][number]) {
  if (link.buttonText) {
    return link.buttonText;
  }

  if (link.fileUrl || link.fileMimeType || link.fileName) {
    return circleCardFileActionLabel(resolveCircleCardFileAction(link));
  }

  switch (link.type) {
    case "LATEST_OFFER":
      return "View offer";
    case "COMMUNITY":
      return "Join";
    case "DOWNLOAD":
      return "Get it";
    case "BOOK_CALL":
      return "Book";
    case "SHOP":
      return "Shop";
    case "PORTFOLIO":
      return "View work";
    case "CASE_STUDY":
      return "Read";
    case "REVIEW":
      return "Review";
    case "MENU":
      return "View";
    default:
      return "Open";
  }
}

function FeaturedLinkCard({
  link,
  analyticsCardId,
  layout,
  source = "public_card"
}: {
  link: PublicCircleCard["customLinks"][number];
  analyticsCardId?: string;
  layout: PublicCircleCard["profileLayout"];
  source?: string;
}) {
  const accentLabel = creatorLinkAccentLabel(link);
  const description = offerEndDescription(link);
  const platformLabel = creatorLinkPlatformLabel(link);
  const ctaLabel = creatorLinkCtaLabel(link);

  if (link.visibility === "PRIVATE_CODE") {
    return (
      <article className="group relative overflow-hidden rounded-[1.6rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(22,39,45,0.9),rgba(8,16,32,0.96)_48%,rgba(4,10,24,0.98))] p-3 shadow-[0_22px_56px_rgba(0,0,0,0.26)] transition-all hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-[0_28px_72px_rgba(212,175,95,0.14)] sm:p-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,95,0.62),rgba(68,211,188,0.38),transparent)]"
        />
        <div className="relative mb-4 aspect-[1.7] overflow-hidden rounded-[1.15rem] border border-silver/14 bg-[image:var(--cc-theme-media-bg)]">
          {link.imageUrl ? (
            <>
              <CircleCardFramedImage
                src={link.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,19,0.1),rgba(3,8,19,0.78))]" />
            </>
          ) : null}
          <span className="absolute left-4 top-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/28 bg-[#061126]/72 text-gold shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur">
            {customLinkIcon(link)}
          </span>
          <span className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
            <span className="min-w-0 truncate rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-silver backdrop-blur">
              {platformLabel}
            </span>
            <span className="rounded-full border border-gold/28 bg-gold/12 px-3 py-1.5 text-xs font-medium text-gold">
              {accentLabel}
            </span>
          </span>
        </div>
        <div className="px-1 pb-1">
          <p className="line-clamp-2 text-xl font-semibold leading-tight text-foreground">
            {customLinkDisplayLabel(link)}
          </p>
          {description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        <CircleCardPrivateLinkAction
          linkId={link.id}
          type={link.type}
          value={customLinkDisplayLabel(link)}
          description={description}
          accessCodeHint={link.accessCodeHint}
          hasAccessCode={link.hasAccessCode}
        />
      </article>
    );
  }

  const href = customLinkHref(link);

  if (!href) {
    return null;
  }

  return (
    <CircleCardTrackedLink
      {...customLinkAnchorProps(link, href)}
      href={href}
      cardId={analyticsCardId ?? ""}
      eventType="CUSTOM_LINK_CLICK"
      metadata={{
        source,
        layout,
        linkId: link.id,
        label: link.label,
        type: link.type,
        actionMode: link.actionMode,
        resolvedAction: link.fileUrl || link.fileMimeType || link.fileName
          ? resolveCircleCardFileAction(link)
          : undefined,
        url: analyticsUrlValue(href)
      }}
      className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-[1.6rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(22,39,45,0.9),rgba(8,16,32,0.96)_48%,rgba(4,10,24,0.98))] p-3 shadow-[0_22px_56px_rgba(0,0,0,0.26)] transition-all hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-[0_28px_72px_rgba(68,211,188,0.13)] sm:p-4"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,95,0.62),rgba(68,211,188,0.38),transparent)]"
      />
      <span className="relative z-10 mb-4 block aspect-[1.7] overflow-hidden rounded-[1.15rem] border border-silver/14 bg-[image:var(--cc-theme-media-bg)]">
        {link.imageUrl ? (
          <>
            <CircleCardFramedImage
              src={link.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,19,0.08),rgba(3,8,19,0.76))]" />
          </>
        ) : null}
        <span className="absolute left-4 top-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/28 bg-[#061126]/72 text-gold shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur transition-transform group-hover:scale-105">
          {customLinkIcon(link)}
        </span>
        <span className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-silver backdrop-blur">
            {platformLabel}
          </span>
          <span className="rounded-full border border-gold/28 bg-gold/12 px-3 py-1.5 text-xs font-medium text-gold">
            {accentLabel}
          </span>
        </span>
      </span>
      <span className="relative z-10 flex flex-1 flex-col px-1 pb-1">
        <span className="line-clamp-2 text-xl font-semibold leading-tight text-foreground">
          {customLinkDisplayLabel(link)}
        </span>
        {description ? (
          <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{description}</span>
        ) : null}
        <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-gold/28 bg-gold/12 px-3 py-1.5 text-sm font-semibold text-gold transition-colors group-hover:border-gold/45 group-hover:bg-gold/18">
          {ctaLabel}
          <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </CircleCardTrackedLink>
  );
}

function creatorPlatformIcon(platform: PublicCircleCard["featuredContentItems"][number]["platform"]) {
  switch (platform) {
    case "YouTube": return <Youtube size={20} />;
    case "Instagram": return <Instagram size={20} />;
    case "Facebook": return <Facebook size={20} />;
    case "LinkedIn": return <Linkedin size={20} />;
    case "Twitch": return <Twitch size={20} />;
    case "Spotify": return <Music2 size={20} />;
    case "Apple Podcasts":
    case "Podcast RSS": return <Podcast size={20} />;
    case "Newsletter": return <Mail size={20} />;
    case "Blog": return <BookOpen size={20} />;
    case "TikTok":
    case "X":
    case "Threads": return <AtSign size={20} />;
    default: return <Globe2 size={20} />;
  }
}

function CreatorFeaturedContentCard({
  item,
  analyticsCardId
}: {
  item: PublicCircleCard["featuredContentItems"][number];
  analyticsCardId?: string;
}) {
  const previewImage = circleCardFeaturedContentPreviewImage(item);
  const dateLabel = item.publishedDate
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
        .format(new Date(`${item.publishedDate}T00:00:00.000Z`))
    : null;

  return (
    <CircleCardTrackedLink
      {...getExternalLinkProps(item.url)}
      cardId={analyticsCardId ?? ""}
      eventType="CUSTOM_LINK_CLICK"
      metadata={{ source: "creator_featured_content", itemId: item.id, platform: item.platform, url: analyticsUrlValue(item.url) }}
      className="group flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-[1.6rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(22,39,45,0.9),rgba(8,16,32,0.96)_48%,rgba(4,10,24,0.98))] p-3 shadow-[0_22px_56px_rgba(0,0,0,0.26)] transition hover:-translate-y-0.5 hover:border-cyan-300/30 sm:p-4"
    >
      <span className="relative mb-4 block aspect-[1.7] overflow-hidden rounded-[1.15rem] border border-silver/14 bg-[image:var(--cc-theme-media-bg)]">
        {previewImage ? <img src={previewImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : null}
        {previewImage ? <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(3,8,19,0.72))]" /> : null}
        <span className="absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/24 bg-[#061126]/78 text-cyan-100 backdrop-blur">{creatorPlatformIcon(item.platform)}</span>
        <span className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full border border-white/12 bg-black/30 px-3 py-1.5 text-xs font-medium text-silver backdrop-blur">{item.platform}</span>
          {item.isFeatured ? <span className="rounded-full border border-gold/28 bg-gold/12 px-3 py-1.5 text-xs font-medium text-gold">Featured</span> : null}
        </span>
      </span>
      <span className="flex flex-1 flex-col px-1 pb-1">
        <span className="line-clamp-2 text-xl font-semibold leading-tight text-foreground">{item.title}</span>
        <span className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{item.description}</span>
        {dateLabel ? <span className="mt-3 text-xs text-silver">Published {dateLabel}</span> : null}
        <span className="mt-auto inline-flex min-h-11 w-fit items-center gap-1.5 pt-5 text-sm font-semibold text-cyan-100">Open content<ChevronRight size={15} /></span>
      </span>
    </CircleCardTrackedLink>
  );
}

function CreatorOfferCard({
  item,
  analyticsCardId
}: {
  item: PublicCircleCard["creatorOffers"][number];
  analyticsCardId?: string;
}) {
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[1.6rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(25,35,42,0.94),rgba(6,13,28,0.98))] shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
      <div className="relative aspect-[1.55] overflow-hidden border-b border-silver/12 bg-[image:var(--cc-theme-media-bg)]">
        <img src={item.image} alt={item.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(3,8,19,0.82))]" />
        <div className="absolute left-3 right-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="rounded-full border border-white/16 bg-black/38 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">{item.offerType}</span>
          {item.badge ? <span className="rounded-full border border-gold/28 bg-gold/16 px-3 py-1.5 text-xs font-semibold text-gold backdrop-blur">{item.badge}</span> : null}
        </div>
        {item.featured ? <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-gold/28 bg-black/42 px-3 py-1.5 text-xs font-medium text-gold backdrop-blur"><Star size={11} />Featured</span> : null}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="break-words text-xl font-semibold leading-tight text-foreground">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
        {item.price ? (
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-2xl font-semibold text-gold">{item.price}</span>
            {item.previousPrice ? <span className="text-sm text-muted line-through">{item.previousPrice}</span> : null}
          </div>
        ) : null}
        <CircleCardTrackedLink
          {...getExternalLinkProps(item.ctaUrl)}
          cardId={analyticsCardId ?? ""}
          eventType="CUSTOM_LINK_CLICK"
          metadata={{ source: "creator_offer", itemId: item.id, offerType: item.offerType, url: analyticsUrlValue(item.ctaUrl) }}
          className={cn(buttonVariants(), "mt-auto min-h-12 w-full gap-2")}
        >
          {item.ctaLabel}<ChevronRight size={15} />
        </CircleCardTrackedLink>
      </div>
    </article>
  );
}

function CreatorPressProofCard({
  item,
  analyticsCardId
}: {
  item: PublicCircleCard["pressProofItems"][number];
  analyticsCardId?: string;
}) {
  const dateLabel = item.date
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
        .format(new Date(`${item.date}T00:00:00.000Z`))
    : null;

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[1.6rem] border border-cyan-300/18 bg-[linear-gradient(145deg,rgba(15,35,48,0.94),rgba(5,12,27,0.98))] shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
      <div className="relative aspect-[1.55] overflow-hidden border-b border-silver/12 bg-[image:var(--cc-theme-media-bg)]">
        <img src={item.image} alt={item.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(3,8,19,0.84))]" />
        <div className="absolute left-3 right-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="rounded-full border border-cyan-300/24 bg-black/40 px-3 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur">{item.proofType}</span>
          {item.badge ? <span className="rounded-full border border-gold/28 bg-gold/16 px-3 py-1.5 text-xs font-semibold text-gold backdrop-blur">{item.badge}</span> : null}
        </div>
        {item.featured ? <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-gold/28 bg-black/42 px-3 py-1.5 text-xs font-medium text-gold backdrop-blur"><Star size={11} />Featured</span> : null}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="break-words text-xl font-semibold leading-tight text-foreground">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
        {(item.sourceName || dateLabel) ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-silver">
            {item.sourceName ? <span className="font-semibold text-cyan-100">{item.sourceName}</span> : null}
            {item.sourceName && dateLabel ? <span aria-hidden="true">·</span> : null}
            {dateLabel ? <time dateTime={item.date ?? undefined}>{dateLabel}</time> : null}
          </div>
        ) : null}
        {item.sourceUrl ? (
          <CircleCardTrackedLink
            {...getExternalLinkProps(item.sourceUrl)}
            cardId={analyticsCardId ?? ""}
            eventType="CUSTOM_LINK_CLICK"
            metadata={{ source: "creator_press_proof", itemId: item.id, proofType: item.proofType, url: analyticsUrlValue(item.sourceUrl) }}
            className={cn(buttonVariants({ variant: "outline" }), "mt-auto min-h-12 w-full gap-2")}
          >
            View Source<ChevronRight size={15} />
          </CircleCardTrackedLink>
        ) : null}
      </div>
    </article>
  );
}

type TrustAreaProps = {
  card: PublicCircleCard;
  ownerAccountLabel: string;
  ownerIsBcnMember: boolean;
};

function TrustArea({ card, ownerAccountLabel, ownerIsBcnMember }: TrustAreaProps) {
  const membershipLabel = membershipBadgeLabel(card, ownerIsBcnMember);

  return (
    <section
      aria-label="Circle Card trust"
      className="rounded-[1.75rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(9,20,45,0.86),rgba(4,10,24,0.94))] p-5 shadow-panel-soft"
    >
      <div className="flex items-center gap-3">
        <CircleCardLogoMark className="h-11 w-11" alt="" />
        <div>
          <p className="text-sm font-semibold text-foreground">Powered by Circle Card</p>
          <p className="text-xs text-muted">Powered by The Business Circle</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PremiumBadge icon={<Star size={13} />} label="Circle Card" />
        {membershipLabel ? (
          <PremiumBadge icon={<Crown size={13} />} label={membershipLabel} />
        ) : (
          <PremiumBadge icon={<ShieldCheck size={13} />} label={ownerAccountLabel} muted />
        )}
        {card.recommendations.length ? (
          <PremiumBadge
            icon={<UserCheck size={13} />}
            label={`Trusted by ${card.recommendations.length} connection${card.recommendations.length === 1 ? "" : "s"}`}
            muted
          />
        ) : null}
        {card.successfulReferralCount ? (
          <PremiumBadge
            icon={<Handshake size={13} />}
            label={`${card.successfulReferralCount} successful referral${
              card.successfulReferralCount === 1 ? "" : "s"
            }`}
            muted
          />
        ) : null}
      </div>

      {!card.isDemo ? (
        <CircleCardReportForm cardId={card.id} cardSlug={card.slug} className="mt-4" />
      ) : null}
    </section>
  );
}

function PublicRecommendationItem({
  recommendation
}: {
  recommendation: PublicCircleCard["recommendations"][number];
}) {
  const recommenderDetail = [
    recommendation.recommenderCard.role,
    recommendation.recommenderCard.businessName
  ]
    .filter(Boolean)
    .join(" at ");

  return (
    <article className="rounded-2xl border border-silver/14 bg-white/[0.035] p-4 shadow-inner-surface">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/card/${recommendation.recommenderCard.slug}`}
            className="text-sm font-semibold text-foreground hover:text-gold"
          >
            {recommendation.recommenderCard.fullName}
          </Link>
          {recommenderDetail ? (
            <p className="mt-1 text-xs text-muted">{recommenderDetail}</p>
          ) : null}
        </div>
        <span className="rounded-full border border-gold/22 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
          {recommendation.category}
        </span>
      </div>
      {recommendation.reason ? (
        <p className="mt-3 text-sm leading-relaxed text-silver">
          &ldquo;{recommendation.reason}&rdquo;
        </p>
      ) : null}
    </article>
  );
}

function PublicRecommendations({
  recommendations
}: {
  recommendations: PublicCircleCard["recommendations"];
}) {
  if (!recommendations.length) {
    return null;
  }

  const visibleRecommendations = recommendations.slice(0, 3);
  const hiddenRecommendations = recommendations.slice(3);

  return (
    <section
      aria-labelledby="circle-card-recommendations-title"
      className="rounded-[1.75rem] border border-gold/20 bg-[linear-gradient(145deg,rgba(9,20,45,0.88),rgba(4,10,24,0.96))] p-5 shadow-panel-soft"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-gold">Trust Layer</p>
          <h2 id="circle-card-recommendations-title" className="mt-1 font-display text-2xl text-foreground">
            Recommended by trusted connections
          </h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/22 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold">
          <UserCheck size={13} />
          Recommended by {recommendations.length} people
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {visibleRecommendations.map((recommendation) => (
          <PublicRecommendationItem key={recommendation.id} recommendation={recommendation} />
        ))}
      </div>

      {hiddenRecommendations.length ? (
        <details className="mt-3 rounded-2xl border border-silver/14 bg-white/[0.03] p-3">
          <summary className="cursor-pointer text-sm font-medium text-silver hover:text-foreground">
            View more
          </summary>
          <div className="mt-3 grid gap-3">
            {hiddenRecommendations.map((recommendation) => (
              <PublicRecommendationItem key={recommendation.id} recommendation={recommendation} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

export function PublicCircleCardProfile({
  card,
  publicUrl,
  analyticsCardId,
  viewerIsOwner,
  isAuthenticated,
  savedContact,
  connectionState,
  ownerAccountLabel,
  ownerIsBcnMember,
  source = "direct",
  spinState,
  viewerCircleConnectionCount,
  notice,
  error
}: PublicCircleCardProfileProps) {
  const telHref = phoneHref(card.phone);
  const displayRole = roleLine(card);
  const noticeMessage = notice ? NOTICE_MESSAGES[notice] : null;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;
  const viewLabel = card.isDemo ? "Demo identity" : `${card.viewCount + 1} public views`;
  const membershipLabel = membershipBadgeLabel(card, ownerIsBcnMember);
  const recommendationCount = card.recommendations.length;
  const successfulReferralCount = card.successfulReferralCount;
  const accountTypeLabel = getCircleCardAccountTypeLabel(card.accountType);
  const identityTagLabels = card.identityTags.map(getCircleCardIdentityTagLabel).slice(0, 2);
  const publicLayout = resolvePublicCircleCardLayout(card.cardType);
  const circleCardTheme = resolveCircleCardTheme(card);
  const circleCardThemeStyle = buildCircleCardThemeStyle(circleCardTheme) as CSSProperties;
  const circleCardThemeSurface = circleCardTheme.surfaceStyle.toLowerCase();
  const currentPublicCardPath = publicCardPath(card.slug, source);
  const spinReturnPath = publicCardPath(card.slug, source, "return");
  const circleCardRegistrationParams = new URLSearchParams({
    source: "circle-card",
    returnTo: spinReturnPath,
    sourceCardSlug: card.slug
  });
  const circleCardRegistrationHref = `/register?${circleCardRegistrationParams.toString()}`;
  const publicCardLoginHref = `/login?from=${encodeURIComponent(currentPublicCardPath)}`;
  const testimonialFlowHref = circleCardTestimonialFlowHref(card.id);
  const testimonialLoginHref = `/login?from=${encodeURIComponent(testimonialFlowHref)}`;
  const spinToConnectProps = {
    cardId: card.id,
    analyticsCardId,
    cardSlug: card.slug,
    cardName: card.fullName,
    publicPath: currentPublicCardPath,
    isDemo: card.isDemo,
    isAuthenticated,
    viewerIsOwner,
    viewerHasCircleCard: Boolean(connectionState.viewerPrimaryCardId),
    isConnected: Boolean(savedContact || connectionState.request?.status === "ACCEPTED"),
    connectionCount: viewerCircleConnectionCount,
    initialState: spinState ?? null,
    connectAction: spinToConnectCircleCardAction
  };
  const contactRows: ContactRow[] = [];

  if (card.websiteUrl) {
    contactRows.push({
      key: "website",
      icon: <Globe2 size={18} />,
      label: "Website",
      value: displayHost(card.websiteUrl),
      href: card.websiteUrl,
      anchorProps: getExternalLinkProps(card.websiteUrl),
      eventType: "WEBSITE_CLICK",
      metadata: { source: "public_card" }
    });
  }

  if (telHref) {
    contactRows.push({
      key: "phone",
      icon: <Phone size={18} />,
      label: "Phone",
      value: card.phone ?? "Call",
      href: telHref,
      eventType: "PHONE_CLICK",
      metadata: { source: "public_card" }
    });
  }

  if (card.email) {
    contactRows.push({
      key: "email",
      icon: <Mail size={18} />,
      label: "Email",
      value: card.email,
      href: `mailto:${card.email}`,
      eventType: "EMAIL_CLICK",
      metadata: { source: "public_card" }
    });
  }

  if (card.location) {
    const locationHref = mapsHref(card.location);
    contactRows.push({
      key: "location",
      icon: <MapPin size={18} />,
      label: "Location",
      value: card.location,
      href: locationHref,
      anchorProps: getExternalLinkProps(locationHref)
    });
  }

  for (const socialLink of card.socialLinks.links.filter((item) => item.isActive)) {
    const platform =
      SOCIAL_CONTACT_PLATFORMS.find((item) => item.key === socialLink.platform) ??
      SOCIAL_CONTACT_PLATFORMS.find((item) => item.key === "other");
    const href = socialLink.url;

    if (!platform || !href) {
      continue;
    }

    const Icon = platform.icon;
    contactRows.push({
      key: `social:${socialLink.id}`,
      isSocial: true,
      icon: <Icon size={18} />,
      label: platform.label,
      value: socialLink.label || socialDisplayValue(platform, href),
      href,
      anchorProps: getExternalLinkProps(href)
    });
  }

  const socialContactRows = contactRows.filter((row) => row.isSocial);
  const directContactRows = contactRows.filter((row) => !row.isSocial);
  const websiteContactRow = directContactRows.find((row) => row.key === "website") ?? null;
  const featuredLinks = creatorFeaturedLinks(card);
  const primaryCustomLink = selectCreatorPrimaryLink(card, Boolean(websiteContactRow));
  const primaryWebsiteLink = primaryCustomLink ? null : websiteContactRow;

  function renderCardSwitcher() {
    if (card.ownerCards.length <= 1) {
      return null;
    }

    return (
      <nav
        aria-label={`${card.fullName} Circle Cards`}
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        {card.ownerCards.map((ownerCard) => {
          const selected = ownerCard.id === card.id;
          const label = getCircleCardTypeLabel(ownerCard.cardType) ?? ownerCard.cardType;

          return (
            <Link
              key={ownerCard.id}
              href={publicCardPath(ownerCard.slug, source)}
              aria-current={selected ? "page" : undefined}
              data-active={selected ? "true" : "false"}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-full border border-silver/16 bg-background/30 px-4 py-2 text-sm font-semibold text-silver shadow-inner-surface backdrop-blur transition-colors hover:border-gold/36 hover:text-foreground",
                "data-[active=true]:border-gold/48 data-[active=true]:bg-gold/16 data-[active=true]:text-gold"
              )}
            >
              {label}
              {ownerCard.isDefaultCard ? <span className="sr-only"> (default)</span> : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  function renderWalletAction({ mobileBar = false }: { mobileBar?: boolean } = {}) {
    const iconSize = mobileBar ? 15 : 16;
    const actionClassName = mobileBar
      ? mobileActionClassName
      : cn(secondaryActionClassName, "gap-2");

    if (viewerIsOwner) {
      return (
        <span className={cn(buttonVariants({ variant: "outline" }), actionClassName, "opacity-75")}>
          <UserRound size={iconSize} />
          {mobileBar ? "Mine" : "Your Card"}
        </span>
      );
    }

    if (card.isDemo) {
      return (
        <span className={cn(buttonVariants({ variant: "outline" }), actionClassName, "opacity-75")}>
          <WalletCards size={iconSize} />
          {mobileBar ? "Demo" : "Demo Card"}
        </span>
      );
    }

    if (savedContact) {
      return (
        <form action={removeCircleWalletContactAction} className="min-w-0">
          <input type="hidden" name="cardId" value={card.id} />
          <input type="hidden" name="returnPath" value={`/card/${card.slug}`} />
          <Button type="submit" variant="outline" className={actionClassName}>
            <Trash2 size={iconSize} />
            {mobileBar ? "Remove" : "Remove from Wallet"}
          </Button>
        </form>
      );
    }

    if (isAuthenticated) {
      return (
        <form action={saveCircleWalletContactAction} className="min-w-0">
          <input type="hidden" name="cardId" value={card.id} />
          <input type="hidden" name="returnPath" value={`/card/${card.slug}`} />
          <Button type="submit" className={actionClassName}>
            <WalletCards size={iconSize} />
            {mobileBar ? "Wallet" : "Save to Wallet"}
          </Button>
        </form>
      );
    }

    return (
      <Link
        href={publicCardLoginHref}
        className={cn(buttonVariants({ variant: "outline" }), actionClassName)}
      >
        <WalletCards size={iconSize} />
        {mobileBar ? "Wallet" : "Save to Wallet"}
      </Link>
    );
  }

  function renderConnectionAction() {
    if (viewerIsOwner || card.isDemo || !isAuthenticated) {
      return null;
    }

    const request = connectionState.request;

    if (!connectionState.viewerPrimaryCardId) {
      return (
        <div className="mt-4 rounded-2xl border border-silver/14 bg-white/[0.035] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Handshake size={16} className="text-gold" />
                Connection request
              </p>
              <p className="mt-1 text-sm text-muted">
                Create your own Circle Card before sending connection requests.
              </p>
            </div>
            <Link href="/dashboard/circle-card" className="shrink-0">
              <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto">
                Create card
                <ChevronRight size={15} />
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    if (request?.status === "ACCEPTED") {
      return (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gold/24 bg-gold/10 px-4 py-3 text-sm text-gold">
          <UserCheck size={16} />
          Connected
        </div>
      );
    }

    if (request?.status === "PENDING" && request.direction === "OUTGOING") {
      return (
        <div className="mt-4 rounded-2xl border border-silver/14 bg-white/[0.035] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Send size={16} className="text-gold" />
                Request sent
              </p>
              {request.message ? (
                <p className="mt-2 text-sm text-muted">&ldquo;{request.message}&rdquo;</p>
              ) : (
                <p className="mt-1 text-sm text-muted">Waiting for a response.</p>
              )}
            </div>
            <form action={cancelCircleCardConnectionRequestAction} className="shrink-0">
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="returnPath" value={`/card/${card.slug}`} />
              <Button type="submit" variant="outline" className="w-full gap-2 sm:w-auto">
                <XCircle size={15} />
                Cancel Request
              </Button>
            </form>
          </div>
        </div>
      );
    }

    if (request?.status === "PENDING" && request.direction === "INCOMING") {
      return (
        <div className="mt-4 rounded-2xl border border-gold/24 bg-gold/10 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-gold">
                <Handshake size={16} />
                They sent you a connection request
              </p>
              {request.message ? (
                <p className="mt-2 text-sm text-gold/80">&ldquo;{request.message}&rdquo;</p>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <form action={acceptCircleCardConnectionRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="returnPath" value={`/card/${card.slug}`} />
                <Button type="submit" className="w-full gap-2">
                  <UserCheck size={15} />
                  Accept
                </Button>
              </form>
              <form action={declineCircleCardConnectionRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="returnPath" value={`/card/${card.slug}`} />
                <Button type="submit" variant="outline" className="w-full gap-2">
                  <UserX size={15} />
                  Decline
                </Button>
              </form>
            </div>
          </div>
        </div>
      );
    }

    if (savedContact) {
      return (
        <div className="mt-4 rounded-2xl border border-gold/24 bg-gold/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-gold">
                <UserCheck size={16} />
                Already in your Circle
              </p>
              <p className="mt-1 text-sm text-gold/80">
                Connected in your Circle Wallet.
              </p>
            </div>
            <Link
              href={`/dashboard/circle-card/wallet?contactId=${encodeURIComponent(savedContact.id)}`}
              className="shrink-0"
            >
              <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto">
                <WalletCards size={15} />
                Open in Wallet
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    if (!savedContact) {
      return (
        <div className="mt-4 rounded-2xl border border-silver/14 bg-white/[0.035] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Handshake size={16} className="text-gold" />
                Connection request
              </p>
              <p className="mt-1 text-sm text-muted">
                Save this card to your Circle Wallet before sending a request.
              </p>
            </div>
            <Button type="button" variant="outline" disabled className="w-full gap-2 sm:w-auto">
              <Send size={15} />
              Save first
            </Button>
          </div>
        </div>
      );
    }

    return (
      <form
        action={sendCircleCardConnectionRequestAction}
        className="mt-4 rounded-2xl border border-silver/14 bg-white/[0.035] p-4"
      >
        <input type="hidden" name="recipientCardId" value={card.id} />
        <input type="hidden" name="returnPath" value={`/card/${card.slug}`} />
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Handshake size={16} className="text-gold" />
              Send Connection Request
            </p>
            <Textarea
              name="message"
              rows={3}
              maxLength={240}
              placeholder="Hi, good to connect through Circle Card."
              aria-label="Connection request message"
            />
          </div>
          <Button type="submit" className="h-11 w-full gap-2 md:w-auto">
            <Send size={15} />
            Send Request
          </Button>
        </div>
      </form>
    );
  }

  function renderPrimaryCta({
    link = primaryCustomLink,
    website = primaryWebsiteLink,
    source,
    className,
    label
  }: {
    link?: PublicCircleCard["customLinks"][number] | null;
    website?: ContactRow | null;
    source: string;
    className?: string;
    label?: string;
  }) {
    if (link) {
      const href = customLinkHref(link);

      if (href) {
        return (
          <CircleCardTrackedLink
            {...customLinkAnchorProps(link, href)}
            href={href}
            cardId={analyticsCardId ?? ""}
            eventType="CUSTOM_LINK_CLICK"
            metadata={{
              source,
              layout: publicLayout,
              linkId: link.id,
              label: link.label,
              type: link.type,
              actionMode: link.actionMode,
              resolvedAction: link.fileUrl || link.fileMimeType || link.fileName
                ? resolveCircleCardFileAction(link)
                : undefined,
              url: analyticsUrlValue(href)
            }}
            className={cn(buttonVariants(), primaryActionClassName, "min-w-0 gap-2 px-4", className)}
          >
            <span className="shrink-0">{customLinkIcon(link)}</span>
            <span className="min-w-0 truncate">{label ?? creatorLinkCtaLabel(link)}</span>
            <ChevronRight size={16} className="shrink-0" />
          </CircleCardTrackedLink>
        );
      }
    }

    if (website) {
      return (
        <CircleCardTrackedLink
          href={website.href}
          {...website.anchorProps}
          cardId={analyticsCardId ?? ""}
          eventType="WEBSITE_CLICK"
          metadata={{
            source,
            layout: publicLayout,
            url: analyticsUrlValue(website.href)
          }}
          className={cn(buttonVariants(), primaryActionClassName, "min-w-0 gap-2 px-4", className)}
        >
          <Globe2 size={16} className="shrink-0" />
          <span className="min-w-0 truncate">{label ?? "Visit Website"}</span>
          <ChevronRight size={16} className="shrink-0" />
        </CircleCardTrackedLink>
      );
    }

    return null;
  }

  function renderAboutSection({
    className,
    heading = "About",
    id = "circle-card-about"
  }: {
    className?: string;
    heading?: string;
    id?: string;
  } = {}) {
    if (!card.about) {
      return null;
    }

    return (
      <section
        aria-labelledby={id}
        className={cn("rounded-[1.5rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft sm:p-6", className)}
      >
        <h2 id={id} className="text-sm font-semibold text-foreground">
          {heading}
        </h2>
        <CircleCardAboutExpander text={card.about} className="mt-3" />
      </section>
    );
  }

  function renderQuickConnectSection({
    rows = contactRows,
    className,
    id = "circle-card-quick-connect",
    heading = "Direct routes back",
    emptyMessage = "Contact details can be added from the Circle Card dashboard."
  }: {
    rows?: ContactRow[];
    className?: string;
    id?: string;
    heading?: string;
    emptyMessage?: string;
  } = {}) {
    return (
      <section
        aria-labelledby={id}
        className={cn(
          "rounded-[1.75rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(9,20,45,0.86),rgba(4,10,24,0.94))] p-5 shadow-panel-soft",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Quick Connect</p>
            <h2 id={id} className="mt-1 font-display text-2xl text-foreground">
              {heading}
            </h2>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
            <ChevronRight size={18} />
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {rows.length ? (
            rows.map((row) => (
              <ContactAction
                key={row.key}
                icon={row.icon}
                label={row.label}
                value={row.value}
                description={row.description}
                href={row.href}
                anchorProps={row.anchorProps}
                analyticsCardId={analyticsCardId}
                eventType={row.eventType}
                metadata={row.metadata}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-silver/16 bg-white/[0.03] p-4 text-sm text-muted">
              {emptyMessage}
            </p>
          )}
        </div>
      </section>
    );
  }

  function renderFeaturedLinksSection({
    className,
    id = "circle-card-featured-links",
    eyebrow = "Featured Links",
    heading = "Featured links",
    description,
    source = "public_card"
  }: {
    className?: string;
    id?: string;
    eyebrow?: string;
    heading?: string;
    description?: string;
    source?: string;
  } = {}) {
    if (!featuredLinks.length) {
      return null;
    }

    return (
      <section
        aria-labelledby={id}
        className={cn(
          "rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(12,25,32,0.88),rgba(4,10,24,0.96))] p-5 shadow-panel-soft sm:p-6",
          className
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">{eyebrow}</p>
            <h2 id={id} className="mt-1 font-display text-2xl text-foreground">
              {heading}
            </h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-silver/14 bg-white/[0.05] px-3 py-1.5 text-xs text-silver">
            <Sparkles size={13} className="text-gold" />
            Active links
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredLinks.map((link) => (
            <FeaturedLinkCard
              key={link.id}
              link={link}
              analyticsCardId={analyticsCardId}
              layout={publicLayout}
              source={source}
            />
          ))}
        </div>
      </section>
    );
  }

  function renderBusinessHighlightsSection() {
    const highlights = [
      card.role
        ? {
            label: "Primary service",
            value: card.role,
            href: null as string | null,
            anchorProps: undefined
          }
        : null,
      card.location
        ? {
            label: "Service area",
            value: card.location,
            href: mapsHref(card.location),
            anchorProps: getExternalLinkProps(mapsHref(card.location))
          }
        : null,
      card.websiteUrl
        ? {
            label: "Website / enquiry",
            value: displayHost(card.websiteUrl),
            href: card.websiteUrl,
            anchorProps: getExternalLinkProps(card.websiteUrl)
          }
        : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!highlights.length) {
      return null;
    }

    return (
      <section
        aria-labelledby="business-highlights-title"
        className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(12,25,32,0.82),rgba(4,10,24,0.94))] p-5 shadow-panel-soft"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Business highlights</p>
            <h2 id="business-highlights-title" className="mt-1 font-display text-2xl text-foreground">
              What this business does
            </h2>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
            <BriefcaseBusiness size={18} />
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {highlights.map((highlight) => {
            const content = (
              <>
                <span className="block text-[11px] uppercase tracking-[0.08em] text-muted">
                  {highlight.label}
                </span>
                <span className="mt-1 block break-words text-sm font-semibold text-foreground">
                  {highlight.value}
                </span>
              </>
            );

            return highlight.href ? (
              <a
                key={highlight.label}
                href={highlight.href}
                {...highlight.anchorProps}
                className="rounded-2xl border border-silver/14 bg-white/[0.04] p-4 transition-colors hover:border-gold/28 hover:bg-white/[0.06]"
              >
                {content}
              </a>
            ) : (
              <div
                key={highlight.label}
                className="rounded-2xl border border-silver/14 bg-white/[0.04] p-4"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function renderServicesSection({ id = "business-services" }: { id?: string } = {}) {
    if (card.cardType !== "BUSINESS" || !card.services.length) {
      return null;
    }

    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(12,25,32,0.88),rgba(4,10,24,0.96))] p-5 shadow-panel-soft sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Services</p>
            <h2 id={`${id}-title`} className="mt-1 font-display text-2xl text-foreground">
              What we can help with
            </h2>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
            <BriefcaseBusiness size={18} />
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {card.services.map((service) => (
            <article
              key={service.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-silver/14 bg-white/[0.04]"
            >
              {service.imageUrl ? (
                <CircleCardFramedImage
                  src={service.imageUrl}
                  alt={service.title}
                  className="aspect-[16/9] w-full border-b border-silver/12 bg-background/40"
                  imageClassName="h-full w-full object-cover"
                />
              ) : null}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 text-base font-semibold text-foreground">{service.title}</h3>
                  {service.startingPrice ? (
                    <span className="shrink-0 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
                      {service.startingPrice}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
                {service.ctaLabel && service.ctaUrl ? (
                  <a
                    {...getExternalLinkProps(service.ctaUrl)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 h-10 w-full gap-2 sm:w-fit")}
                  >
                    {service.ctaLabel}
                    <ChevronRight size={14} />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderProductsSection({ id = "business-products" }: { id?: string } = {}) {
    if (card.cardType !== "BUSINESS" || !card.products.length) {
      return null;
    }

    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(12,25,32,0.88),rgba(4,10,24,0.96))] p-5 shadow-panel-soft sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Products</p>
            <h2 id={`${id}-title`} className="mt-1 font-display text-2xl text-foreground">
              Explore our products
            </h2>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
            <ShoppingBag size={18} />
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {card.products.map((product) => (
            <article
              key={product.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-silver/14 bg-white/[0.04]"
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  loading="lazy"
                  className="aspect-[4/3] h-auto w-full border-b border-silver/12 bg-background/40 object-cover"
                />
              ) : null}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    {product.category ? <p className="text-xs font-medium text-gold">{product.category}</p> : null}
                    <h3 className="mt-1 text-base font-semibold text-foreground">{product.title}</h3>
                  </div>
                  {product.isFeatured ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
                      <Star size={11} /> Featured
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-2">
                  {product.salePrice ? (
                    <>
                      <span className="text-lg font-semibold text-gold">{product.salePrice}</span>
                      <span className="text-sm text-muted line-through">{product.price}</span>
                    </>
                  ) : (
                    <span className="text-lg font-semibold text-gold">{product.price}</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{product.description}</p>
                <a
                  {...getExternalLinkProps(product.ctaUrl)}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 h-10 w-full gap-2 sm:w-fit")}
                >
                  {product.ctaLabel}
                  <ChevronRight size={14} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderPriceListSection({ id = "business-price-list" }: { id?: string } = {}) {
    if (card.cardType !== "BUSINESS" || !card.priceItems.length) {
      return null;
    }

    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(12,25,32,0.88),rgba(4,10,24,0.96))] p-5 shadow-panel-soft sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Pricing</p>
            <h2 id={`${id}-title`} className="mt-1 font-display text-2xl text-foreground">Price List</h2>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
            <Tag size={18} />
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {card.priceItems.map((item) => (
            <article key={item.id} className="flex min-w-0 flex-col rounded-2xl border border-silver/14 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {item.category ? <p className="text-xs font-medium text-gold">{item.category}</p> : null}
                  <h3 className="mt-1 text-base font-semibold text-foreground">{item.title}</h3>
                </div>
                {item.isFeatured ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold"><Star size={11} /> Featured</span>
                ) : null}
              </div>
              <p className="mt-4 break-words font-display text-3xl font-semibold text-gold">{item.price}</p>
              {item.priceNote ? <p className="mt-1 text-xs font-medium text-silver">{item.priceNote}</p> : null}
              {item.description ? <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p> : null}
              {item.ctaLabel && item.ctaUrl ? (
                <a {...getExternalLinkProps(item.ctaUrl)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 h-11 w-full gap-2 sm:w-fit")}>
                  {item.ctaLabel}<ChevronRight size={14} />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderMenuOffersSection({ id = "business-menu-offers" }: { id?: string } = {}) {
    if (card.cardType !== "BUSINESS" || !card.menuOfferItems.length) {
      return null;
    }

    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(12,25,32,0.88),rgba(4,10,24,0.96))] p-5 shadow-panel-soft sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Current selections</p>
            <h2 id={`${id}-title`} className="mt-1 font-display text-2xl text-foreground">Menu &amp; Offers</h2>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
            <BookOpen size={18} />
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {card.menuOfferItems.map((item) => (
            <article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-silver/14 bg-white/[0.04]">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} loading="lazy" className="aspect-[4/3] h-auto w-full border-b border-silver/12 bg-background/40 object-cover" />
              ) : null}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    {item.category ? <p className="text-xs font-medium text-gold">{item.category}</p> : null}
                    <h3 className="mt-1 text-base font-semibold text-foreground">{item.title}</h3>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {item.badge ? <span className="rounded-full border border-gold/24 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">{item.badge}</span> : null}
                    {item.isFeatured ? <span className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold"><Star size={11} /> Featured</span> : null}
                  </div>
                </div>
                {item.price ? (
                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-semibold text-gold">{item.price}</span>
                    {item.previousPrice ? <span className="text-sm text-muted line-through">{item.previousPrice}</span> : null}
                  </div>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                {item.ctaLabel && item.ctaUrl ? (
                  <a {...getExternalLinkProps(item.ctaUrl)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 h-11 w-full gap-2 sm:w-fit")}>
                    {item.ctaLabel}<ChevronRight size={14} />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderDocumentsSection({ id = "business-downloads" }: { id?: string } = {}) {
    if (card.cardType !== "BUSINESS" || !card.documents.length) {
      return null;
    }

    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Resources</p>
            <h2 id={`${id}-title`} className="mt-1 font-display text-2xl text-foreground">
              Downloads / Documents
            </h2>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
            <FileText size={18} />
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {card.documents.map((document) => {
            const fileKind = detectCircleCardFileKind({
              fileMimeType: document.fileType,
              fileName: document.fileName,
              fileUrl: document.fileUrl
            });
            const action = resolveCircleCardFileAction({
              fileMimeType: document.fileType,
              fileName: document.fileName,
              fileUrl: document.fileUrl
            });

            return (
              <article key={document.id} className="flex min-w-0 flex-col rounded-2xl border border-silver/14 bg-background/22 p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-silver/14 bg-white/[0.04] text-gold">
                    <FileText size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{document.title}</h3>
                      <span className="rounded-full border border-silver/14 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-silver">
                        {circleCardFileKindLabel(fileKind)}
                      </span>
                      {document.isFeatured ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">
                          <Star size={10} /> Featured
                        </span>
                      ) : null}
                    </div>
                    {document.category ? <p className="mt-1 text-xs font-medium text-gold">{document.category}</p> : null}
                  </div>
                </div>
                {document.description ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{document.description}</p> : null}
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 h-10 w-full gap-2 sm:w-fit")}
                >
                  {document.ctaLabel || circleCardFileActionLabel(action)}
                  <Download size={14} />
                </a>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderCreatorMediaKitSection({ id = "creator-media-kit" }: { id?: string } = {}) {
    const mediaKit = card.mediaKit;
    if (card.cardType !== "CREATOR" || !mediaKit) return null;

    const audience = [
      mediaKit.primaryPlatform ? { label: "Primary platform", value: mediaKit.primaryPlatform } : null,
      mediaKit.secondaryPlatform ? { label: "Secondary platform", value: mediaKit.secondaryPlatform } : null,
      mediaKit.followers ? { label: "Followers", value: mediaKit.followers } : null,
      mediaKit.subscribers ? { label: "Subscribers", value: mediaKit.subscribers } : null,
      mediaKit.monthlyViews ? { label: "Monthly views", value: mediaKit.monthlyViews } : null,
      mediaKit.averageReach ? { label: "Average reach", value: mediaKit.averageReach } : null
    ].filter((item): item is { label: string; value: string } => Boolean(item));
    const contactEmail = mediaKit.businessEnquiriesEmail || mediaKit.creatorEmail;

    return (
      <section id={id} aria-labelledby={`${id}-title`} className="overflow-hidden rounded-[1.75rem] border border-cyan-300/18 bg-[linear-gradient(145deg,rgba(10,29,42,0.9),rgba(4,10,24,0.97))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-cyan-200">Live Media Kit</p>
            <h2 id={`${id}-title`} className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">{mediaKit.creatorName || card.fullName}</h2>
            {mediaKit.creatorTagline ? <p className="mt-3 max-w-3xl text-base leading-relaxed text-silver sm:text-lg">{mediaKit.creatorTagline}</p> : null}
            <p className="mt-2 text-xs text-muted">Always up to date · Built into this Circle Card</p>
          </div>
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/22 bg-cyan-400/[0.08] text-cyan-100"><BriefcaseBusiness size={20} /></span>
        </div>

        {(mediaKit.primaryNiche || mediaKit.secondaryNiche || mediaKit.location || mediaKit.languages.length || mediaKit.availableWorldwide || mediaKit.yearsCreating !== null) ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {mediaKit.primaryNiche ? <span className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-100">{mediaKit.primaryNiche}</span> : null}
            {mediaKit.secondaryNiche ? <span className="rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver">{mediaKit.secondaryNiche}</span> : null}
            {mediaKit.location ? <span className="inline-flex items-center gap-1.5 rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver"><MapPin size={12} />{mediaKit.location}</span> : null}
            {mediaKit.languages.length ? <span className="rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver">{mediaKit.languages.join(" · ")}</span> : null}
            {mediaKit.availableWorldwide ? <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/22 bg-gold/8 px-3 py-1.5 text-xs text-gold"><Globe2 size={12} />Available worldwide</span> : null}
            {mediaKit.yearsCreating !== null ? <span className="rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver">{mediaKit.yearsCreating} year{mediaKit.yearsCreating === 1 ? "" : "s"} creating</span> : null}
          </div>
        ) : null}

        {mediaKit.whatICreate.length ? (
          <div className="mt-5 rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.045] p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">What I Create</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {mediaKit.whatICreate.map((contentType) => <span key={contentType} className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-100">{contentType}</span>)}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {mediaKit.availableFor.length ? (
            <div className="rounded-2xl border border-silver/14 bg-white/[0.035] p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground">Available for Collaborations</h3>
              <div className="mt-3 flex flex-wrap gap-2">{mediaKit.availableFor.map((workType) => <span key={workType} className="rounded-full border border-gold/24 bg-[linear-gradient(135deg,rgba(212,175,95,0.14),rgba(34,211,238,0.05))] px-3 py-1.5 text-xs font-medium text-gold shadow-inner-surface">{workType === "Sponsored Posts" ? "Sponsored Content" : workType}</span>)}</div>
            </div>
          ) : null}
          {audience.length ? (
            <div className="rounded-2xl border border-silver/14 bg-white/[0.035] p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><BarChart3 size={15} className="text-cyan-200" />Audience Snapshot</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">{audience.map((item) => <div key={item.label} className="min-w-0 rounded-xl border border-silver/12 bg-background/22 p-3"><p className="text-[11px] text-muted">{item.label}</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{item.value}</p></div>)}</div>
            </div>
          ) : null}
        </div>

        {(contactEmail || mediaKit.websiteUrl || mediaKit.communityUrl || mediaKit.mediaKitFileUrl || mediaKit.externalMediaKitUrl) ? (
          <div className="mt-5 rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.045] p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">Let&apos;s Work Together</h3>
            <p className="mt-1 text-sm text-muted">Interested in collaborating? Use the contact options below.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {contactEmail ? <a href={`mailto:${contactEmail}`} className={cn(buttonVariants({ size: "sm" }), "h-11 gap-2")}><Mail size={14} />Brand Enquiries</a> : null}
              {mediaKit.websiteUrl ? <a {...getExternalLinkProps(mediaKit.websiteUrl)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 gap-2")}><Globe2 size={14} />Website</a> : null}
              {mediaKit.communityUrl ? <a {...getExternalLinkProps(mediaKit.communityUrl)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 gap-2")}><Users size={14} />Community</a> : null}
              {mediaKit.mediaKitFileUrl ? <a href={mediaKit.mediaKitFileUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 gap-2")}><Download size={14} />Download Media Kit</a> : null}
              {mediaKit.externalMediaKitUrl ? <a {...getExternalLinkProps(mediaKit.externalMediaKitUrl)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 gap-2")}><ChevronRight size={14} />View Media Kit</a> : null}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  function renderCreatorAudienceSnapshotSection({ id = "creator-audience" }: { id?: string } = {}) {
    const snapshot = card.audienceSnapshot;
    if (card.cardType !== "CREATOR" || !snapshot) return null;

    const stats = [
      snapshot.primaryPlatform ? { label: "Primary Platform", value: snapshot.primaryPlatform, icon: Globe2 } : null,
      snapshot.primaryContentType ? { label: "Content Style", value: snapshot.primaryContentType, icon: Sparkles } : null,
      snapshot.primaryAudience ? { label: "Primary Audience", value: snapshot.primaryAudience, icon: Users } : null,
      snapshot.averageMonthlyReach ? { label: "Monthly Reach", value: snapshot.averageMonthlyReach, icon: BarChart3 } : null,
      snapshot.averageMonthlyViews ? { label: "Monthly Views", value: snapshot.averageMonthlyViews, icon: Eye } : null,
      snapshot.followers ? { label: "Followers", value: snapshot.followers, icon: UserPlus } : null,
      snapshot.subscribers ? { label: "Subscribers", value: snapshot.subscribers, icon: Users } : null
    ].filter((item): item is { label: string; value: string; icon: LucideIcon } => Boolean(item));
    const countries = [snapshot.topCountry, ...snapshot.additionalCountries].filter(
      (country): country is string => Boolean(country)
    );

    return (
      <section id={id} aria-labelledby={`${id}-title`} className="rounded-[1.75rem] border border-cyan-300/16 bg-white/[0.035] p-5 shadow-[0_22px_64px_rgba(0,0,0,0.22)] sm:p-6 lg:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-cyan-200">Audience Snapshot</p>
            <h2 id={`${id}-title`} className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Who Watches My Content</h2>
          </div>
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/22 bg-cyan-400/[0.08] text-cyan-100"><BarChart3 size={20} /></span>
        </div>

        {stats.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.label} className="min-w-0 rounded-2xl border border-silver/14 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(34,211,238,0.025))] p-4 shadow-inner-surface">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/18 bg-cyan-400/[0.06] text-cyan-100"><Icon size={15} /></span>
                  <p className="mt-4 break-words font-display text-2xl font-semibold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted">{stat.label}</p>
                </article>
              );
            })}
          </div>
        ) : null}

        {(snapshot.secondaryPlatform || snapshot.audienceAge || snapshot.audienceGender || countries.length || snapshot.postingFrequency) ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {snapshot.secondaryPlatform ? <span className="rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver">Also on {snapshot.secondaryPlatform}</span> : null}
            {snapshot.audienceAge ? <span className="rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver">Age {snapshot.audienceAge}</span> : null}
            {snapshot.audienceGender ? <span className="rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver">{snapshot.audienceGender}</span> : null}
            {countries.map((country, index) => <span key={`${country}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/8 px-3 py-1.5 text-xs text-gold"><MapPin size={11} />{country}</span>)}
            {snapshot.postingFrequency ? <span className="rounded-full border border-cyan-300/18 bg-cyan-400/[0.05] px-3 py-1.5 text-xs text-cyan-100">Posts {snapshot.postingFrequency.toLowerCase()}</span> : null}
          </div>
        ) : null}

        {(snapshot.audienceInterests.length || snapshot.bestPerformingContent || snapshot.creatorNotes) ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {snapshot.audienceInterests.length ? (
              <div className="rounded-2xl border border-silver/14 bg-background/22 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-foreground">Audience Interests</h3>
                <div className="mt-3 flex flex-wrap gap-2">{snapshot.audienceInterests.map((interest) => <span key={interest} className="rounded-full border border-cyan-300/18 bg-cyan-400/[0.055] px-3 py-1.5 text-xs text-cyan-100">{interest}</span>)}</div>
              </div>
            ) : null}
            {snapshot.bestPerformingContent ? (
              <div className="rounded-2xl border border-silver/14 bg-background/22 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-foreground">Best Performing Content</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{snapshot.bestPerformingContent}</p>
              </div>
            ) : null}
            {snapshot.creatorNotes ? (
              <div className="rounded-2xl border border-silver/14 bg-background/22 p-4 sm:col-span-2 sm:p-5">
                <h3 className="text-sm font-semibold text-foreground">Creator Notes</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{snapshot.creatorNotes}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  function renderCreatorBrandPartnershipsSection({ id = "creator-brand-partnerships" }: { id?: string } = {}) {
    if (card.cardType !== "CREATOR") return null;
    const partnerships = card.brandPartnerships;
    const openToInterests = [...new Set([
      card.mediaKit?.primaryNiche,
      card.mediaKit?.secondaryNiche,
      ...(card.mediaKit?.whatICreate ?? [])
    ].filter((interest): interest is string => Boolean(interest)))].slice(0, 12);

    if (!partnerships.length) {
      if (!openToInterests.length) return null;
      return (
        <section id={id} aria-labelledby={`${id}-title`} className="rounded-[1.75rem] border border-cyan-300/18 bg-[linear-gradient(145deg,rgba(12,31,44,0.9),rgba(4,10,24,0.97))] p-5 shadow-panel-soft sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-cyan-200">Open to Partnerships</p>
              <h2 id={`${id}-title`} className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Open to Brand Partnerships</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Interested in creating trusted work together? These are the creator&apos;s current content interests.</p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/22 bg-cyan-400/[0.08] text-cyan-100"><Handshake size={20} /></span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">{openToInterests.map((interest) => <span key={interest} className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-100">{interest}</span>)}</div>
        </section>
      );
    }

    return (
      <section id={id} aria-labelledby={`${id}-title`} className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(18,30,38,0.9),rgba(4,10,24,0.97))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-6 lg:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-gold">Trusted By</p>
            <h2 id={`${id}-title`} className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Brands I&apos;ve Worked With</h2>
            <p className="mt-2 text-sm text-muted">Previous collaborations and featured campaigns.</p>
          </div>
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/22 bg-gold/8 text-gold"><Handshake size={20} /></span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {partnerships.map((item) => {
            const dateLabel = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" })
              .format(new Date(`${item.campaignDate}T00:00:00.000Z`));
            return (
              <article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-silver/14 bg-white/[0.04] shadow-inner-surface">
                <div className="flex min-h-32 items-center justify-center border-b border-silver/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] p-5">
                  {item.brandLogo ? <img src={item.brandLogo} alt={`${item.brandName} logo`} loading="lazy" className="max-h-20 w-auto max-w-[75%] object-contain" /> : <span className="font-display text-3xl font-semibold text-cyan-100">{item.brandName.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-xs font-medium text-gold">{item.partnershipType}</p><h3 className="mt-1 text-base font-semibold text-foreground">{item.brandName}</h3></div>
                    {item.isFeatured ? <span className="inline-flex items-center gap-1 rounded-full border border-gold/22 bg-gold/8 px-2.5 py-1 text-[11px] font-medium text-gold"><Star size={10} />Featured Campaign</span> : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-silver">{item.campaignTitle}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                  <p className="mt-3 text-xs text-silver">{dateLabel}</p>
                  {item.testimonial ? <blockquote className="mt-4 rounded-xl border border-gold/16 bg-gold/[0.055] p-3 text-sm italic leading-relaxed text-silver">“{item.testimonial}”</blockquote> : null}
                  {item.campaignUrl ? <a {...getExternalLinkProps(item.campaignUrl)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-auto h-11 w-full gap-2 pt-3 sm:w-fit")}>Visit Campaign<ChevronRight size={14} /></a> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderBookingSection({ id = "business-booking" }: { id?: string } = {}) {
    const booking = card.bookingEnquiry;
    if (card.cardType !== "BUSINESS" || !booking) {
      return null;
    }

    const callHref = circleCardBookingPhoneHref(booking.phoneNumber);
    const whatsappHref = circleCardBookingWhatsAppHref(booking.whatsappNumber);

    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="relative overflow-hidden rounded-[1.75rem] border border-gold/28 bg-[linear-gradient(145deg,rgba(24,38,45,0.96),rgba(5,12,27,0.98))] p-5 shadow-[0_22px_58px_rgba(0,0,0,0.34)] sm:p-7"
      >
        <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold/65 to-transparent" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">Booking / Enquiry</p>
              <h2 id={`${id}-title`} className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">
                {booking.heading}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                {booking.description}
              </p>
            </div>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/24 bg-gold/12 text-gold">
              <CalendarDays size={18} />
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <a
              {...getExternalLinkProps(booking.primaryCtaUrl)}
              className={cn(buttonVariants(), "h-12 w-full gap-2 rounded-xl px-5 lg:w-auto")}
            >
              {booking.primaryCtaLabel}
              <ChevronRight size={15} />
            </a>
            {booking.secondaryCtaLabel && booking.secondaryCtaUrl ? (
              <a
                {...getExternalLinkProps(booking.secondaryCtaUrl)}
                className={cn(buttonVariants({ variant: "outline" }), "h-12 w-full gap-2 rounded-xl px-5 lg:w-auto")}
              >
                {booking.secondaryCtaLabel}
                <ChevronRight size={15} />
              </a>
            ) : null}
            {booking.enquiryEmail ? (
              <a href={`mailto:${booking.enquiryEmail}`} className={cn(buttonVariants({ variant: "outline" }), "h-12 w-full gap-2 rounded-xl px-5 lg:w-auto")}>
                <Mail size={15} /> Email
              </a>
            ) : null}
            {callHref ? (
              <a href={callHref} className={cn(buttonVariants({ variant: "outline" }), "h-12 w-full gap-2 rounded-xl px-5 lg:w-auto")}>
                <Phone size={15} /> Call
              </a>
            ) : null}
            {whatsappHref ? (
              <a {...getExternalLinkProps(whatsappHref)} className={cn(buttonVariants({ variant: "outline" }), "h-12 w-full gap-2 rounded-xl px-5 lg:w-auto")}>
                <MessageCircle size={15} /> WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  function renderOpeningHoursSection({ id = "business-opening-hours" }: { id?: string } = {}) {
    if (card.cardType !== "BUSINESS" || !card.openingHours) {
      return null;
    }

    return (
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Availability</p>
            <h2 id={`${id}-title`} className="mt-1 font-display text-2xl text-foreground">
              Opening Hours
            </h2>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
            <CalendarDays size={18} />
          </span>
        </div>

        <details className="group mt-4 rounded-2xl border border-silver/14 bg-background/22" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span>Weekly hours</span>
            <ChevronRight size={15} className="text-silver transition-transform group-open:rotate-90" />
          </summary>
          <dl className="grid gap-1 border-t border-silver/12 p-3">
            {CIRCLE_CARD_WEEKDAYS.map(({ key, label }) => {
              const day = card.openingHours?.days[key];
              if (!day) {
                return null;
              }

              const hoursLabel = circleCardOpeningHoursDayLabel(day);
              const showSeparateNote = Boolean(day.note && day.note !== hoursLabel);

              return (
                <div
                  key={key}
                  className="grid gap-1 rounded-xl px-3 py-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-start"
                >
                  <dt className="text-sm font-medium text-foreground">{label}</dt>
                  <dd className={cn("text-sm sm:text-right", day.isOpen ? "text-silver" : "text-muted")}>
                    <span className="font-medium">{hoursLabel}</span>
                    {showSeparateNote ? (
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">{day.note}</span>
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </dl>
        </details>
      </section>
    );
  }

  function renderGallerySection({ id = "business-gallery" }: { id?: string } = {}) {
    if (card.cardType !== "BUSINESS" || !card.galleryItems.length) {
      return null;
    }

    return <PublicCircleCardGallery id={id} items={card.galleryItems} />;
  }

  function renderReviewsSection({ id = "business-reviews" }: { id?: string } = {}) {
    if ((card.cardType !== "BUSINESS" && card.cardType !== "CREATOR") || !card.reviews.length) {
      return null;
    }

    return (
      <PublicCircleCardReviews
        id={id}
        items={card.reviews}
        trustedConnectionCount={card.approvedWalletTestimonialCount}
      />
    );
  }

  function renderTrustScoreCard() {
    const canBuildTrust = card.cardType === "BUSINESS" || card.cardType === "CREATOR";
    const testimonialHref = card.isDemo || viewerIsOwner || !canBuildTrust
      ? null
      : isAuthenticated
        ? testimonialFlowHref
        : testimonialLoginHref;

    return (
      <PublicCircleTrustPanel
        trust={card.trust}
        slug={card.slug}
        testimonialHref={testimonialHref}
        creator={card.cardType === "CREATOR"}
      />
    );
  }

  function renderTestimonialCta() {
    if (
      card.isDemo ||
      (card.cardType !== "BUSINESS" && card.cardType !== "CREATOR") ||
      viewerIsOwner
    ) {
      return null;
    }

    return (
      <section
        id="circle-card-testimonial"
        aria-labelledby="circle-card-testimonial-title"
        className="scroll-mt-24 rounded-[1.75rem] border border-gold/20 bg-gold/8 p-5 shadow-panel-soft sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Verified Trust</p>
            <h2 id="circle-card-testimonial-title" className="mt-1 font-display text-2xl text-foreground">
              Leave a Trust Signal
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Already connected? Share your experience.
            </p>
          </div>
          <Link
            href={isAuthenticated ? testimonialFlowHref : testimonialLoginHref}
            className={cn(buttonVariants(), "shrink-0 gap-2")}
          >
            <ShieldCheck size={16} />
              Build their Circle Trust
          </Link>
        </div>
      </section>
    );
  }

  function renderShareQrSection({
    className,
    id = "circle-card-share",
    qrLabel = "Scan to save this contact",
    analyticsSource = "public_card"
  }: {
    className?: string;
    id?: string;
    qrLabel?: string;
    analyticsSource?: string;
  } = {}) {
    return (
      <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 space-y-3", className)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Share</p>
            <h2 id={`${id}-title`} className="mt-1 font-display text-2xl text-foreground">
              Share this Circle Card
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Use the link or QR code when this person should be easier to find again.
            </p>
          </div>
          <CircleCardShareButton
            title={`${card.fullName} | Circle Card`}
            publicUrl={publicUrl}
            cardId={analyticsCardId}
            label="Share Card"
            hideStatus
            className="min-w-0 sm:w-52"
            buttonClassName={cn(secondaryActionClassName, "gap-2")}
          />
        </div>

        <CircleCardQrPanel
          publicUrl={publicUrl}
          slug={card.slug}
          label={qrLabel}
          variant="premium"
          analytics={
            analyticsCardId
              ? {
                  cardId: analyticsCardId,
                  source: analyticsSource
                }
              : undefined
          }
        />
      </section>
    );
  }

  if (publicLayout === "CLASSIC") {
    return (
      <div
        className="circle-card-public-theme relative overflow-hidden pb-12"
        style={circleCardThemeStyle}
        data-circle-card-surface={circleCardThemeSurface}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[image:var(--cc-theme-page-bg)]"
        />

        <div className="public-page-stack relative max-w-5xl pt-4 sm:pt-6 lg:pt-8">
          <header className="flex items-center justify-between gap-3">
            <Link
              href="/circle-card"
              className="inline-flex min-w-0 items-center gap-3 rounded-full border border-silver/12 bg-white/[0.035] px-3 py-2 shadow-inner-surface backdrop-blur"
            >
              <CircleCardLogoMark className="h-9 w-9" alt="" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">Circle Card</span>
                <span className="block text-xs text-muted">Classic profile</span>
              </span>
            </Link>
            <CircleCardShareButton
              title={`${card.fullName} | Circle Card`}
              publicUrl={publicUrl}
              cardId={analyticsCardId}
              label="Share"
              hideStatus
              size="sm"
              className="hidden sm:block"
              buttonClassName="rounded-full border-silver/18 bg-white/[0.035] px-4 text-silver hover:border-gold/35 hover:text-foreground"
            />
          </header>
          {renderCardSwitcher()}

          <main className="mx-auto mt-5 max-w-4xl space-y-5">
            <section className="rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[image:var(--cc-theme-hero-bg)] p-5 shadow-[var(--cc-theme-hero-shadow)] sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <CircleCardSpinToConnect {...spinToConnectProps} className="h-28 w-28 shrink-0">
                  <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border border-gold/45 bg-[#071126] text-2xl font-semibold text-foreground shadow-[0_0_42px_hsl(var(--cc-theme-primary-hsl)/0.22)]">
                    {card.profileImageUrl ? (
                      <CircleCardFramedImage
                        src={card.profileImageUrl}
                        alt={card.fullName}
                        positionX={card.profileImagePositionX}
                        positionY={card.profileImagePositionY}
                        scale={card.profileImageScale}
                      >
                        <span>{initials(card.fullName)}</span>
                      </CircleCardFramedImage>
                    ) : (
                      <span>{initials(card.fullName)}</span>
                    )}
                  </div>
                </CircleCardSpinToConnect>

                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                    {card.fullName}
                  </h1>
                  {displayRole ? <p className="mt-2 text-base text-silver">{displayRole}</p> : null}
                  {card.tagline ? (
                    <p className="mt-4 text-lg leading-relaxed text-foreground">{card.tagline}</p>
                  ) : card.about ? (
                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted">{card.about}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {accountTypeLabel ? (
                      <PremiumBadge icon={<UserRound size={13} />} label={accountTypeLabel} muted />
                    ) : null}
                    {identityTagLabels.map((tagLabel) => (
                      <PremiumBadge key={tagLabel} icon={<Sparkles size={13} />} label={tagLabel} muted />
                    ))}
                    {card.location ? (
                      <PremiumBadge icon={<MapPin size={13} />} label={card.location} muted />
                    ) : null}
                  </div>

                  {primaryCustomLink || primaryWebsiteLink ? (
                    <div className="mt-5 flex">
                      {renderPrimaryCta({
                        source: "classic_hero_cta",
                        className: "max-w-full sm:w-auto"
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <a
                  href={`/card/${card.slug}/vcard`}
                  className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "gap-2")}
                >
                  <Download size={16} />
                  Save Contact
                </a>
                {renderWalletAction()}
                <CircleCardShareButton
                  title={`${card.fullName} | Circle Card`}
                  publicUrl={publicUrl}
                  cardId={analyticsCardId}
                  label="Share"
                  hideStatus
                  buttonClassName={cn(secondaryActionClassName, "gap-2")}
                />
              </div>

              {renderConnectionAction()}

              {noticeMessage || errorMessage ? (
                <div className="mt-5 space-y-2">
                  {noticeMessage ? (
                    <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
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
            </section>

            {renderTrustScoreCard()}
            {renderAboutSection({ id: "classic-about" })}
            {renderServicesSection({ id: "classic-services" })}
            {renderProductsSection({ id: "classic-products" })}
            {renderMenuOffersSection({ id: "classic-menu-offers" })}
            {renderDocumentsSection({ id: "classic-downloads" })}
            {renderBookingSection({ id: "classic-booking" })}
            {renderGallerySection({ id: "classic-gallery" })}
            {renderReviewsSection({ id: "classic-reviews" })}
            {renderOpeningHoursSection({ id: "classic-opening-hours" })}
            {renderQuickConnectSection({
              id: "classic-quick-connect",
              heading: "Ways to connect"
            })}
            {renderFeaturedLinksSection({
              id: "classic-featured-links",
              heading: "Featured links",
              description: "Useful routes, offers and resources from this Circle Card."
            })}
            {renderTestimonialCta()}
            {renderShareQrSection({
              id: "classic-share"
            })}

            {!card.isDemo ? (
              <CircleCardReportForm cardId={card.id} cardSlug={card.slug} />
            ) : null}
          </main>
        </div>
      </div>
    );
  }

  if (publicLayout === "CREATOR") {
    const creatorSocialRows = [
      ...socialContactRows,
      ...(websiteContactRow ? [websiteContactRow] : [])
    ];
    const creatorFirstName = card.fullName.split(" ").filter(Boolean)[0] ?? "Creator";

    return (
      <div
        className="circle-card-public-theme relative overflow-hidden pb-16 lg:pb-20"
        style={circleCardThemeStyle}
        data-circle-card-surface={circleCardThemeSurface}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[image:var(--cc-theme-page-bg)]"
        />

        <div className="public-page-stack relative max-w-6xl pt-4 sm:pt-6 lg:pt-8">
          <header className="flex items-center justify-between gap-3">
            <Link
              href="/circle-card"
              className="inline-flex min-w-0 items-center gap-3 rounded-full border border-silver/12 bg-white/[0.04] px-3 py-2 shadow-inner-surface backdrop-blur"
            >
              <CircleCardLogoMark className="h-9 w-9" alt="" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">Circle Card</span>
                <span className="block text-xs text-muted">Creator profile</span>
              </span>
            </Link>
            <CircleCardShareButton
              title={`${card.fullName} | Circle Card`}
              publicUrl={publicUrl}
              cardId={analyticsCardId}
              label="Share"
              hideStatus
              size="sm"
              className="hidden sm:block"
              buttonClassName="rounded-full border-silver/18 bg-white/[0.04] px-4 text-silver hover:border-gold/35 hover:text-foreground"
            />
          </header>
          {renderCardSwitcher()}

          <main className="mt-5 space-y-4 sm:space-y-5">
            <section className="relative isolate overflow-hidden rounded-[2rem] border border-gold/22 bg-[image:var(--cc-theme-hero-bg)] p-5 shadow-[var(--cc-theme-hero-shadow)] sm:p-7 lg:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[image:var(--cc-theme-hero-line)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-20 top-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,hsl(var(--cc-theme-primary-hsl)/0.18),transparent_68%)] blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 right-[-8%] h-72 w-72 rounded-full bg-[radial-gradient(circle,hsl(var(--cc-theme-accent-hsl)/0.18),transparent_68%)] blur-2xl"
              />
              {card.profileImageUrl ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 overflow-hidden rounded-full opacity-20 blur-[1px] sm:h-96 sm:w-96"
                >
                  <CircleCardFramedImage
                    src={card.profileImageUrl}
                    alt=""
                    positionX={card.profileImagePositionX}
                    positionY={card.profileImagePositionY}
                    scale={card.profileImageScale}
                    className="rounded-full saturate-150"
                  />
                </div>
              ) : null}

              <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                <div className="order-first mx-auto lg:order-last">
                  <CircleCardSpinToConnect
                    {...spinToConnectProps}
                    className="h-36 w-36 sm:h-44 sm:w-44 lg:h-56 lg:w-56"
                  >
                    <div className="relative h-full w-full">
                      <div
                        aria-hidden="true"
                        className="absolute -inset-3 rounded-full bg-[conic-gradient(from_140deg,hsl(var(--cc-theme-accent-hsl)/0.8),hsl(var(--cc-theme-primary-hsl)/0.5),hsl(var(--cc-theme-button-hsl)/0.42),hsl(var(--cc-theme-accent-hsl)/0.8))] opacity-70 blur-md"
                      />
                      <div className="relative grid h-full w-full place-items-center rounded-full border border-gold/55 bg-gold/12 p-1.5 shadow-[0_0_0_10px_rgba(212,175,95,0.05),0_24px_70px_rgba(0,0,0,0.36)]">
                        <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#071126] text-4xl font-semibold text-foreground sm:text-5xl">
                          {card.profileImageUrl ? (
                            <CircleCardFramedImage
                              src={card.profileImageUrl}
                              alt={card.fullName}
                              positionX={card.profileImagePositionX}
                              positionY={card.profileImagePositionY}
                              scale={card.profileImageScale}
                            >
                              <span>{initials(card.fullName)}</span>
                            </CircleCardFramedImage>
                          ) : (
                            <span>{initials(card.fullName)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CircleCardSpinToConnect>
                </div>

                <div className="min-w-0 text-center lg:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                    <span className="rounded-full border border-gold/24 bg-gold/12 px-3 py-1.5 text-xs font-medium text-gold">
                      Creator Circle Card
                    </span>
                    <span className="rounded-full border border-silver/14 bg-white/[0.05] px-3 py-1.5 text-xs text-silver">
                      {viewLabel}
                    </span>
                    <Link href={`/card/${card.slug}/trust`} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/22 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-colors hover:border-cyan-300/38 hover:bg-cyan-300/[0.11]">
                      <ShieldCheck size={13} aria-hidden="true" /> Circle Trust {card.trust.score}
                    </Link>
                  </div>

                  <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-foreground sm:text-6xl lg:text-7xl">
                    {card.fullName}
                  </h1>
                  {displayRole ? <p className="mt-3 text-base font-medium text-silver">{displayRole}</p> : null}
                  <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-relaxed text-foreground sm:text-2xl lg:mx-0">
                    {card.tagline || "Creator profile built for action, trust and useful connection."}
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                    {card.location ? (
                      <PremiumBadge icon={<MapPin size={13} />} label={card.location} muted />
                    ) : null}
                    {accountTypeLabel ? (
                      <PremiumBadge icon={<UserRound size={13} />} label={accountTypeLabel} muted />
                    ) : null}
                    {identityTagLabels.map((tagLabel) => (
                      <PremiumBadge key={tagLabel} icon={<Sparkles size={13} />} label={tagLabel} muted />
                    ))}
                  </div>

                  {creatorSocialRows.length ? (
                    <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
                      {creatorSocialRows.map((row) => (
                        <a
                          key={row.key}
                          href={row.href}
                          {...row.anchorProps}
                          aria-label={row.label}
                          className="group inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border border-silver/14 bg-white/[0.06] px-1.5 pr-3 text-left shadow-inner-surface backdrop-blur transition-all hover:-translate-y-0.5 hover:border-gold/32 hover:bg-white/[0.09]"
                        >
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/18 bg-gold/12 text-gold">
                            {row.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[11px] leading-tight text-silver">{row.label}</span>
                            <span className="block max-w-[8.5rem] truncate text-xs font-semibold leading-tight text-foreground">
                              {row.value}
                            </span>
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : null}

                  {primaryCustomLink || primaryWebsiteLink ? (
                    <div className="mt-6 flex justify-center lg:justify-start">
                      {renderPrimaryCta({
                        source: "creator_hero_cta",
                        className: "max-w-full sm:w-auto"
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section
              aria-label="Circle Card actions"
              className="rounded-[1.5rem] border border-silver/14 bg-white/[0.04] p-3 shadow-[0_20px_58px_rgba(0,0,0,0.24)] backdrop-blur sm:p-4"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <a
                  href={`/card/${card.slug}/vcard`}
                  className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "gap-2")}
                >
                  <Download size={16} />
                  Save Contact
                </a>
                {renderWalletAction()}
                <CircleCardShareButton
                  title={`${card.fullName} | Circle Card`}
                  publicUrl={publicUrl}
                  cardId={analyticsCardId}
                  label="Share Card"
                  hideStatus
                  buttonClassName={cn(secondaryActionClassName, "gap-2")}
                />
              </div>
              {renderConnectionAction()}
            </section>

            {noticeMessage || errorMessage ? (
              <div className="space-y-2">
                {noticeMessage ? (
                  <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
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

            {card.featuredContentItems.length ? (
              <section id="creator-featured-content" className="rounded-[1.75rem] border border-cyan-300/16 bg-white/[0.035] p-4 shadow-[0_22px_64px_rgba(0,0,0,0.22)] sm:p-5 lg:p-6">
                <div className="mb-4 sm:mb-5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-cyan-200">Featured Content</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Selected work from {creatorFirstName}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">A curated portfolio of videos, posts and creator work worth seeing first.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {card.featuredContentItems.map((item) => <CreatorFeaturedContentCard key={item.id} item={item} analyticsCardId={analyticsCardId} />)}
                </div>
              </section>
            ) : null}
            {renderCreatorMediaKitSection()}
            {renderCreatorAudienceSnapshotSection()}
            {renderCreatorBrandPartnershipsSection()}
            {card.cardType === "CREATOR" && card.pressProofItems.length ? (
              <section id="creator-press-proof" aria-labelledby="creator-press-proof-title" className="min-w-0 overflow-hidden rounded-[1.75rem] border border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_36%),rgba(255,255,255,0.035)] p-4 shadow-[0_22px_64px_rgba(0,0,0,0.24)] sm:p-5 lg:p-6">
                <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-cyan-200">Press &amp; Proof</p>
                    <h2 id="creator-press-proof-title" className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Proof &amp; Milestones</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Press mentions, creator milestones and proof of work that build a clear credibility story.</p>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/22 bg-cyan-400/[0.08] text-cyan-100"><Award size={20} /></span>
                </div>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {card.pressProofItems.map((item) => <CreatorPressProofCard key={item.id} item={item} analyticsCardId={analyticsCardId} />)}
                </div>
              </section>
            ) : null}
            {card.cardType === "CREATOR" && card.creatorOffers.length ? (
              <section id="creator-offers" aria-labelledby="creator-offers-title" className="min-w-0 overflow-hidden rounded-[1.75rem] border border-gold/20 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.09),transparent_35%),rgba(255,255,255,0.035)] p-4 shadow-[0_22px_64px_rgba(0,0,0,0.24)] sm:p-5 lg:p-6">
                <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-gold">Creator Offers</p>
                    <h2 id="creator-offers-title" className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Support My Work</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Courses, downloads, communities and creator favourites, with a clear next step.</p>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/24 bg-gold/10 text-gold"><ShoppingBag size={20} /></span>
                </div>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {card.creatorOffers.map((item) => <CreatorOfferCard key={item.id} item={item} analyticsCardId={analyticsCardId} />)}
                </div>
              </section>
            ) : null}

            {renderTrustScoreCard()}
            <PublicRecommendations recommendations={card.recommendations} />
            {renderAboutSection({ id: "creator-about", heading: "Creator story" })}
            {renderServicesSection({ id: "creator-services" })}
            {renderProductsSection({ id: "creator-products" })}
            {renderMenuOffersSection({ id: "creator-menu-offers" })}
            {renderDocumentsSection({ id: "creator-downloads" })}
            {renderBookingSection({ id: "creator-booking" })}
            {renderGallerySection({ id: "creator-gallery" })}
            {renderReviewsSection({ id: "creator-reviews" })}
            {renderOpeningHoursSection({ id: "creator-opening-hours" })}
            {creatorSocialRows.length
              ? renderQuickConnectSection({
                  rows: creatorSocialRows,
                  id: "creator-quick-connect",
                  heading: "Creator platforms & community"
                })
              : null}
            {renderFeaturedLinksSection({
              id: "creator-featured-links",
              eyebrow: "Ways To Work Together",
              heading: `Work with ${creatorFirstName}`,
              description: "Explore selected links, communities and ways to work together.",
              source: "creator_featured_card"
            })}
            {renderTestimonialCta()}
            {renderShareQrSection({
              id: "creator-share",
              qrLabel: "Scan to save this creator",
              analyticsSource: "creator_profile"
            })}

            <section
              aria-label="Circle Card trust"
              className="rounded-[1.25rem] border border-silver/12 bg-white/[0.026] p-4 shadow-inner-surface sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <CircleCardLogoMark className="h-9 w-9" alt="" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Powered by Circle Card</p>
                    <p className="text-xs text-muted">Trusted identity from The Business Circle</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {membershipLabel ? (
                    <PremiumBadge icon={<Crown size={13} />} label={membershipLabel} muted />
                  ) : (
                    <PremiumBadge icon={<ShieldCheck size={13} />} label={ownerAccountLabel} muted />
                  )}
                  {recommendationCount ? (
                    <PremiumBadge
                      icon={<UserCheck size={13} />}
                      label={`${recommendationCount} recommendation${recommendationCount === 1 ? "" : "s"}`}
                      muted
                    />
                  ) : null}
                  {successfulReferralCount ? (
                    <PremiumBadge
                      icon={<Handshake size={13} />}
                      label={`${successfulReferralCount} referral${successfulReferralCount === 1 ? "" : "s"}`}
                      muted
                    />
                  ) : null}
                </div>
              </div>

              {!card.isDemo ? (
                <CircleCardReportForm cardId={card.id} cardSlug={card.slug} className="mt-4" />
              ) : null}
            </section>
          </main>
        </div>
      </div>
    );
  }

  const businessHeroImageUrl = card.businessLogoUrl || card.profileImageUrl;
  const businessHeroImageAlt = card.businessLogoUrl
    ? `${card.businessName || card.fullName} logo`
    : card.fullName;
  const businessHeroImagePositionX = card.businessLogoUrl
    ? card.businessLogoPositionX
    : card.profileImagePositionX;
  const businessHeroImagePositionY = card.businessLogoUrl
    ? card.businessLogoPositionY
    : card.profileImagePositionY;
  const businessHeroImageScale = card.businessLogoUrl
    ? card.businessLogoScale
    : card.profileImageScale;
  const businessHeroFallbackInitials = initials(card.businessName || card.fullName);

  return (
    <div
      className="circle-card-public-theme relative overflow-hidden pb-32 lg:pb-16"
      style={circleCardThemeStyle}
      data-circle-card-surface={circleCardThemeSurface}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[image:var(--cc-theme-page-bg)]"
      />

      <div className="public-page-stack relative max-w-7xl pt-4 sm:pt-6 lg:pt-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/circle-card"
            className="inline-flex min-w-0 items-center gap-3 rounded-full border border-silver/12 bg-white/[0.035] px-3 py-2 shadow-inner-surface backdrop-blur"
          >
            <CircleCardLogoMark className="h-9 w-9" alt="" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Circle Card</span>
              <span className="block text-xs text-muted">Premium identity</span>
            </span>
          </Link>

          <CircleCardShareButton
            title={`${card.fullName} | Circle Card`}
            publicUrl={publicUrl}
            cardId={analyticsCardId}
            label="Share"
            hideStatus
            size="sm"
            className="hidden sm:block"
            buttonClassName="rounded-full border-silver/18 bg-white/[0.035] px-4 text-silver hover:border-gold/35 hover:text-foreground"
          />
        </header>
        {renderCardSwitcher()}

        <section className="mx-auto mt-5 max-w-5xl">
          <main className="space-y-5">
            <article
              aria-labelledby="circle-card-profile-title"
              className="relative overflow-hidden rounded-[2rem] border border-[color:var(--cc-theme-secondary-border)] bg-[image:var(--cc-theme-hero-bg)] p-5 shadow-[var(--cc-theme-hero-shadow)] sm:p-7"
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-8 top-0 h-px bg-[image:var(--cc-theme-hero-line)]"
              />

              <div className="relative z-10">
                <div className="flex justify-center">
                  <CircleCardSpinToConnect
                    {...spinToConnectProps}
                    className="h-40 w-40 sm:h-48 sm:w-48"
                    showAmbientRing={false}
                  >
                    <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border border-gold/60 bg-[#071126] text-4xl font-semibold text-foreground shadow-[0_0_64px_hsl(var(--cc-theme-primary-hsl)/0.3)]">
                      {businessHeroImageUrl ? (
                        <CircleCardFramedImage
                          src={businessHeroImageUrl}
                          alt={businessHeroImageAlt}
                          positionX={businessHeroImagePositionX}
                          positionY={businessHeroImagePositionY}
                          scale={businessHeroImageScale}
                        >
                          <span>{businessHeroFallbackInitials}</span>
                        </CircleCardFramedImage>
                      ) : (
                        <span>{businessHeroFallbackInitials}</span>
                      )}
                    </div>
                  </CircleCardSpinToConnect>
                </div>

                <div className="mx-auto mt-6 max-w-2xl text-center">
                  <h1
                    id="circle-card-profile-title"
                    className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl"
                  >
                    {card.fullName}
                  </h1>

                  {card.role ? (
                    <p className="mt-3 text-base font-medium text-silver">{card.role}</p>
                  ) : null}

                  {card.businessName ? (
                    <p className="mt-1 text-sm text-muted">{card.businessName}</p>
                  ) : null}

                  {card.tagline ? (
                    <p className="mt-5 text-xl font-medium leading-snug text-foreground sm:text-2xl">
                      {card.tagline}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
                    {card.location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={14} className="text-silver" />
                        {card.location}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles size={14} className="text-silver" />
                      {viewLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <PremiumBadge icon={<Star size={13} />} label="Circle Card" />
                  {membershipLabel ? (
                    <PremiumBadge icon={<Crown size={13} />} label={membershipLabel} />
                  ) : (
                    <PremiumBadge icon={<ShieldCheck size={13} />} label={ownerAccountLabel} muted />
                  )}
                  {recommendationCount ? (
                    <PremiumBadge
                      icon={<UserCheck size={13} />}
                      label={`Recommended by ${recommendationCount} people`}
                      muted
                    />
                  ) : null}
                  {successfulReferralCount ? (
                    <PremiumBadge
                      icon={<Handshake size={13} />}
                      label={`${successfulReferralCount} successful referral${
                        successfulReferralCount === 1 ? "" : "s"
                      }`}
                      muted
                    />
                  ) : null}
                  {accountTypeLabel ? (
                    <PremiumBadge icon={<UserRound size={13} />} label={accountTypeLabel} muted />
                  ) : null}
                  {identityTagLabels.map((tagLabel) => (
                    <PremiumBadge key={tagLabel} icon={<Sparkles size={13} />} label={tagLabel} muted />
                  ))}
                  {card.identityTags.length > identityTagLabels.length ? (
                    <PremiumBadge
                      icon={<Sparkles size={13} />}
                      label={`+${card.identityTags.length - identityTagLabels.length} more`}
                      muted
                    />
                  ) : null}
                </div>

                {primaryCustomLink || primaryWebsiteLink ? (
                  <div className="mt-6 flex justify-center">
                    {renderPrimaryCta({
                      source: "business_hero_cta",
                      className: "max-w-full sm:w-auto"
                    })}
                  </div>
                ) : null}

                {noticeMessage || errorMessage ? (
                  <div className="mt-6 space-y-2">
                    {noticeMessage ? (
                      <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
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
              </div>
            </article>

            <section
              aria-label="Circle Card actions"
              className="rounded-[1.75rem] border border-gold/22 bg-[linear-gradient(145deg,rgba(8,19,43,0.9),rgba(4,10,24,0.96))] p-4 shadow-[0_22px_58px_rgba(0,0,0,0.32)] sm:p-5"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <a
                  href={`/card/${card.slug}/vcard`}
                  className={cn(buttonVariants(), primaryActionClassName, "gap-2")}
                >
                  <Download size={16} />
                  Save Contact
                </a>

                {renderWalletAction()}

                <CircleCardShareButton
                  title={`${card.fullName} | Circle Card`}
                  publicUrl={publicUrl}
                  cardId={analyticsCardId}
                  label="Share Card"
                  variant="outline"
                  className="min-w-0"
                  buttonClassName={cn(secondaryActionClassName, "gap-2")}
                  statusClassName="text-silver"
                />
              </div>

              {renderConnectionAction()}

              {!isAuthenticated ? (
                <div className="mt-4 rounded-2xl border border-silver/14 bg-white/[0.035] p-4">
                  <p className="text-sm font-medium text-foreground">Save to Circle Wallet</p>
                  <p className="mt-2 text-sm text-muted">
                    Download the contact now, or sign in to save this person into your private Circle
                    Wallet.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={publicCardLoginHref}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                    >
                      <LogIn size={14} />
                      Sign in
                    </Link>
                    <Link
                      href={circleCardRegistrationHref}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                    >
                      <UserPlus size={14} />
                      Create Circle Card
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>

            {renderTrustScoreCard()}
            {renderAboutSection({ id: "business-about" })}
            {renderBusinessHighlightsSection()}
            {renderServicesSection()}
            {renderPriceListSection()}
            {renderProductsSection()}
            {renderMenuOffersSection()}
            {renderDocumentsSection()}
            {renderBookingSection()}
            {renderGallerySection()}
            {renderReviewsSection()}
            {renderOpeningHoursSection()}
            {renderQuickConnectSection({
              id: "business-quick-connect",
              heading: "Direct routes back"
            })}
            {renderFeaturedLinksSection({
              id: "business-featured-links",
              heading: "Featured links",
              description: "Offers, bookings, files and proof links from this Circle Card."
            })}
            {renderTestimonialCta()}
            {renderShareQrSection({
              id: "business-share"
            })}
            <PublicRecommendations recommendations={card.recommendations} />
            <TrustArea
              card={card}
              ownerAccountLabel={ownerAccountLabel}
              ownerIsBcnMember={ownerIsBcnMember}
            />
            <section className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-inner-surface">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2f6dff]/26 bg-[#1e5bff]/12 text-[#d8e6ff]">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Identity signals</p>
                  <p className="text-xs text-muted">Views, QR scans, saves and shares stay tracked.</p>
                </div>
              </div>
            </section>
          </main>
        </section>

        <CircleCardInstallPrompt className="mt-5 lg:hidden" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-silver/14 bg-[#030813]/94 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-panel backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
          <a
            href={`/card/${card.slug}/vcard`}
            className={cn(buttonVariants({ variant: "outline" }), mobileActionClassName)}
          >
            <Download size={15} />
            Contact
          </a>
          <div className="min-w-0">{renderWalletAction({ mobileBar: true })}</div>
          <CircleCardShareButton
            title={`${card.fullName} | Circle Card`}
            publicUrl={publicUrl}
            cardId={analyticsCardId}
            label="Share"
            hideStatus
            variant="outline"
            className="min-w-0"
            buttonClassName={mobileActionClassName}
          />
        </div>
      </div>
    </div>
  );
}
