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
  ContactRound,
  Crown,
  Download,
  Eye,
  Link as LinkIcon,
  Lock,
  Menu as MenuIcon,
  MousePointerClick,
  QrCode,
  Search,
  Save,
  Share2,
  Star,
  StickyNote,
  Tag,
  Trash2,
  ShoppingBag,
  WalletCards
} from "lucide-react";
import {
  deleteCircleCardLinkAction,
  moveCircleCardLinkAction,
  removeCircleWalletContactAction,
  toggleCircleWalletFavouriteAction,
  toggleCircleCardLinkAction,
  updateCircleWalletContactDetailsAction,
  upsertCircleCardAction,
  upsertCircleCardLinkAction
} from "@/actions/circle-card.actions";
import {
  CircleCardBcnDiscoveryPanel,
  CircleCardCopyLinkButton,
  CircleCardDashboardSection,
  CircleCardImageUploadField,
  CircleCardInstallPrompt,
  CircleCardQrPanel,
  CircleCardShareButton,
  CircleCardSmartLinkFields
} from "@/components/circle-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  type CircleCardLinkType,
  readCircleCardSocialLinks,
  readCircleWalletTags
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
  "wallet-contact-invalid": "Check the relationship details and try again.",
  "wallet-contact-not-found": "That saved contact could not be found."
};

const WALLET_VIEW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "favourites", label: "Favourites" },
  { value: "recent", label: "Recent" }
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

function resolveWalletView(value: string | undefined): WalletView {
  return value === "favourites" || value === "recent" ? value : "all";
}

function buildWalletHref(input: {
  walletQuery?: string;
  walletView?: WalletView;
  contactId?: string | null;
}) {
  const params = new URLSearchParams();

  if (input.walletQuery) {
    params.set("walletQuery", input.walletQuery);
  }

  if (input.walletView && input.walletView !== "all") {
    params.set("walletView", input.walletView);
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
  };
  notes: string | null;
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
    input.notes,
    ...input.tags
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(input.query.toLowerCase());
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
  const selectedContactId = firstValue(params.contactId);
  const [card, cardCount, member, walletContacts] = await Promise.all([
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
        savedAt: true,
        favourite: true,
        notes: true,
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
            websiteUrl: true,
            email: true,
            phone: true,
            isPublished: true
          }
        }
      }
    })
  ]);
  const normalizedWalletContacts = walletContacts.map((contact) => ({
    ...contact,
    tags: readCircleWalletTags(contact.tags)
  }));
  const searchedWalletContacts = normalizedWalletContacts.filter((contact) =>
    walletContactMatchesQuery({
      query: walletQuery,
      card: contact.card,
      notes: contact.notes,
      tags: contact.tags
    })
  );
  const filteredWalletContacts = searchedWalletContacts.filter((contact) => {
    if (walletView === "favourites") {
      return contact.favourite;
    }

    return true;
  });
  const visibleWalletContacts =
    walletView === "recent" ? filteredWalletContacts.slice(0, 8) : filteredWalletContacts;
  const favouriteWalletContacts = normalizedWalletContacts
    .filter((contact) => contact.favourite)
    .slice(0, 4);
  const recentWalletContacts = normalizedWalletContacts.slice(0, 4);
  const selectedWalletContact =
    normalizedWalletContacts.find((contact) => contact.id === selectedContactId) ??
    visibleWalletContacts[0] ??
    normalizedWalletContacts[0] ??
    null;
  const walletReturnPath = buildWalletHref({
    walletQuery,
    walletView,
    contactId: selectedWalletContact?.id ?? null
  });
  const savedContactCount = normalizedWalletContacts.length;
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
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
        title="Wallet"
        summary="Search saved contacts, notes, tags and relationship context"
        badge={
          <span className="inline-flex gap-2">
            <Badge variant="muted">{savedContactCount} saved</Badge>
            <Badge variant="outline" className="border-silver/18 text-silver">
              {favouriteWalletContacts.length} favourite
            </Badge>
          </span>
        }
      >
        <div className="space-y-5">

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <Card className="border-silver/16 bg-card/62">
              <CardContent className="space-y-4 pt-6 sm:pt-7">
                <form action="/dashboard/circle-card" method="get" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  {walletView !== "all" ? (
                    <input type="hidden" name="walletView" value={walletView} />
                  ) : null}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} />
                    <Input
                      name="walletQuery"
                      defaultValue={walletQuery}
                      placeholder="Search names, companies, notes or tags"
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="w-full gap-2 md:w-auto">
                    <Search size={16} />
                    Search
                  </Button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {WALLET_VIEW_OPTIONS.map((option) => (
                    <Link
                      key={option.value}
                      href={buildWalletHref({ walletQuery, walletView: option.value })}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        walletView === option.value
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
                    When you save a public Circle Card, it will appear here with private notes,
                    tags and favourite status.
                  </p>
                  <Link href="/circle-card" className="mt-5 inline-flex">
                    <Button variant="outline">Explore Circle Card</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
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
                        favouriteWalletContacts.map((contact) => (
                          <Link
                            key={contact.id}
                            href={buildWalletHref({ walletQuery, walletView, contactId: contact.id })}
                            className="block rounded-2xl border border-gold/18 bg-background/22 px-4 py-3 text-sm text-foreground hover:border-gold/32"
                          >
                            {contact.card.fullName}
                            <span className="mt-1 block text-xs text-muted">
                              {contact.card.businessName || contact.card.role || "Circle Card contact"}
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
                          href={buildWalletHref({ walletQuery, walletView, contactId: contact.id })}
                          className="block rounded-2xl border border-silver/14 bg-background/20 px-4 py-3 text-sm text-foreground hover:border-silver/28"
                        >
                          {contact.card.fullName}
                          <span className="mt-1 block text-xs text-muted">
                            Saved {formatDate(contact.savedAt)}
                          </span>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  {visibleWalletContacts.length ? (
                    visibleWalletContacts.map((contact) => {
                      const detailHref = buildWalletHref({
                        walletQuery,
                        walletView,
                        contactId: contact.id
                      });
                      const selected = selectedWalletContact?.id === contact.id;

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
                                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-silver/16 bg-background/28 text-sm font-semibold text-foreground">
                                  {contact.card.profileImageUrl ? (
                                    <img
                                      src={contact.card.profileImageUrl}
                                      alt={contact.card.fullName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    contact.card.fullName.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-semibold text-foreground">
                                      {contact.card.fullName}
                                    </h3>
                                    {contact.favourite ? (
                                      <Badge variant="outline" className="border-gold/25 text-gold">
                                        Favourite
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-sm text-silver">
                                    {[contact.card.role, contact.card.businessName].filter(Boolean).join(" at ") ||
                                      "Circle Card contact"}
                                  </p>
                                  {contact.card.tagline ? (
                                    <p className="mt-2 text-sm text-muted">{contact.card.tagline}</p>
                                  ) : null}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {contact.card.location ? (
                                      <Badge variant="muted">{contact.card.location}</Badge>
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
                                <Link
                                  href={`/card/${contact.card.slug}`}
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
                                  <input type="hidden" name="cardId" value={contact.card.id} />
                                  <input type="hidden" name="returnPath" value="/dashboard/circle-card" />
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
                        No saved contacts match that search.
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
                        {selectedWalletContact.card.fullName}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {[selectedWalletContact.card.role, selectedWalletContact.card.businessName]
                          .filter(Boolean)
                          .join(" at ") || "Circle Card contact"}
                      </p>
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
                    </div>

                    <form action={updateCircleWalletContactDetailsAction} className="space-y-4">
                      <input type="hidden" name="walletContactId" value={selectedWalletContact.id} />
                      <input type="hidden" name="returnPath" value={walletReturnPath} />
                      <div className="space-y-2">
                        <Label htmlFor="wallet-notes" className="inline-flex items-center gap-2">
                          <StickyNote size={15} className="text-silver" />
                          Notes
                        </Label>
                        <Textarea
                          id="wallet-notes"
                          name="notes"
                          rows={5}
                          defaultValue={selectedWalletContact.notes ?? ""}
                          placeholder="Where you met, what mattered, and why to reconnect."
                        />
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
                      <Button type="submit" className="w-full gap-2">
                        <Save size={16} />
                        Save relationship details
                      </Button>
                    </form>

                    <div className="grid gap-3">
                      <Link href={`/card/${selectedWalletContact.card.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="outline" className="w-full gap-2">
                          Open public card
                          <ArrowUpRight size={16} />
                        </Button>
                      </Link>
                      <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                        Last interaction and introductions will appear here in a later phase.
                      </div>
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
                <CardTitle className="text-lg">Future organisation</CardTitle>
                <CardDescription>
                  Pro and Teams organisation can build on tags, favourites and private notes.
                </CardDescription>
              </CardHeader>
            </Card>
          </aside>
        </div>
        </div>
      </CircleCardDashboardSection>
    </div>
  );
}
