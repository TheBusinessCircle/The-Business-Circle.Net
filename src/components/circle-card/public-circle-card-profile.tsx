import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import {
  removeCircleWalletContactAction,
  saveCircleWalletContactAction
} from "@/actions/circle-card.actions";
import { CircleCardAboutExpander } from "@/components/circle-card/circle-card-about-expander";
import { CircleCardFramedImage } from "@/components/circle-card/circle-card-framed-image";
import { CircleCardInstallPrompt } from "@/components/circle-card/circle-card-install-prompt";
import { CircleCardPrivateLinkAction } from "@/components/circle-card/circle-card-private-link-action";
import { CircleCardQrPanel } from "@/components/circle-card/circle-card-qr-panel";
import { CircleCardShareButton } from "@/components/circle-card/circle-card-share-button";
import { CircleCardTrackedLink } from "@/components/circle-card/circle-card-tracked-link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CircleCardEventTypeValue } from "@/lib/circle-card/analytics-events";
import { getExternalLinkProps } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { PublicCircleCard } from "@/server/circle-card";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Crown,
  Download,
  Facebook,
  Gem,
  Globe2,
  Instagram,
  LinkIcon,
  Linkedin,
  Lock,
  LogIn,
  Mail,
  Menu as MenuIcon,
  MapPin,
  Music2,
  Network,
  Phone,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
  Youtube
} from "lucide-react";

type SavedCircleWalletContact = {
  id: string;
  favourite: boolean;
} | null;

type PublicCircleCardProfileProps = {
  card: PublicCircleCard;
  publicUrl: string;
  analyticsCardId?: string;
  viewerIsOwner: boolean;
  isAuthenticated: boolean;
  savedContact: SavedCircleWalletContact;
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
  "own-card": "This is your Circle Card."
};

const ERROR_MESSAGES: Record<string, string> = {
  "missing-card": "That Circle Card could not be saved.",
  "card-not-found": "That Circle Card could not be found."
};

const SOCIAL_CONTACT_PLATFORMS: readonly SocialPlatformConfig[] = [
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "tiktok", label: "TikTok", icon: Music2, handlePrefix: true },
  { key: "instagram", label: "Instagram", icon: Instagram, handlePrefix: true },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "x", label: "X", icon: AtSign, handlePrefix: true },
  { key: "youtube", label: "YouTube", icon: Youtube }
] as const;

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

type PreviewPersonProps = {
  name: string;
  detail: string;
};

function PreviewPerson({ name, detail }: PreviewPersonProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-silver/12 bg-white/[0.035] p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/18 bg-gold/10 text-xs font-semibold text-gold">
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{name}</span>
        <span className="block truncate text-xs text-muted">{detail}</span>
      </span>
    </div>
  );
}

function RelationshipPreview() {
  return (
    <aside className="rounded-[1.75rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(9,20,45,0.82),rgba(4,10,24,0.94))] p-5 shadow-panel-soft">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2f6dff]/26 bg-[#1e5bff]/12 text-[#d8e6ff]">
          <Network size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Your Network</p>
          <p className="text-xs text-muted">Relationship layer preview</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <PreviewPerson name="Sarah Mitchell" detail="Founder, strategy" />
        <PreviewPerson name="Daniel Wright" detail="Operations partner" />
        <PreviewPerson name="Priya Shah" detail="Growth advisor" />
      </div>
      <div className="mt-4 rounded-2xl border border-gold/18 bg-gold/10 p-4">
        <p className="text-2xl font-semibold text-foreground">+84</p>
        <p className="mt-1 text-xs text-muted">Connections presented inside Circle Wallet</p>
      </div>
    </aside>
  );
}

function TeamPreview() {
  const items = ["Company Wallet", "Employee Cards", "Shared Contacts", "Team Analytics"];

  return (
    <aside className="rounded-[1.75rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(9,20,45,0.82),rgba(4,10,24,0.94))] p-5 shadow-panel-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-silver/14 bg-white/[0.035] text-silver">
            <Users size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Company Wallet</p>
            <p className="text-xs text-muted">Team preview</p>
          </div>
        </div>
        <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
          Coming Soon
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between gap-3 rounded-2xl border border-silver/12 bg-white/[0.035] px-3 py-2.5 text-sm text-foreground"
          >
            <span>{item}</span>
            <Lock size={14} className="text-silver" />
          </div>
        ))}
      </div>
    </aside>
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
        <PremiumBadge icon={<BadgeCheck size={13} />} label="Founder Verification Ready" muted />
        <PremiumBadge icon={<Gem size={13} />} label="Future Verified Founder" muted />
      </div>
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

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(250px,300px)_minmax(0,1fr)_minmax(300px,360px)] xl:items-start">
          <div className="hidden space-y-5 xl:block">
            <RelationshipPreview />
          </div>

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
                  <PremiumBadge icon={<BadgeCheck size={13} />} label="Founder Verification Ready" muted />
                  <PremiumBadge icon={<Gem size={13} />} label="Future Verified Founder" muted />
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
                          anchorProps={getExternalLinkProps(href)}
                          analyticsCardId={analyticsCardId}
                          eventType="CUSTOM_LINK_CLICK"
                          metadata={{
                            source: "public_card",
                            linkId: link.id,
                            label: link.label,
                            type: link.type,
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
              <RelationshipPreview />
              <TeamPreview />
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
              <TeamPreview />
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
