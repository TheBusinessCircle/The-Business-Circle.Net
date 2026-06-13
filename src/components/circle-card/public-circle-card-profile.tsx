import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import {
  acceptCircleCardConnectionRequestAction,
  cancelCircleCardConnectionRequestAction,
  declineCircleCardConnectionRequestAction,
  removeCircleWalletContactAction,
  saveCircleWalletContactAction,
  sendCircleCardConnectionRequestAction
} from "@/actions/circle-card.actions";
import { CircleCardAboutExpander } from "@/components/circle-card/circle-card-about-expander";
import { CircleCardFramedImage } from "@/components/circle-card/circle-card-framed-image";
import { CircleCardInstallPrompt } from "@/components/circle-card/circle-card-install-prompt";
import { CircleCardPrivateLinkAction } from "@/components/circle-card/circle-card-private-link-action";
import { CircleCardQrPanel } from "@/components/circle-card/circle-card-qr-panel";
import { CircleCardReportForm } from "@/components/circle-card/circle-card-report-form";
import { CircleCardShareButton } from "@/components/circle-card/circle-card-share-button";
import { CircleCardTrackedLink } from "@/components/circle-card/circle-card-tracked-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CircleCardEventTypeValue } from "@/lib/circle-card/analytics-events";
import {
  getCircleCardAccountTypeLabel,
  getCircleCardIdentityTagLabel
} from "@/lib/circle-card/identity";
import {
  buildCircleCardFileActionLabel,
  circleCardFileActionLabel,
  circleCardFileKindLabel,
  detectCircleCardFileKind,
  resolveCircleCardFileAction
} from "@/lib/circle-card/file-actions";
import { getExternalLinkProps } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { PublicCircleCard } from "@/server/circle-card";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Crown,
  Download,
  Handshake,
  Facebook,
  Globe2,
  Instagram,
  LinkIcon,
  Linkedin,
  LogIn,
  Mail,
  Menu as MenuIcon,
  MapPin,
  Music2,
  Phone,
  Send,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
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
  notice?: string;
  error?: string;
};

type SocialPlatformConfig = {
  key: keyof PublicCircleCard["socialLinks"];
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
  "connection-rate-limited": "You've sent several connection requests recently. Please try again later."
};

const SOCIAL_CONTACT_PLATFORMS: readonly SocialPlatformConfig[] = [
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "tiktok", label: "TikTok", icon: Music2, handlePrefix: true },
  { key: "instagram", label: "Instagram", icon: Instagram, handlePrefix: true },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "x", label: "X", icon: AtSign, handlePrefix: true },
  { key: "youtube", label: "YouTube", icon: Youtube }
] as const;

const SOCIAL_CONTACT_KEYS = new Set<string>(SOCIAL_CONTACT_PLATFORMS.map((platform) => platform.key));

const CIRCLE_CARD_LOGO_SRC = "/branding/circle-card-logo.png";

const primaryActionClassName =
  "h-12 w-full rounded-2xl border border-gold/45 bg-[linear-gradient(135deg,#f0cf88_0%,#d3aa58_48%,#a9782e_100%)] text-[#061126] shadow-[0_18px_44px_rgba(211,170,88,0.2)] hover:border-gold/70 hover:bg-gold hover:text-[#061126]";

const secondaryActionClassName =
  "h-12 w-full rounded-2xl border border-[#2f6dff]/30 bg-[#0b1c3f]/72 text-foreground shadow-[0_16px_38px_rgba(16,68,180,0.16)] hover:border-gold/35 hover:bg-[#102958] hover:text-foreground";

const mobileActionClassName =
  "h-12 w-full min-w-0 flex-col gap-0.5 rounded-2xl border border-[#2f6dff]/28 bg-[#0b1c3f]/86 px-1 text-[11px] leading-none text-foreground shadow-[0_10px_26px_rgba(2,8,23,0.34)] hover:border-gold/35 hover:bg-[#102958]";

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

function customLinkActionType(link: PublicCircleCard["customLinks"][number]) {
  if (link.fileUrl || link.fileMimeType || link.fileName) {
    return `${circleCardFileActionLabel(resolveCircleCardFileAction(link))} ${circleCardFileKindLabel(
      detectCircleCardFileKind(link)
    )}`.replace(" Unknown", " File");
  }

  switch (link.type) {
    case "BOOK_CALL":
      return "Book a call";
    case "PORTFOLIO":
      return "Portfolio";
    case "LATEST_OFFER":
      return "Latest offer";
    case "COMMUNITY":
      return "Community";
    case "DOWNLOAD":
      return link.fileUrl ? "Download" : "Download link";
    case "REVIEW":
      return "Review";
    case "SHOP":
      return "Shop";
    case "MENU":
      return "Menu";
    case "CASE_STUDY":
      return "Case study";
    default:
      return "Custom link";
  }
}

function customLinkHref(link: PublicCircleCard["customLinks"][number]) {
  if (link.visibility === "PRIVATE_CODE") {
    return "";
  }

  return link.fileUrl || link.url || "";
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

function CircleCardLogoMark({ className, alt = "" }: { className?: string; alt?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/45 bg-[#061126] shadow-[0_0_30px_rgba(47,109,255,0.24)]",
        className
      )}
    >
      <img src={CIRCLE_CARD_LOGO_SRC} alt={alt} className="h-full w-full object-cover" />
    </span>
  );
}

function CircleCardBadgeMark({
  imageUrl,
  label,
  positionX,
  positionY,
  scale
}: {
  imageUrl?: string | null;
  label: string;
  positionX?: number | null;
  positionY?: number | null;
  scale?: number | null;
}) {
  return (
    <span className="absolute bottom-2 right-2 inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gold/70 bg-[#061126] p-1 shadow-[0_0_34px_rgba(64,112,255,0.3)]">
      <CircleCardFramedImage
        src={imageUrl || CIRCLE_CARD_LOGO_SRC}
        fallbackSrc={CIRCLE_CARD_LOGO_SRC}
        alt=""
        positionX={positionX}
        positionY={positionY}
        scale={scale}
        fallbackPositionX={50}
        fallbackPositionY={50}
        fallbackScale={1}
        className="rounded-full"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
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
};

type ContactRow = ContactActionProps & {
  key: string;
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
  metadata
}: ContactActionProps) {
  const className =
    "group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-silver/14 bg-white/[0.035] px-3.5 py-3 text-left shadow-inner-surface transition-all hover:border-[#3f7cff]/36 hover:bg-[#102958]/45 sm:px-4";
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/18 bg-gold/10 text-gold">
          {icon}
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
  BOOK_CALL: 2,
  DOWNLOAD: 3,
  SHOP: 4,
  PORTFOLIO: 5,
  CASE_STUDY: 6,
  GENERAL: 7
};

function creatorLinkPriority(link: PublicCircleCard["customLinks"][number]) {
  return CREATOR_PRIMARY_CTA_PRIORITY[link.type] ?? 20;
}

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

function creatorFeaturedLinks(card: PublicCircleCard, primaryLinkId?: string | null) {
  return [...card.customLinks]
    .filter((link) => link.id !== primaryLinkId)
    .sort((a, b) => creatorLinkPriority(a) - creatorLinkPriority(b) || a.sortOrder - b.sortOrder)
    .slice(0, 6);
}

function selectCreatorPrimaryLink(card: PublicCircleCard) {
  return [...card.customLinks]
    .filter((link) => link.visibility !== "PRIVATE_CODE" && Boolean(customLinkHref(link)))
    .sort((a, b) => creatorLinkPriority(a) - creatorLinkPriority(b) || a.sortOrder - b.sortOrder)[0] ?? null;
}

function CreatorSmartLinkCard({
  link,
  analyticsCardId,
  layout
}: {
  link: PublicCircleCard["customLinks"][number];
  analyticsCardId?: string;
  layout: PublicCircleCard["profileLayout"];
}) {
  const accentLabel = creatorLinkAccentLabel(link);
  const description = offerEndDescription(link);

  if (link.visibility === "PRIVATE_CODE") {
    return (
      <div className="rounded-[1.35rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(15,35,78,0.74),rgba(4,10,24,0.94))] p-4 shadow-inner-surface">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/24 bg-gold/12 text-gold">
            {customLinkIcon(link)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">{accentLabel}</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {customLinkDisplayLabel(link)}
            </p>
          </div>
        </div>
        <CircleCardPrivateLinkAction
          linkId={link.id}
          type={link.type}
          value={customLinkDisplayLabel(link)}
          description={description}
          accessCodeHint={link.accessCodeHint}
          hasAccessCode={link.hasAccessCode}
        />
      </div>
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
        source: "creator_featured_card",
        layout,
        linkId: link.id,
        label: link.label,
        type: link.type,
        url: analyticsUrlValue(href)
      }}
      className="group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-[1.35rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(12,31,72,0.82),rgba(4,10,24,0.96))] p-4 shadow-inner-surface transition-all hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-[0_24px_64px_rgba(47,109,255,0.16)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,95,0.56),transparent)]"
      />
      <span className="relative z-10 flex items-start justify-between gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/22 bg-gold/12 text-gold">
          {customLinkIcon(link)}
        </span>
        <span className="rounded-full border border-silver/14 bg-white/[0.04] px-2.5 py-1 text-[11px] text-silver">
          {accentLabel}
        </span>
      </span>
      <span className="relative z-10 mt-5 block">
        <span className="line-clamp-2 text-lg font-semibold leading-tight text-foreground">
          {customLinkDisplayLabel(link)}
        </span>
        {description ? (
          <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{description}</span>
        ) : null}
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold">
          Open
          <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </CircleCardTrackedLink>
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

  for (const platform of SOCIAL_CONTACT_PLATFORMS) {
    const href = card.socialLinks[platform.key];

    if (!href) {
      continue;
    }

    const Icon = platform.icon;
    contactRows.push({
      key: platform.key,
      icon: <Icon size={18} />,
      label: platform.label,
      value: socialDisplayValue(platform, href),
      href,
      anchorProps: getExternalLinkProps(href)
    });
  }

  const socialContactRows = contactRows.filter((row) => SOCIAL_CONTACT_KEYS.has(row.key));
  const directContactRows = contactRows.filter((row) => !SOCIAL_CONTACT_KEYS.has(row.key));

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
        href={`/login?from=${encodeURIComponent(`/card/${card.slug}`)}`}
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

  function renderCustomLinkAction(link: PublicCircleCard["customLinks"][number]) {
    if (link.visibility === "PRIVATE_CODE") {
      return (
        <CircleCardPrivateLinkAction
          key={link.id}
          linkId={link.id}
          type={link.type}
          value={customLinkDisplayLabel(link)}
          description={offerEndDescription(link)}
          accessCodeHint={link.accessCodeHint}
          hasAccessCode={link.hasAccessCode}
        />
      );
    }

    const href = customLinkHref(link);

    if (!href) {
      return null;
    }

    return (
      <ContactAction
        key={link.id}
        icon={customLinkIcon(link)}
        label={customLinkActionType(link)}
        value={customLinkDisplayLabel(link)}
        description={offerEndDescription(link)}
        href={href}
        anchorProps={customLinkAnchorProps(link, href)}
        analyticsCardId={analyticsCardId}
        eventType="CUSTOM_LINK_CLICK"
        metadata={{
          source: "public_card",
          layout: card.profileLayout,
          linkId: link.id,
          label: link.label,
          type: link.type,
          actionMode: link.actionMode,
          resolvedAction: link.fileUrl || link.fileMimeType || link.fileName
            ? resolveCircleCardFileAction(link)
            : undefined,
          url: analyticsUrlValue(href)
        }}
      />
    );
  }

  if (card.profileLayout === "CLASSIC") {
    return (
      <div className="relative overflow-hidden pb-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(47,109,255,0.18),transparent_34%),linear-gradient(180deg,#030813_0%,#071126_48%,#030712_100%)]"
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

          <main className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-[1.75rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(9,20,45,0.88),rgba(4,10,24,0.96))] p-5 shadow-panel-soft sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="relative h-28 w-28 shrink-0">
                  <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border border-gold/45 bg-[#071126] text-2xl font-semibold text-foreground shadow-[0_0_42px_rgba(47,109,255,0.22)]">
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

            <aside id="classic-contact" className="space-y-5">
              <section className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(9,20,45,0.9),rgba(4,10,24,0.96))] p-5 shadow-panel-soft">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Mail size={16} className="text-gold" />
                  Contact
                </h2>
                <div className="mt-4 space-y-2">
                  {contactRows.length ? (
                    contactRows.map((row) => (
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
                      Contact details can be added from the Circle Card dashboard.
                    </p>
                  )}
                </div>
              </section>

              {card.customLinks.length ? (
                <section className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft">
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <LinkIcon size={16} className="text-gold" />
                    Links
                  </h2>
                  <div className="mt-4 space-y-2">{card.customLinks.map(renderCustomLinkAction)}</div>
                </section>
              ) : null}

              {card.about ? (
                <section className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft">
                  <h2 className="text-sm font-semibold text-foreground">About</h2>
                  <CircleCardAboutExpander text={card.about} className="mt-3" />
                </section>
              ) : null}

              {!card.isDemo ? (
                <CircleCardReportForm cardId={card.id} cardSlug={card.slug} />
              ) : null}
            </aside>
          </main>
        </div>
      </div>
    );
  }

  if (card.profileLayout === "CREATOR") {
    const creatorPrimaryLink = selectCreatorPrimaryLink(card);
    const creatorPrimaryWebsite = creatorPrimaryLink
      ? null
      : directContactRows.find((row) => row.key === "website") ?? null;
    const creatorLinks = creatorFeaturedLinks(card, creatorPrimaryLink?.id);
    const creatorSocialGrid = [
      ...socialContactRows,
      ...(creatorPrimaryWebsite ? [] : directContactRows.filter((row) => row.key === "website"))
    ];
    const creatorFutureSections = [
      {
        title: "Featured Content",
        icon: BookOpen,
        text: "Media kits, lead magnets, courses and flagship creator assets can live here next."
      },
      {
        title: "Latest Content",
        icon: BarChart3,
        text: "A polished stream for recent videos, posts, newsletters and launches."
      },
      {
        title: "Partnerships",
        icon: Handshake,
        text: "A future space for collaborations, sponsors and brand-ready signals."
      },
      {
        title: "Recommended Creators",
        icon: Users,
        text: "Creator discovery can connect complementary people and audiences."
      }
    ];

    return (
      <div className="relative overflow-hidden pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(47,109,255,0.32),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(212,175,95,0.18),transparent_28%),linear-gradient(180deg,#030813_0%,#071126_48%,#030712_100%)]"
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
              buttonClassName="rounded-full border-silver/18 bg-white/[0.035] px-4 text-silver hover:border-gold/35 hover:text-foreground"
            />
          </header>

          <main className="mt-5 space-y-4 sm:space-y-5">
            <section className="relative overflow-hidden rounded-[2rem] border border-gold/24 bg-[linear-gradient(145deg,rgba(10,25,58,0.92),rgba(4,10,24,0.97))] shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_70px_rgba(47,109,255,0.14)]">
              <div className="relative min-h-[310px] overflow-hidden border-b border-gold/14 bg-[radial-gradient(circle_at_18%_18%,rgba(212,175,95,0.26),transparent_24%),radial-gradient(circle_at_78%_16%,rgba(47,109,255,0.38),transparent_31%),linear-gradient(135deg,rgba(9,34,80,0.98),rgba(3,7,16,0.98))] p-5 sm:min-h-[390px] sm:p-8">
                <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,95,0.72),rgba(75,126,255,0.45),transparent)]" />
                <div
                  aria-hidden="true"
                  className="absolute -bottom-20 right-[-8%] h-64 w-64 rounded-full border border-gold/12 bg-[radial-gradient(circle,rgba(212,175,95,0.18),transparent_64%)] blur-sm"
                />
                <div className="relative z-10 flex min-h-[270px] flex-col justify-between gap-8 sm:min-h-[330px]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-gold/24 bg-gold/12 px-3 py-1.5 text-xs font-medium text-gold">
                      Creator Circle Card
                    </span>
                    <span className="rounded-full border border-silver/16 bg-white/[0.04] px-3 py-1.5 text-xs text-silver">
                      {viewLabel}
                    </span>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
                    <div className="max-w-2xl">
                      <div className="relative mb-5 h-28 w-28 sm:h-32 sm:w-32">
                        <div className="grid h-full w-full place-items-center rounded-full border border-gold/60 bg-gold/12 p-1.5 shadow-[0_0_0_10px_rgba(212,175,95,0.05),0_0_64px_rgba(47,109,255,0.34)]">
                          <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#071126] text-3xl font-semibold text-foreground">
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
                        <CircleCardBadgeMark
                          imageUrl={card.businessLogoUrl}
                          label={card.businessName ? `${card.businessName} logo` : "Circle Card badge"}
                          positionX={card.businessLogoPositionX}
                          positionY={card.businessLogoPositionY}
                          scale={card.businessLogoScale}
                        />
                      </div>

                      <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-6xl">
                        {card.fullName}
                      </h1>
                      {displayRole ? <p className="mt-2 text-base text-silver">{displayRole}</p> : null}
                      <p className="mt-4 max-w-xl text-lg leading-relaxed text-foreground sm:text-2xl">
                        {card.tagline || "Creator profile built for action, trust and useful connection."}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
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
                    </div>

                    {socialContactRows.length ? (
                      <div className="rounded-[1.5rem] border border-silver/14 bg-[#061126]/64 p-4 shadow-inner-surface backdrop-blur">
                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-silver">
                          Main socials
                        </p>
                        <div className="mt-3 grid gap-2">
                          {socialContactRows.slice(0, 3).map((row) => (
                            <a
                              key={row.key}
                              href={row.href}
                              {...row.anchorProps}
                              className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-silver/12 bg-white/[0.04] px-3 text-sm text-foreground transition-colors hover:border-gold/32"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="text-gold">{row.icon}</span>
                                <span className="truncate">{row.value}</span>
                              </span>
                              <ChevronRight size={15} className="shrink-0 text-silver" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                {renderWalletAction()}
                <a
                  href={`/card/${card.slug}/vcard`}
                  className={cn(buttonVariants({ variant: "outline" }), secondaryActionClassName, "gap-2")}
                >
                  <Download size={16} />
                  Save Contact
                </a>
                <CircleCardShareButton
                  title={`${card.fullName} | Circle Card`}
                  publicUrl={publicUrl}
                  cardId={analyticsCardId}
                  label="Share"
                  hideStatus
                  buttonClassName={cn(secondaryActionClassName, "gap-2")}
                />
              </div>
            </section>

            {creatorPrimaryLink || creatorPrimaryWebsite ? (
              <section className="rounded-[1.75rem] border border-gold/24 bg-[linear-gradient(135deg,rgba(212,175,95,0.15),rgba(11,28,63,0.86)_48%,rgba(4,10,24,0.96))] p-4 shadow-panel-soft sm:p-5">
                {creatorPrimaryLink ? (
                  <CircleCardTrackedLink
                    {...customLinkAnchorProps(creatorPrimaryLink, customLinkHref(creatorPrimaryLink))}
                    href={customLinkHref(creatorPrimaryLink)}
                    cardId={analyticsCardId ?? ""}
                    eventType="CUSTOM_LINK_CLICK"
                    metadata={{
                      source: "creator_primary_cta",
                      layout: card.profileLayout,
                      linkId: creatorPrimaryLink.id,
                      label: creatorPrimaryLink.label,
                      type: creatorPrimaryLink.type,
                      url: analyticsUrlValue(customLinkHref(creatorPrimaryLink))
                    }}
                    className="group flex flex-col gap-4 rounded-[1.35rem] border border-gold/24 bg-[#061126]/54 p-4 transition-colors hover:border-gold/45 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex min-w-0 gap-4">
                      <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold/28 bg-gold/12 text-gold">
                        {customLinkIcon(creatorPrimaryLink)}
                      </span>
                      <span className="min-w-0">
                        <span className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
                          {creatorLinkAccentLabel(creatorPrimaryLink)}
                        </span>
                        <span className="mt-1 block text-xl font-semibold leading-tight text-foreground">
                          {customLinkDisplayLabel(creatorPrimaryLink)}
                        </span>
                        {offerEndDescription(creatorPrimaryLink) ? (
                          <span className="mt-2 block line-clamp-2 text-sm leading-relaxed text-muted">
                            {offerEndDescription(creatorPrimaryLink)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className={cn(buttonVariants(), primaryActionClassName, "w-full gap-2 sm:w-auto")}>
                      Open
                      <ChevronRight size={16} />
                    </span>
                  </CircleCardTrackedLink>
                ) : creatorPrimaryWebsite ? (
                  <a
                    href={creatorPrimaryWebsite.href}
                    {...creatorPrimaryWebsite.anchorProps}
                    className="group flex flex-col gap-4 rounded-[1.35rem] border border-gold/24 bg-[#061126]/54 p-4 transition-colors hover:border-gold/45 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex min-w-0 gap-4">
                      <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold/28 bg-gold/12 text-gold">
                        {creatorPrimaryWebsite.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
                          Website
                        </span>
                        <span className="mt-1 block text-xl font-semibold leading-tight text-foreground">
                          {creatorPrimaryWebsite.value}
                        </span>
                        <span className="mt-2 block text-sm leading-relaxed text-muted">
                          Explore the main home for this creator.
                        </span>
                      </span>
                    </span>
                    <span className={cn(buttonVariants(), primaryActionClassName, "w-full gap-2 sm:w-auto")}>
                      Visit
                      <ChevronRight size={16} />
                    </span>
                  </a>
                ) : null}
              </section>
            ) : null}

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

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(9,20,45,0.9),rgba(4,10,24,0.96))] p-5 shadow-panel-soft">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
                    <LinkIcon size={18} className="text-gold" />
                    Featured links
                  </h2>
                  <span className="rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1 text-xs text-muted">
                    {creatorLinks.length} live
                  </span>
                </div>
                {creatorLinks.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {creatorLinks.map((link) => (
                      <CreatorSmartLinkCard
                        key={link.id}
                        link={link}
                        analyticsCardId={analyticsCardId}
                        layout={card.profileLayout}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-silver/16 bg-white/[0.03] p-4 text-sm text-muted">
                    Featured creator links appear here when offers, communities, resources or shops are added.
                  </p>
                )}
              </section>

              <aside className="space-y-5">
                <TrustArea
                  card={card}
                  ownerAccountLabel={ownerAccountLabel}
                  ownerIsBcnMember={ownerIsBcnMember}
                />

                <section className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft">
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Mail size={16} className="text-gold" />
                    Contact hub
                  </h2>
                  <div className="mt-4 space-y-2">
                    {directContactRows.filter((row) => row.key !== "website").length ? (
                      directContactRows
                        .filter((row) => row.key !== "website")
                        .map((row) => (
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
                      <p className="rounded-2xl border border-dashed border-silver/14 bg-background/16 p-4 text-sm text-muted">
                        Direct contact details can be added later.
                      </p>
                    )}
                  </div>
                </section>
              </aside>
            </div>

            {creatorSocialGrid.length ? (
              <section className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AtSign size={16} className="text-gold" />
                  Social grid
                </h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {creatorSocialGrid.map((row) => (
                    <a
                      key={row.key}
                      href={row.href}
                      {...row.anchorProps}
                      className="group flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-silver/14 bg-background/18 px-3 text-sm text-foreground transition-colors hover:border-gold/35 hover:bg-[#102958]/45"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-gold">{row.icon}</span>
                        <span className="truncate">{row.label}</span>
                      </span>
                      <span className="truncate text-xs text-muted group-hover:text-silver">
                        {row.value}
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {creatorFutureSections.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-[1.5rem] border border-silver/14 bg-white/[0.032] p-4 shadow-inner-surface"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
                        <Icon size={17} />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-foreground">{item.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {card.about ? (
              <section className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft">
                <h2 className="text-sm font-semibold text-foreground">About</h2>
                <CircleCardAboutExpander text={card.about} className="mt-3" />
              </section>
            ) : null}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pb-32 lg:pb-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(47,109,255,0.22),transparent_34%),radial-gradient(circle_at_12%_28%,rgba(212,175,95,0.1),transparent_25%),linear-gradient(180deg,#030813_0%,#071126_46%,#030712_100%)]"
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

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,820px)_minmax(300px,360px)] xl:justify-center xl:items-start">
          <main className="space-y-5">
            <article
              aria-labelledby="circle-card-profile-title"
              className="relative overflow-hidden rounded-[2rem] border border-gold/24 bg-[radial-gradient(circle_at_50%_0%,rgba(47,109,255,0.22),transparent_36%),linear-gradient(160deg,rgba(10,25,58,0.94),rgba(4,10,24,0.97)_54%,rgba(3,7,16,0.99))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_70px_rgba(47,109,255,0.12)] sm:p-7"
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,95,0.72),rgba(75,126,255,0.45),transparent)]"
              />

              <div className="relative z-10">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="grid h-40 w-40 place-items-center rounded-full border border-gold/60 bg-gold/12 p-1.5 shadow-[0_0_0_10px_rgba(212,175,95,0.05),0_0_64px_rgba(47,109,255,0.3)] sm:h-48 sm:w-48">
                      <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#071126] text-4xl font-semibold text-foreground">
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
                    <CircleCardBadgeMark
                      imageUrl={card.businessLogoUrl}
                      label={card.businessName ? `${card.businessName} logo` : "Circle Card badge"}
                      positionX={card.businessLogoPositionX}
                      positionY={card.businessLogoPositionY}
                      scale={card.businessLogoScale}
                    />
                  </div>
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

              {savedContact ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gold/24 bg-gold/10 px-4 py-3 text-sm text-gold">
                  <CheckCircle2 size={16} />
                  Saved in your Circle Wallet
                  {savedContact.favourite ? (
                    <span className="text-xs text-gold/80">Favourite</span>
                  ) : null}
                </div>
              ) : null}

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
                      href={`/login?from=${encodeURIComponent(`/card/${card.slug}`)}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                    >
                      <LogIn size={14} />
                      Sign in
                    </Link>
                    <Link
                      href="/register?source=circle-card"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                    >
                      <UserPlus size={14} />
                      Create Circle Card
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>

            <PublicRecommendations recommendations={card.recommendations} />

            <section id="qr" aria-label="Circle Card QR code" className="scroll-mt-24 xl:hidden">
              <CircleCardQrPanel
                publicUrl={publicUrl}
                slug={card.slug}
                label="Scan to save this contact"
                variant="premium"
                analytics={
                  analyticsCardId
                    ? {
                        cardId: analyticsCardId,
                        source: "public_card"
                      }
                    : undefined
                }
              />
            </section>

            <section
              aria-labelledby="circle-card-contact-title"
              className="rounded-[1.75rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(9,20,45,0.86),rgba(4,10,24,0.94))] p-5 shadow-panel-soft"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-gold">Contact Hub</p>
                  <h2 id="circle-card-contact-title" className="mt-1 font-display text-2xl text-foreground">
                    Direct routes back
                  </h2>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
                  <ChevronRight size={18} />
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                {contactRows.map((row) => (
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
                ))}

                {card.customLinks.length ? (
                  <div className="mt-3 space-y-2 border-t border-gold/14 pt-4">
                    <p className="px-1 text-xs font-medium text-gold">Featured links</p>
                    {card.customLinks.map((link) => {
                      if (link.visibility === "PRIVATE_CODE") {
                        return (
                          <CircleCardPrivateLinkAction
                            key={link.id}
                            linkId={link.id}
                            type={link.type}
                            value={customLinkDisplayLabel(link)}
                            description={offerEndDescription(link)}
                            accessCodeHint={link.accessCodeHint}
                            hasAccessCode={link.hasAccessCode}
                          />
                        );
                      }

                      const href = customLinkHref(link);

                      if (!href) {
                        return null;
                      }

                      return (
                        <ContactAction
                          key={link.id}
                          icon={customLinkIcon(link)}
                          label={customLinkActionType(link)}
                          value={customLinkDisplayLabel(link)}
                          description={offerEndDescription(link)}
                          href={href}
                          anchorProps={customLinkAnchorProps(link, href)}
                          analyticsCardId={analyticsCardId}
                          eventType="CUSTOM_LINK_CLICK"
                          metadata={{
                            source: "public_card",
                            linkId: link.id,
                            label: link.label,
                            type: link.type,
                            actionMode: link.actionMode,
                            resolvedAction: link.fileUrl || link.fileMimeType || link.fileName
                              ? resolveCircleCardFileAction(link)
                              : undefined,
                            url: analyticsUrlValue(href)
                          }}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </section>

            {(card.businessName || card.role || card.tagline || card.about) ? (
              <section
                aria-labelledby="circle-card-business-title"
                className="rounded-[1.75rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(9,20,45,0.86),rgba(4,10,24,0.94))] p-5 shadow-panel-soft"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
                    <Building2 size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gold">Business</p>
                    <h2 id="circle-card-business-title" className="mt-1 font-display text-2xl text-foreground">
                      {card.businessName || card.fullName}
                    </h2>
                    {displayRole ? (
                      <p className="mt-2 inline-flex max-w-full items-center gap-2 text-sm text-silver">
                        <BriefcaseBusiness size={15} className="shrink-0 text-gold" />
                        <span className="truncate">{displayRole}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                {card.tagline ? (
                  <p className="mt-5 text-base font-medium leading-relaxed text-foreground">
                    {card.tagline}
                  </p>
                ) : null}

                {card.about ? <CircleCardAboutExpander text={card.about} className="mt-4" /> : null}
              </section>
            ) : null}

            <div className="grid gap-5 xl:hidden">
              <TrustArea
                card={card}
                ownerAccountLabel={ownerAccountLabel}
                ownerIsBcnMember={ownerIsBcnMember}
              />
            </div>
          </main>

          <aside className="hidden space-y-5 xl:block">
            <div className="sticky top-24 space-y-5">
              <section id="qr-desktop" aria-label="Circle Card QR code">
                <CircleCardQrPanel
                  publicUrl={publicUrl}
                  slug={card.slug}
                  label="Scan to save this contact"
                  variant="premium"
                  analytics={
                    analyticsCardId
                      ? {
                          cardId: analyticsCardId,
                          source: "public_card"
                        }
                      : undefined
                  }
                />
              </section>
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
            </div>
          </aside>
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
