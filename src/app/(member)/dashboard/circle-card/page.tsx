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
  ClipboardCheck,
  Code2,
  Compass,
  ContactRound,
  CreditCard,
  Camera,
  Handshake,
  ChevronDown,
  Crown,
  Download,
  Eye,
  EyeOff,
  Filter,
  Gauge,
  Link as LinkIcon,
  Lock,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  MousePointerClick,
  QrCode,
  Rocket,
  Search,
  Send,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  Trash2,
  ShoppingBag,
  UserCheck,
  Wrench,
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
  deleteCircleCardServiceAction,
  deleteCircleCardLinkAction,
  declineCircleCardConnectionRequestAction,
  declineCircleCardIntroductionAction,
  generateBusinessCardClaimLinkAction,
  markAllCircleCardNotificationsReadAction,
  markCircleCardNotificationReadAction,
  moveCircleCardLinkAction,
  removeCircleWalletContactAction,
  resolveCircleCardLinkAction,
  saveCircleCardOpeningHoursAction,
  saveCircleWalletContactAction,
  sendCircleCardConnectionRequestAction,
  setDefaultCircleCardAction,
  toggleCircleWalletFavouriteAction,
  toggleCircleCardLinkAction,
  toggleCircleCardServiceAction,
  updateCircleCardOpportunityAction,
  updateCircleCardOpportunityStatusAction,
  updateCircleCardRecommendationStatusAction,
  updateCircleCardReferralStatusAction,
  updateCircleWalletContactDetailsAction,
  upsertCircleCardRecommendationAction,
  upsertCircleCardAction,
  upsertCircleCardServiceAction,
  upsertCircleCardLinkAction
} from "@/actions/circle-card.actions";
import {
  BusinessCardScanner,
  CircleCardBcnDiscoveryPanel,
  CircleCardAudienceSnapshotManager,
  CircleCardBookingManager,
  CircleCardBrandPartnershipsManager,
  CircleCardCopyLinkButton,
  CircleCardCreatorOffersManager,
  CircleCardDashboardSection,
  CircleCardDocumentsManager,
  CircleCardFeaturedContentManager,
  CircleCardFirstCardFormHelper,
  CircleCardGalleryManager,
  CircleCardIdentityBanner,
  CircleCardIdentityFields,
  CircleCardImageUploadField,
  CircleCardInstallPrompt,
  CircleCardMenuOffersManager,
  CircleCardMediaKitManager,
  CircleCardPlanPanel,
  CircleCardProductsManager,
  CircleCardPriceListManager,
  CircleCardQrPanel,
  CircleCardReviewsManager,
  CircleCardSaveForm,
  CircleCardSectionRouter,
  CircleCardShareAssetsPanel,
  CircleCardShareButton,
  CircleCardSocialLinkEditor,
  CircleCardSmartProfileImportPanel,
  CircleCardSubmitButton,
  CircleCardSmartLinkCreateForm,
  CircleCardSmartLinkManager,
  CircleCardTrackedLink,
  CircleCardSmartLinkFields,
  CircleCardThemeFields,
  CircleCardVisibilityCheckbox,
  CircleCardVisibilityToggle,
  CircleCardWalletTestimonialForm,
  type CircleCardPendingWalletTestimonial
} from "@/components/circle-card";
import {
  CircleCardPlatformOwnerCardTypePreviewBadge,
  CircleCardPlatformOwnerCardTypePreviewModules,
  CircleCardPlatformOwnerCardTypePreviewSwitcher,
  CircleCardPlatformOwnerFeatureMatrixLite,
  CircleCardPlatformOwnerPreviewBadge,
  CircleCardPlatformOwnerPreviewSwitcher,
  CircleCardPlatformOwnerSandboxBadge,
  CircleCardPlatformOwnerSandboxIndicator,
  CircleCardPlatformOwnerSandboxPanel,
  CircleCardPlatformOwnerSandboxToggle,
  CircleCardPlatformOwnerSessionDebug
} from "@/components/circle-card/circle-card-platform-owner-preview-switcher";
import { CircleCardCurrentCardSelector } from "@/components/circle-card/circle-card-current-card-selector";
import { CircleCardReferralNudges } from "@/components/circle-card/circle-card-referral-nudges";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BackToTopButton } from "@/components/ui/back-to-top-button";
import {
  circleCardFileActionLabel,
  circleCardFileKindLabel,
  detectCircleCardFileKind,
  resolveCircleCardFileAction
} from "@/lib/circle-card/file-actions";
import {
  canCreateCircleCard,
  getCircleCardFeatureAccess,
  resolveCircleCardEntitlement
} from "@/lib/circle-card/permissions";
import {
  CIRCLE_CARD_CONTROL_CENTRE_DEVELOPMENT_MODULES,
  CIRCLE_CARD_CONTROL_CENTRE_ROADMAP,
  CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS,
  buildCircleCardPlatformOwnerLaunchChecklist,
  buildCircleCardPlatformOwnerPerformanceInspector,
  resolveCircleCardPlatformOwnerCardTypePreviewMode,
  resolveCircleCardPlatformOwnerPreviewEntitlement,
  resolveCircleCardPlatformOwnerPreviewMode,
  resolveCircleCardPlatformOwnerDiagnostics,
  type CircleCardPlatformOwnerLaunchChecklistStatus,
  type CircleCardPlatformOwnerPerformanceStatus,
  type CircleCardPlatformStatusTone
} from "@/lib/circle-card/platform-owner-control";
import { isAdminRole } from "@/lib/auth/permissions";
import {
  CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT,
  CIRCLE_CARD_PLAN_DEFINITIONS,
  type CircleCardPlanFeature
} from "@/lib/circle-card/plans";
import {
  CIRCLE_CARD_BILLING_FLAG_ENV,
  getCircleCardBillingReadiness
} from "@/lib/circle-card/pricing";
import {
  buildCircleCardUpgradeTriggers,
  type CircleCardUpgradeTrigger
} from "@/lib/circle-card/upgrade-triggers";
import { buildCircleCardShareSourceUrl } from "@/lib/circle-card/share-sources";
import {
  calculateBusinessProfileCompletion,
  type BusinessProfileCompletionItemId
} from "@/lib/circle-card/business-profile-completion";
import {
  calculateCreatorProfileCompletion,
  resolveCreatorStudioMode,
  type CreatorProfileCompletionItemId,
  type CreatorStudioMode
} from "@/lib/circle-card/creator-profile-foundation";
import { signOutAction } from "@/lib/actions/auth-actions";
import {
  CIRCLE_CARD_RECOMMENDATION_CATEGORIES,
  circleCardRecommendationVisibilityLabel
} from "@/lib/circle-card/recommendations";
import {
  CIRCLE_CARD_TYPE_COPY,
  CIRCLE_CARD_TYPES
} from "@/lib/circle-card/card-types";
import {
  CIRCLE_CARD_BUSINESS_BLOCK_TYPES,
  CIRCLE_CARD_DOCUMENT_PRO_LIMIT,
  CIRCLE_CARD_BRAND_PARTNERSHIP_FREE_LIMIT,
  CIRCLE_CARD_BRAND_PARTNERSHIP_PRO_LIMIT,
  CIRCLE_CARD_FEATURED_CONTENT_FREE_LIMIT,
  CIRCLE_CARD_FEATURED_CONTENT_PRO_LIMIT,
  CIRCLE_CARD_CREATOR_OFFER_FREE_LIMIT,
  CIRCLE_CARD_CREATOR_OFFER_PRO_LIMIT,
  CIRCLE_CARD_GALLERY_PRO_LIMIT,
  CIRCLE_CARD_MENU_OFFER_PRO_LIMIT,
  CIRCLE_CARD_OPENING_HOURS_PRESETS,
  CIRCLE_CARD_PRODUCT_PRO_LIMIT,
  CIRCLE_CARD_SERVICE_LIMIT,
  CIRCLE_CARD_WEEKDAYS,
  CIRCLE_CARD_CONTENT_BLOCK_DEFINITIONS,
  CIRCLE_CARD_CREATOR_BLOCK_TYPES,
  circleCardOpeningHoursDayLabel,
  circleCardBrandPartnershipStatus,
  circleCardCreatorOfferStatus,
  circleCardAudienceSnapshotStatus,
  circleCardMediaKitStatus,
  circleCardCreatorBlockHasContent,
  isValidCircleCardReviewItem,
  readCircleCardGalleryItems,
  readCircleCardAudienceSnapshot,
  readCircleCardFeaturedContentItems,
  readCircleCardCreatorBlocks,
  readCircleCardCreatorOffers,
  readCircleCardBookingEnquiry,
  readCircleCardBrandPartnerships,
  readCircleCardDocumentItems,
  readCircleCardOpeningHours,
  readCircleCardMenuOfferItems,
  readCircleCardMediaKit,
  readCircleCardProductItems,
  readCircleCardPriceListItems,
  readCircleCardReviewItems,
  readCircleCardServices,
  resolveCircleCardOpeningHoursBuilderMode,
  resolveCircleCardMenuOffersBuilderMode,
  resolveCircleCardBookingBuilderMode,
  resolveCircleCardDocumentsBuilderMode,
  resolveCircleCardProductsBuilderMode,
  resolveCircleCardPriceListBuilderMode,
  resolveCircleCardGalleryBuilderMode,
  resolveCircleCardReviewsBuilderMode,
  resolveCircleCardServicesBuilderMode,
  type CircleCardOpeningHours,
  type CircleCardMenuOffersBuilderMode,
  type CircleCardMenuOfferItem,
  type CircleCardBookingBuilderMode,
  type CircleCardBookingEnquiry,
  type CircleCardDocumentsBuilderMode,
  type CircleCardDocumentItem,
  type CircleCardOpeningHoursBuilderMode,
  type CircleCardOpeningHoursPreset,
  type CircleCardProductsBuilderMode,
  type CircleCardProductItem,
  type CircleCardPriceListBuilderMode,
  type CircleCardPriceListItem,
  type CircleCardReviewsBuilderMode,
  type CircleCardReviewItem,
  type CircleCardGalleryBuilderMode,
  type CircleCardGalleryItem,
  type CircleCardServiceItem,
  type CircleCardServicesBuilderMode
} from "@/lib/circle-card/content-blocks";
import { circleCardIntroductionStatusLabel } from "@/lib/circle-card/introductions";
import { isEligibleCircleCardWalletTestimonialTarget } from "@/lib/circle-card/wallet-testimonials";
import {
  CIRCLE_CARD_REFERRAL_OPEN_STATUSES,
  circleCardReferralStatusLabel,
  circleCardReferralVisibilityLabel
} from "@/lib/circle-card/referrals";
import {
  buildCircleCardReferralPath,
  circleCardReferralStatusLabel as circleCardGrowthReferralStatusLabel
} from "@/lib/circle-card/referral-engine";
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
  CIRCLE_CARD_ICON_192,
  CIRCLE_CARD_MANIFEST_PATH,
  createCircleCardPageMetadata
} from "@/lib/circle-card/metadata";
import {
  CIRCLE_CARD_DISCOVER_HIDDEN_LABEL,
  CIRCLE_CARD_DISCOVER_SETTING_COPY,
  CIRCLE_CARD_DISCOVER_VISIBLE_LABEL,
  CIRCLE_CARD_DISCOVER_VISIBLE_WHERE
} from "@/lib/circle-card/privacy";
import {
  type CircleCardLinkActionMode,
  type CircleCardLinkType,
  type CircleCardLinkVisibility,
  type CircleCardSocialLink,
  type CircleCardSocialPlatform,
  CIRCLE_WALLET_CATEGORY_OPTIONS,
  CIRCLE_WALLET_MET_AT_OPTIONS,
  readCircleCardSocialLinks,
  readCircleWalletBusinessCardSocialLinks,
  readCircleWalletTags,
  resolveCircleCardLookupSlug
} from "@/lib/circle-card/schema";
import {
  buildCircleCardIdentityFilterWhere,
  CIRCLE_CARD_ACCOUNT_TYPES,
  CIRCLE_CARD_ACCOUNT_TYPE_COPY,
  CIRCLE_CARD_IDENTITY_TAGS,
  getCircleCardAccountTypeLabel,
  getCircleCardIdentityTagLabel,
  normalizeCircleCardIdentityTags,
  resolveCircleCardAccountType
} from "@/lib/circle-card/identity";
import {
  DEFAULT_CIRCLE_CARD_PROFILE_LAYOUT,
  buildCircleCardProfileLayoutFilterWhere,
  CIRCLE_CARD_PROFILE_LAYOUTS,
  CIRCLE_CARD_PROFILE_LAYOUT_COPY,
  getCircleCardProfileLayoutLabel,
  resolveCircleCardProfileLayoutFilter
} from "@/lib/circle-card/profile-layout";
import { prisma } from "@/lib/prisma";
import { requireCircleCardUser } from "@/lib/session";
import { absoluteUrl, cn, formatCurrency, formatDate, slugify } from "@/lib/utils";
import {
  calculateCircleCardCompletionForCard,
  createDueOpportunityNotificationsForUser,
  getCircleCardReferralCentreForUser,
  getCircleCardAnalyticsSummary,
  markCircleCardReferralActivationForUser,
  syncCircleCardActivationLeadScore,
  trackCircleCardEvent
} from "@/server/circle-card";

export const metadata: Metadata = createCircleCardPageMetadata({
  title: "My Circle Card",
  description: "Create your card, manage Circle Wallet, track activity, and share your public identity.",
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
  "referrals",
  "share",
  "settings"
] as const;

type CircleCardAppSection = (typeof CIRCLE_CARD_APP_SECTIONS)[number];

const CIRCLE_CARD_APP_SECTION_LABELS: Record<CircleCardAppSection, string> = {
  home: "Home",
  "my-card": "My Card",
  network: "Network",
  business: "Business",
  referrals: "Referrals",
  share: "Share",
  settings: "Settings"
};
const USE_OPTIMISTIC_SMART_LINK_MANAGER = true;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function circleCardPlatformStatusToneClass(tone: CircleCardPlatformStatusTone) {
  switch (tone) {
    case "green":
      return "border-emerald-400/24 bg-emerald-400/10 text-emerald-200";
    case "red":
      return "border-red-400/24 bg-red-400/10 text-red-200";
    case "amber":
    default:
      return "border-gold/24 bg-gold/10 text-gold";
  }
}

function circleCardPlatformStatusDotClass(tone: CircleCardPlatformStatusTone) {
  switch (tone) {
    case "green":
      return "bg-emerald-300";
    case "red":
      return "bg-red-300";
    case "amber":
    default:
      return "bg-gold";
  }
}

function circleCardLaunchChecklistStatusLabel(status: CircleCardPlatformOwnerLaunchChecklistStatus) {
  switch (status) {
    case "ready":
      return "Ready";
    case "attention":
      return "Needs attention";
    case "critical":
      return "Critical issue";
    case "future":
    default:
      return "Future / not active";
  }
}

function circleCardLaunchChecklistStatusClass(status: CircleCardPlatformOwnerLaunchChecklistStatus) {
  switch (status) {
    case "ready":
      return "border-emerald-400/24 bg-emerald-400/10 text-emerald-200";
    case "attention":
      return "border-gold/24 bg-gold/10 text-gold";
    case "critical":
      return "border-red-400/24 bg-red-400/10 text-red-200";
    case "future":
    default:
      return "border-silver/18 bg-silver/10 text-silver";
  }
}

function circleCardLaunchChecklistStatusDotClass(status: CircleCardPlatformOwnerLaunchChecklistStatus) {
  switch (status) {
    case "ready":
      return "bg-emerald-300";
    case "attention":
      return "bg-gold";
    case "critical":
      return "bg-red-300";
    case "future":
    default:
      return "bg-silver";
  }
}

function circleCardPerformanceStatusLabel(status: CircleCardPlatformOwnerPerformanceStatus) {
  switch (status) {
    case "good":
      return "Good";
    case "warning":
      return "Warning";
    case "issue":
      return "Issue";
    case "not-active":
    default:
      return "Not active";
  }
}

function circleCardPerformanceStatusClass(status: CircleCardPlatformOwnerPerformanceStatus) {
  switch (status) {
    case "good":
      return "border-emerald-400/24 bg-emerald-400/10 text-emerald-200";
    case "warning":
      return "border-gold/24 bg-gold/10 text-gold";
    case "issue":
      return "border-red-400/24 bg-red-400/10 text-red-200";
    case "not-active":
    default:
      return "border-silver/18 bg-silver/10 text-silver";
  }
}

function circleCardPerformanceStatusDotClass(status: CircleCardPlatformOwnerPerformanceStatus) {
  switch (status) {
    case "good":
      return "bg-emerald-300";
    case "warning":
      return "bg-gold";
    case "issue":
      return "bg-red-300";
    case "not-active":
    default:
      return "bg-silver";
  }
}

function resolveCircleCardAppSection(value: string | undefined): CircleCardAppSection {
  if (value === "wallet") {
    return "network";
  }
  return CIRCLE_CARD_APP_SECTIONS.includes(value as CircleCardAppSection)
    ? (value as CircleCardAppSection)
    : "home";
}

function circleCardSectionHref(section: CircleCardAppSection, hash?: string) {
  const suffix = hash ? `#${hash.replace(/^#/, "")}` : "";
  return `/dashboard/circle-card?section=${section}${suffix}`;
}

function circleCardManageHref(input: {
  cardId?: string | null;
  section?: CircleCardAppSection;
  hash?: string;
  newCard?: boolean;
}) {
  const params = new URLSearchParams({
    section: input.section ?? "my-card"
  });

  if (input.cardId) {
    params.set("cardId", input.cardId);
  }

  if (input.newCard) {
    params.set("newCard", "1");
  }

  const suffix = input.hash ? `#${input.hash.replace(/^#/, "")}` : "";
  return `/dashboard/circle-card?${params.toString()}${suffix}`;
}

function circleCardHubTypeMeta(cardType: string) {
  switch (cardType) {
    case "BUSINESS":
      return {
        label: "Business",
        icon: ShoppingBag,
        description: CIRCLE_CARD_TYPE_COPY.BUSINESS.description
      };
    case "CREATOR":
      return {
        label: "Creator",
        icon: Camera,
        description: CIRCLE_CARD_TYPE_COPY.CREATOR.description
      };
    case "TEAM":
      return {
        label: "Team",
        icon: UserCheck,
        description: "Team identity, staff cards and shared-branding card foundation."
      };
    default:
      return {
        label: "Personal",
        icon: ContactRound,
        description: CIRCLE_CARD_TYPE_COPY.PERSONAL.description
      };
  }
}

function circleCardHubStatusMeta(input: { isPublished: boolean }) {
  if (input.isPublished) {
    return {
      label: "Live",
      className: "border-emerald-400/24 bg-emerald-400/10 text-emerald-200"
    };
  }

  return {
    label: "Hidden",
    className: "border-silver/18 bg-silver/8 text-silver"
  };
}

type CircleCardUsageMetric = {
  label: string;
  value: string;
  hint: string;
  icon: typeof Activity;
};

type CircleCardSetupChecklistItemId =
  | "profile-image"
  | "about"
  | "featured-link"
  | "location"
  | "share";

type CircleCardSetupChecklistItem = {
  id: CircleCardSetupChecklistItemId;
  label: string;
  complete: boolean;
  href: string;
  actionLabel: string;
};

const CIRCLE_CARD_SETUP_TOTAL_STEPS = 5;

function hasSetupText(value?: string | null) {
  return Boolean(value?.trim());
}

function circleCardSetupNextActionCopy(item: CircleCardSetupChecklistItem | null) {
  switch (item?.id) {
    case "profile-image":
      return "Add your profile image first.";
    case "about":
      return "Add a short intro so people know what you do.";
    case "featured-link":
      return "Add your first link so people have somewhere useful to go.";
    case "location":
      return "Add your location so people know where you work.";
    case "share":
    default:
      return "Your card is ready to share.";
  }
}

function buildCircleCardSetupChecklist(input: {
  cardId?: string | null;
  profileImageUrl?: string | null;
  about?: string | null;
  activeFeaturedLinkCount: number;
  location?: string | null;
  shareCount: number;
}): CircleCardSetupChecklistItem[] {
  const cardHref = (section: CircleCardAppSection, hash: string) =>
    input.cardId
      ? circleCardManageHref({ cardId: input.cardId, section, hash })
      : circleCardSectionHref(section, hash);

  return [
    {
      id: "profile-image",
      label: "Add profile image",
      complete: hasSetupText(input.profileImageUrl),
      href: cardHref("my-card", "card-images"),
      actionLabel: "Edit images"
    },
    {
      id: "about",
      label: "Add bio/about",
      complete: hasSetupText(input.about),
      href: cardHref("my-card", "card-identity"),
      actionLabel: "Edit profile"
    },
    {
      id: "featured-link",
      label: "Add first featured link",
      complete: input.activeFeaturedLinkCount > 0,
      href: cardHref("my-card", "custom-links"),
      actionLabel: "Add link"
    },
    {
      id: "location",
      label: "Add location",
      complete: hasSetupText(input.location),
      href: cardHref("my-card", "card-contact-details"),
      actionLabel: "Edit contact/location"
    },
    {
      id: "share",
      label: "Share your card",
      complete: input.shareCount > 0,
      href: cardHref("share", "share-assets"),
      actionLabel: "Share card"
    }
  ];
}

function CircleCardSetupChecklistPanel({
  cardId,
  fullName,
  publicUrl,
  setupItems,
  created = false,
  className
}: {
  cardId: string;
  fullName: string;
  publicUrl: string;
  setupItems: CircleCardSetupChecklistItem[];
  created?: boolean;
  className?: string;
}) {
  const completeCount = setupItems.filter((item) => item.complete).length;
  const progress = Math.round((completeCount / CIRCLE_CARD_SETUP_TOTAL_STEPS) * 100);
  const nextItem = setupItems.find((item) => !item.complete) ?? null;
  const nextActionHref =
    nextItem?.href ?? circleCardManageHref({ cardId, section: "share", hash: "share-assets" });
  const nextActionLabel = nextItem?.actionLabel ?? "Share card";
  const nextActionCopy = circleCardSetupNextActionCopy(nextItem);

  return (
    <CircleCardDashboardSection
      id="circle-card-completion"
      title={created ? "Your Circle Card has been created" : "Complete your Circle Card"}
      summary={
        progress === 100
          ? "Setup complete — your card is ready to share."
          : `${completeCount} of ${CIRCLE_CARD_SETUP_TOTAL_STEPS} setup steps complete for ${fullName}.`
      }
      defaultOpen={progress < 100}
      badge={
        <Badge
          variant="outline"
          className={cn(
            created ? "border-emerald-400/30 text-emerald-200" : "border-gold/28 text-gold"
          )}
        >
          {progress}%
        </Badge>
      }
      className={cn(
        created
          ? "border-emerald-400/28 bg-emerald-400/10"
          : "border-gold/24 bg-card/70",
        className
      )}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
            Completing: {fullName}
          </p>

          <div className="mt-4 rounded-xl border border-silver/14 bg-background/24 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Circle Card setup: {progress}%
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{nextActionCopy}</p>
              </div>
              <Link href={nextActionHref} className={cn(buttonVariants({ size: "sm" }), "w-full gap-2 sm:w-auto")}>
                {nextActionLabel}
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/70">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {setupItems.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 rounded-xl border border-silver/14 bg-background/18 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {item.complete ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-200" />
                  ) : (
                    <ClipboardCheck size={16} className="shrink-0 text-silver" />
                  )}
                  <span className="min-w-0 text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <Badge
                  variant={item.complete ? "outline" : "muted"}
                  className={cn(
                    "w-fit",
                    item.complete ? "border-emerald-400/28 text-emerald-200" : ""
                  )}
                >
                  {item.complete ? "Complete" : "Incomplete"}
                </Badge>
                <Link
                  href={item.href}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full gap-2 sm:w-auto")}
                >
                  {item.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-silver/14 bg-background/24 p-3 sm:p-4">
          <p className="text-sm font-semibold text-foreground">Public card link</p>
          <p className="mt-2 break-all rounded-lg border border-silver/12 bg-background/28 p-3 text-xs text-muted">
            {publicUrl}
          </p>
          <div className="mt-3 grid gap-2">
            <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" className="w-full gap-2">
                View public card
                <ArrowUpRight size={16} />
              </Button>
            </Link>
            <CircleCardCopyLinkButton publicUrl={publicUrl} className="w-full" />
            <CircleCardShareButton
              title={`${fullName} | Circle Card`}
              publicUrl={publicUrl}
              cardId={cardId}
              analyticsSource={created ? "dashboard_created" : "dashboard_completion"}
              label="Share card"
              hideStatus
            />
          </div>
        </aside>
      </div>
    </CircleCardDashboardSection>
  );
}

type BusinessCardBuilderAccess = "locked" | "available" | "platform-preview";

function CircleCardServiceFields({
  idPrefix,
  service
}: {
  idPrefix: string;
  service?: CircleCardServiceItem;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-title`}>Service title</Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          defaultValue={service?.title ?? ""}
          maxLength={80}
          placeholder="Strategy session"
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-description`}>Short description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          name="description"
          defaultValue={service?.description ?? ""}
          rows={3}
          maxLength={280}
          placeholder="A focused session to clarify priorities and next steps."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-price`}>Starting price (optional)</Label>
        <Input
          id={`${idPrefix}-price`}
          name="startingPrice"
          defaultValue={service?.startingPrice ?? ""}
          maxLength={60}
          placeholder="From £250"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-image`}>Image URL (optional)</Label>
        <Input
          id={`${idPrefix}-image`}
          name="imageUrl"
          type="url"
          defaultValue={service?.imageUrl ?? ""}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cta-label`}>Enquiry CTA label (optional)</Label>
        <Input
          id={`${idPrefix}-cta-label`}
          name="ctaLabel"
          defaultValue={service?.ctaLabel ?? ""}
          maxLength={40}
          placeholder="Enquire now"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cta-url`}>Enquiry CTA link (optional)</Label>
        <Input
          id={`${idPrefix}-cta-url`}
          name="ctaUrl"
          type="url"
          defaultValue={service?.ctaUrl ?? ""}
          placeholder="https://..."
        />
      </div>
      <label
        htmlFor={`${idPrefix}-active`}
        className="flex items-start gap-3 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground sm:col-span-2"
      >
        <input
          id={`${idPrefix}-active`}
          name="isActive"
          type="checkbox"
          defaultChecked={service?.isActive ?? true}
          className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary"
        />
        <span>
          Active on public Business Card
          <span className="mt-1 block text-xs text-muted">Hidden services remain editable here.</span>
        </span>
      </label>
    </div>
  );
}

function CircleCardServicesBuilder({
  mode,
  cardId,
  cardName,
  services
}: {
  mode: CircleCardServicesBuilderMode;
  cardId?: string;
  cardName: string;
  services: CircleCardServiceItem[];
}) {
  if (mode === "hidden") {
    return null;
  }

  if (mode === "locked") {
    return (
      <div id="business-card-services" className="scroll-mt-24 rounded-xl border border-gold/24 bg-gold/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Services are included with Pro.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Add services to your Business Card with Pro.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-gold/28 text-gold">Pro</Badge>
        </div>
      </div>
    );
  }

  if (mode === "preview" || !cardId) {
    return (
      <div id="business-card-services" className="scroll-mt-24 rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-4">
        <Badge variant="outline" className="border-cyan-400/30 text-cyan-100">Business preview</Badge>
        <p className="mt-3 text-sm font-semibold text-foreground">Services Builder preview</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Select or create a Business Card to add services. Personal Card content is never used for this block.
        </p>
      </div>
    );
  }

  const returnPath = circleCardManageHref({
    cardId,
    section: "my-card",
    hash: "business-card-services"
  });
  const activeCount = services.filter((service) => service.isActive).length;

  return (
    <section id="business-card-services" className="scroll-mt-24 rounded-2xl border border-gold/22 bg-gold/8 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-semibold text-foreground">Services</h3>
            <Badge variant="outline" className="border-gold/28 text-gold">Pro</Badge>
            <Badge variant="muted">{activeCount} active</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">Add the services people most often ask you about.</p>
          <p className="mt-1 text-xs text-silver">Show services, prices and enquiry links on your Business Card.</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-gold">Card: {cardName}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {services.map((service) => (
          <details key={service.id} className="group rounded-xl border border-silver/14 bg-background/20">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="truncate">{service.title}</span>
                  <Badge variant={service.isActive ? "outline" : "muted"} className={service.isActive ? "border-emerald-400/26 text-emerald-200" : undefined}>
                    {service.isActive ? "Active" : "Hidden"}
                  </Badge>
                  {service.startingPrice ? <Badge variant="muted">{service.startingPrice}</Badge> : null}
                </span>
                <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted">{service.description}</span>
              </span>
              <ChevronDown size={15} className="mt-1 shrink-0 text-silver transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-silver/12 p-3">
              <form action={upsertCircleCardServiceAction} className="space-y-3">
                <input type="hidden" name="cardId" value={cardId} />
                <input type="hidden" name="serviceId" value={service.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <CircleCardServiceFields idPrefix={`service-${service.id}`} service={service} />
                <Button type="submit" size="sm" className="h-9 gap-2">
                  <Save size={14} />
                  Save service
                </Button>
              </form>
              <div className="mt-3 grid gap-2 border-t border-silver/12 pt-3 sm:grid-cols-3">
                <form action={toggleCircleCardServiceAction}>
                  <input type="hidden" name="cardId" value={cardId} />
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <Button type="submit" variant="outline" size="sm" className="h-9 w-full gap-2">
                    {service.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    {service.isActive ? "Hide" : "Show"}
                  </Button>
                </form>
                <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2" disabled>
                  <ArrowDown size={14} />
                  Reorder — Coming Soon
                </Button>
                <form action={deleteCircleCardServiceAction}>
                  <input type="hidden" name="cardId" value={cardId} />
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <Button type="submit" variant="outline" size="sm" className="h-9 w-full gap-2 text-destructive">
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          </details>
        ))}
        {!services.length ? (
          <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">
            Add your first service so visitors know exactly what you offer.
          </p>
        ) : null}
      </div>

      <details className="group mt-3 rounded-xl border border-gold/20 bg-background/20" open={!services.length}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>Add service</span>
          <span className="flex items-center gap-2 text-xs font-normal text-muted">
            {services.length}/{CIRCLE_CARD_SERVICE_LIMIT}
            <ChevronDown size={15} className="text-silver transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <form action={upsertCircleCardServiceAction} className="space-y-3 border-t border-silver/12 p-3">
          <input type="hidden" name="cardId" value={cardId} />
          <input type="hidden" name="returnPath" value={returnPath} />
          <CircleCardServiceFields idPrefix={`service-new-${cardId}`} />
          <Button type="submit" size="sm" className="h-9 gap-2" disabled={services.length >= CIRCLE_CARD_SERVICE_LIMIT}>
            <ShoppingBag size={14} />
            Add service
          </Button>
        </form>
      </details>
    </section>
  );
}

function CircleCardProductsBuilder({
  mode,
  cardId,
  cardName,
  products
}: {
  mode: CircleCardProductsBuilderMode;
  cardId: string;
  cardName: string;
  products: CircleCardProductItem[];
}) {
  if (mode === "hidden") {
    return null;
  }

  if (mode === "locked") {
    return (
      <div id="business-card-products" className="scroll-mt-24 rounded-xl border border-gold/24 bg-gold/10 p-4">
        <div className="flex items-start gap-3">
          <Lock size={17} className="mt-0.5 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-semibold text-foreground">Products are included with Circle Card Pro.</p>
            <p className="mt-1 text-sm text-muted">Upgrade to add and manage products on this Business Card.</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "preview") {
    return (
      <div id="business-card-products" className="scroll-mt-24 rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-4">
        <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">Platform Preview</Badge>
        <p className="mt-3 text-sm font-semibold text-foreground">Products Builder preview</p>
        <p className="mt-1 text-sm text-muted">Select or create a Business Card to add products. Personal and Creator Cards never use this block.</p>
      </div>
    );
  }

  return <CircleCardProductsManager cardId={cardId} cardName={cardName} initialItems={products} />;
}

function CircleCardPriceListBuilder({
  mode,
  cardId,
  cardName,
  priceItems
}: {
  mode: CircleCardPriceListBuilderMode;
  cardId: string;
  cardName: string;
  priceItems: CircleCardPriceListItem[];
}) {
  if (mode === "hidden") return null;
  if (mode === "locked") {
    return (
      <div id="business-card-price-list" className="scroll-mt-24 rounded-xl border border-gold/24 bg-gold/10 p-4">
        <div className="flex items-start gap-3">
          <Lock size={17} className="mt-0.5 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-semibold text-foreground">Price List is included with Circle Card Pro.</p>
            <p className="mt-1 text-sm text-muted">Upgrade to add and manage prices on this Business Card.</p>
          </div>
        </div>
      </div>
    );
  }
  if (mode === "preview") {
    return (
      <div id="business-card-price-list" className="scroll-mt-24 rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-4">
        <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">Platform Preview</Badge>
        <p className="mt-3 text-sm font-semibold text-foreground">Price List Builder preview</p>
        <p className="mt-1 text-sm text-muted">Select or create a Business Card to add prices. Personal and Creator Cards never use this block.</p>
      </div>
    );
  }
  return <CircleCardPriceListManager cardId={cardId} cardName={cardName} initialItems={priceItems} />;
}

function CircleCardMenuOffersBuilder({
  mode,
  cardId,
  cardName,
  items
}: {
  mode: CircleCardMenuOffersBuilderMode;
  cardId: string;
  cardName: string;
  items: CircleCardMenuOfferItem[];
}) {
  if (mode === "hidden") return null;
  if (mode === "locked") {
    return (
      <div id="business-card-menu-offers" className="scroll-mt-24 rounded-xl border border-gold/24 bg-gold/10 p-4">
        <div className="flex items-start gap-3">
          <Lock size={17} className="mt-0.5 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-semibold text-foreground">Menu &amp; Offers are included with Circle Card Pro.</p>
            <p className="mt-1 text-sm text-muted">Upgrade to add and manage menu items, promotions and offers on this Business Card.</p>
          </div>
        </div>
      </div>
    );
  }
  if (mode === "preview") {
    return (
      <div id="business-card-menu-offers" className="scroll-mt-24 rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-4">
        <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">Platform Preview</Badge>
        <p className="mt-3 text-sm font-semibold text-foreground">Menu &amp; Offers Builder preview</p>
        <p className="mt-1 text-sm text-muted">Select or create a Business Card to add items. Personal and Creator Cards never use this block.</p>
      </div>
    );
  }
  return <CircleCardMenuOffersManager cardId={cardId} cardName={cardName} initialItems={items} />;
}

function CircleCardBookingBuilder({
  mode,
  cardId,
  cardName,
  booking
}: {
  mode: CircleCardBookingBuilderMode;
  cardId: string;
  cardName: string;
  booking: CircleCardBookingEnquiry | null;
}) {
  if (mode === "hidden") {
    return null;
  }

  if (mode === "locked") {
    return (
      <div id="business-card-booking" className="scroll-mt-24 rounded-xl border border-gold/24 bg-gold/10 p-4">
        <div className="flex items-start gap-3">
          <Lock size={17} className="mt-0.5 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-semibold text-foreground">Booking / Enquiry is included with Circle Card Pro.</p>
            <p className="mt-1 text-sm text-muted">Upgrade to add booking, quote and enquiry routes to this Business Card.</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "preview") {
    return (
      <div id="business-card-booking" className="scroll-mt-24 rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-4">
        <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">Platform Preview</Badge>
        <p className="mt-3 text-sm font-semibold text-foreground">Booking / Enquiry Builder preview</p>
        <p className="mt-1 text-sm text-muted">Select or create a Business Card to add conversion routes. Personal and Creator Cards never use this block.</p>
      </div>
    );
  }

  return <CircleCardBookingManager cardId={cardId} cardName={cardName} initialBooking={booking} />;
}

function CircleCardDocumentsBuilder({
  mode,
  cardId,
  cardName,
  documents
}: {
  mode: CircleCardDocumentsBuilderMode;
  cardId: string;
  cardName: string;
  documents: CircleCardDocumentItem[];
}) {
  if (mode === "hidden") {
    return null;
  }

  if (mode === "locked") {
    return (
      <div id="business-card-downloads" className="scroll-mt-24 rounded-xl border border-gold/24 bg-gold/10 p-4">
        <div className="flex items-start gap-3">
          <Lock size={17} className="mt-0.5 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-semibold text-foreground">Downloads are included with Circle Card Pro.</p>
            <p className="mt-1 text-sm text-muted">Upgrade to add useful files to this Business Card.</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "preview") {
    return (
      <div id="business-card-downloads" className="scroll-mt-24 rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-4">
        <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">Platform Preview</Badge>
        <p className="mt-3 text-sm font-semibold text-foreground">Downloads / Documents Builder preview</p>
        <p className="mt-1 text-sm text-muted">Select or create a Business Card to add documents. Personal and Creator Cards never use this block.</p>
      </div>
    );
  }

  return <CircleCardDocumentsManager cardId={cardId} cardName={cardName} initialItems={documents} />;
}

function CircleCardGalleryBuilder({
  mode,
  cardId,
  cardName,
  galleryItems
}: {
  mode: CircleCardGalleryBuilderMode;
  cardId?: string;
  cardName: string;
  galleryItems: CircleCardGalleryItem[];
}) {
  if (mode === "hidden") {
    return null;
  }

  if (mode === "locked") {
    return (
      <div id="business-card-gallery" className="scroll-mt-24 rounded-xl border border-gold/24 bg-gold/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Gallery is included with Circle Card Pro.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">Show your work with Circle Card Pro.</p>
          </div>
          <Badge variant="outline" className="w-fit border-gold/28 text-gold">Pro</Badge>
        </div>
      </div>
    );
  }

  if (mode === "preview" || !cardId) {
    return (
      <div id="business-card-gallery" className="scroll-mt-24 rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-4">
        <Badge variant="outline" className="border-cyan-400/30 text-cyan-100">Business preview</Badge>
        <p className="mt-3 text-sm font-semibold text-foreground">Gallery / Portfolio preview</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Select or create a Business Card to showcase its work. Personal and Creator Cards never use this gallery.
        </p>
      </div>
    );
  }

  return <CircleCardGalleryManager cardId={cardId} cardName={cardName} initialItems={galleryItems} />;
}

function CircleCardReviewsBuilder({
  mode,
  cardId,
  cardName,
  reviews,
  pendingWalletTestimonials,
  approvedWalletTestimonialCount
}: {
  mode: CircleCardReviewsBuilderMode;
  cardId?: string;
  cardName: string;
  reviews: CircleCardReviewItem[];
  pendingWalletTestimonials: CircleCardPendingWalletTestimonial[];
  approvedWalletTestimonialCount: number;
}) {
  if (mode === "hidden") {
    return null;
  }

  if (mode === "locked") {
    return (
      <div id="business-card-reviews" className="scroll-mt-24 rounded-xl border border-gold/24 bg-gold/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Circle Trust is included with Circle Card Pro.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Build trust with connection testimonials and client proof.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-gold/28 text-gold">Pro</Badge>
        </div>
      </div>
    );
  }

  if (mode === "preview" || !cardId) {
    return (
      <div id="business-card-reviews" className="scroll-mt-24 rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-4">
        <Badge variant="outline" className="border-cyan-400/30 text-cyan-100">Business preview</Badge>
        <p className="mt-3 text-sm font-semibold text-foreground">Circle Trust preview</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Select or create a Business Card to build reputation through real connections.
        </p>
      </div>
    );
  }

  return (
    <CircleCardReviewsManager
      cardId={cardId}
      cardName={cardName}
      initialItems={reviews}
      pendingWalletTestimonials={pendingWalletTestimonials}
      approvedWalletTestimonialCount={approvedWalletTestimonialCount}
    />
  );
}

const OPENING_HOURS_PRESET_LABELS: Record<CircleCardOpeningHoursPreset, string> = {
  "weekdays-9-5": "Monday to Friday 9–5",
  "open-7-days": "Open 7 days",
  "weekends-closed": "Weekends closed",
  "appointment-only": "Appointment only"
};

function CircleCardOpeningHoursBuilder({
  mode,
  cardId,
  cardName,
  openingHours
}: {
  mode: CircleCardOpeningHoursBuilderMode;
  cardId?: string;
  cardName: string;
  openingHours: CircleCardOpeningHours | null;
}) {
  if (mode === "hidden") {
    return null;
  }

  if (mode === "locked") {
    return (
      <div id="business-card-opening-hours" className="scroll-mt-24 rounded-xl border border-gold/24 bg-gold/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Opening hours are included with Pro.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Add opening hours to your Business Card with Pro.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-gold/28 text-gold">Pro</Badge>
        </div>
      </div>
    );
  }

  if (mode === "preview" || !cardId) {
    return (
      <div id="business-card-opening-hours" className="scroll-mt-24 rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-4">
        <Badge variant="outline" className="border-cyan-400/30 text-cyan-100">Business preview</Badge>
        <p className="mt-3 text-sm font-semibold text-foreground">Opening Hours Builder preview</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Select or create a Business Card to save its weekly opening hours.
        </p>
      </div>
    );
  }

  const returnPath = circleCardManageHref({
    cardId,
    section: "my-card",
    hash: "business-card-opening-hours"
  });
  const openDayCount = openingHours
    ? CIRCLE_CARD_WEEKDAYS.filter(({ key }) => openingHours.days[key].isOpen).length
    : 0;

  return (
    <section id="business-card-opening-hours" className="scroll-mt-24 rounded-2xl border border-gold/22 bg-gold/8 p-3 sm:p-4">
      <details data-circle-card-module-details className="group" open={!openingHours}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl font-semibold text-foreground">Opening Hours</span>
              <Badge variant="outline" className="border-gold/28 text-gold">Pro</Badge>
              {openingHours ? <Badge variant="muted">{openDayCount} open days</Badge> : null}
            </span>
            <span className="mt-1 block text-sm text-muted">Let people know when you’re open or available.</span>
            <span className="mt-2 block text-[11px] uppercase tracking-[0.08em] text-gold">Card: {cardName}</span>
          </span>
          <ChevronDown size={16} className="mt-1 shrink-0 text-silver transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-4 border-t border-silver/12 pt-4">
          {!openingHours ? (
            <p className="mb-4 rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">
              Add opening hours so visitors know when you are available.
            </p>
          ) : null}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-silver">Quick presets</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {CIRCLE_CARD_OPENING_HOURS_PRESETS.map((preset) => (
                <form key={preset} action={saveCircleCardOpeningHoursAction}>
                  <input type="hidden" name="cardId" value={cardId} />
                  <input type="hidden" name="preset" value={preset} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <Button type="submit" variant="outline" size="sm" className="h-9 w-full px-2">
                    {OPENING_HOURS_PRESET_LABELS[preset]}
                  </Button>
                </form>
              ))}
            </div>
          </div>

          <form action={saveCircleCardOpeningHoursAction} className="mt-4 space-y-3">
            <input type="hidden" name="cardId" value={cardId} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="grid gap-2">
              {CIRCLE_CARD_WEEKDAYS.map(({ key, label }) => {
                const day = openingHours?.days[key] ?? {
                  isOpen: false,
                  openingTime: null,
                  closingTime: null,
                  note: null
                };

                return (
                  <fieldset key={key} className="rounded-xl border border-silver/14 bg-background/20 p-3">
                    <legend className="sr-only">{label}</legend>
                    <div className="grid gap-3 sm:grid-cols-[130px_120px_120px_minmax(0,1fr)] sm:items-end">
                      <label htmlFor={`${key}-is-open`} className="flex min-h-10 items-center gap-2 text-sm font-semibold text-foreground">
                        <input
                          id={`${key}-is-open`}
                          name={`${key}.isOpen`}
                          type="checkbox"
                          defaultChecked={day.isOpen}
                          className="h-4 w-4 rounded border-border bg-background accent-primary"
                        />
                        {label}
                      </label>
                      <div className="space-y-1">
                        <Label htmlFor={`${key}-opening`} className="text-xs">Opens</Label>
                        <Input
                          id={`${key}-opening`}
                          name={`${key}.openingTime`}
                          type="time"
                          defaultValue={day.openingTime ?? ""}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${key}-closing`} className="text-xs">Closes</Label>
                        <Input
                          id={`${key}-closing`}
                          name={`${key}.closingTime`}
                          type="time"
                          defaultValue={day.closingTime ?? ""}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${key}-note`} className="text-xs">Note (optional)</Label>
                        <Input
                          id={`${key}-note`}
                          name={`${key}.note`}
                          defaultValue={day.note ?? ""}
                          maxLength={120}
                          placeholder="By appointment only"
                          className="h-10"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted">Current: {circleCardOpeningHoursDayLabel(day)}</p>
                  </fieldset>
                );
              })}
            </div>
            <Button type="submit" size="sm" className="h-9 gap-2">
              <Save size={14} />
              Save opening hours
            </Button>
          </form>
        </div>
      </details>
    </section>
  );
}

const BUSINESS_CARD_BUILDER_BLOCK_DESCRIPTIONS: Record<string, string> = {
  SERVICES: "Explain the main services your business provides.",
  PRODUCTS: "Prepare a simple product showcase without checkout.",
  PRICE_LIST: "Outline pricing guidance or starting points.",
  OPENING_HOURS: "Show when the business is available.",
  GALLERY_PORTFOLIO: "Present project images, proof or portfolio examples.",
  REVIEWS_TESTIMONIALS: "Bring trust signals into the business profile.",
  BOOKING_ENQUIRY_LINK: "Send visitors to an existing booking or enquiry page.",
  DOWNLOADS_DOCUMENTS: "Make brochures, menus, forms or documents easy to find.",
  MENU_OFFERS: "Highlight a menu, seasonal offer or current promotion."
};

function businessBuilderBlockIcon(type: string) {
  switch (type) {
    case "SERVICES":
      return Wrench;
    case "PRODUCTS":
      return ShoppingBag;
    case "PRICE_LIST":
      return Tag;
    case "OPENING_HOURS":
      return CalendarDays;
    case "GALLERY_PORTFOLIO":
      return Camera;
    case "REVIEWS_TESTIMONIALS":
      return Star;
    case "BOOKING_ENQUIRY_LINK":
      return LinkIcon;
    case "DOWNLOADS_DOCUMENTS":
      return Download;
    case "MENU_OFFERS":
      return BookOpen;
    default:
      return ClipboardCheck;
  }
}

function BusinessCardBuilderFoundation({
  access,
  previewLabel,
  cardId,
  publicUrl,
  fullName,
  servicesMode,
  services,
  productsMode,
  products,
  priceListMode,
  priceItems,
  menuOffersMode,
  menuOfferItems,
  bookingMode,
  booking,
  documentsMode,
  documents,
  galleryMode,
  galleryItems,
  reviewsMode,
  reviews,
  pendingWalletTestimonials,
  approvedWalletTestimonialCount,
  openingHoursMode,
  openingHours,
  businessName,
  businessDescription,
  primaryService,
  businessCategory,
  serviceArea,
  websiteUrl,
  profileImageUrl,
  businessLogoUrl,
  email,
  phone,
  className
}: {
  access: BusinessCardBuilderAccess;
  previewLabel: string;
  cardId: string;
  publicUrl: string;
  fullName: string;
  servicesMode: CircleCardServicesBuilderMode;
  services: CircleCardServiceItem[];
  productsMode: CircleCardProductsBuilderMode;
  products: CircleCardProductItem[];
  priceListMode: CircleCardPriceListBuilderMode;
  priceItems: CircleCardPriceListItem[];
  menuOffersMode: CircleCardMenuOffersBuilderMode;
  menuOfferItems: CircleCardMenuOfferItem[];
  bookingMode: CircleCardBookingBuilderMode;
  booking: CircleCardBookingEnquiry | null;
  documentsMode: CircleCardDocumentsBuilderMode;
  documents: CircleCardDocumentItem[];
  galleryMode: CircleCardGalleryBuilderMode;
  galleryItems: CircleCardGalleryItem[];
  reviewsMode: CircleCardReviewsBuilderMode;
  reviews: CircleCardReviewItem[];
  pendingWalletTestimonials: CircleCardPendingWalletTestimonial[];
  approvedWalletTestimonialCount: number;
  openingHoursMode: CircleCardOpeningHoursBuilderMode;
  openingHours: CircleCardOpeningHours | null;
  businessName?: string | null;
  businessDescription?: string | null;
  primaryService?: string | null;
  businessCategory?: string | null;
  serviceArea?: string | null;
  websiteUrl?: string | null;
  profileImageUrl?: string | null;
  businessLogoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  className?: string;
}) {
  const locked = access === "locked";
  const blockDefinitions = CIRCLE_CARD_CONTENT_BLOCK_DEFINITIONS.filter(
    (definition) => definition.family === "BUSINESS" && !definition.publicEditingEnabled
  );
  const detailItems = [
    {
      label: "Business description",
      value: businessDescription,
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-identity" }),
      action: "Edit profile"
    },
    {
      label: "Primary service",
      value: primaryService,
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-identity" }),
      action: "Edit role/service"
    },
    {
      label: "Business category",
      value: businessCategory || businessName,
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-identity" }),
      action: "Edit identity"
    },
    {
      label: "Service area",
      value: serviceArea,
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-contact-details" }),
      action: "Edit location"
    },
    {
      label: "Website",
      value: websiteUrl,
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-contact-details" }),
      action: "Edit website"
    },
    {
      label: "Enquiry CTA label",
      value: null,
      href: null,
      action: "Coming next"
    },
    {
      label: "Enquiry CTA link",
      value: websiteUrl,
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-contact-details" }),
      action: websiteUrl ? "Uses website" : "Coming next"
    }
  ];
  const activeServiceCount = services.filter((service) => service.isActive).length;
  const activeProductCount = products.filter((product) => product.isActive).length;
  const activePriceCount = priceItems.filter((item) => item.isActive).length;
  const activeMenuOfferCount = menuOfferItems.filter((item) => item.isActive).length;
  const activeDocumentCount = documents.filter((document) => document.isActive).length;
  const activeGalleryCount = galleryItems.filter((item) => item.isActive).length;
  const activeReviewCount = reviews.filter(
    (item) => item.isActive && isValidCircleCardReviewItem(item)
  ).length;
  const trustSignalCount = activeReviewCount + approvedWalletTestimonialCount;
  const moduleHrefs = {
    services: circleCardManageHref({ cardId, section: "my-card", hash: "business-card-services" }),
    products: circleCardManageHref({ cardId, section: "my-card", hash: "business-card-products" }),
    priceList: circleCardManageHref({ cardId, section: "my-card", hash: "business-card-price-list" }),
    menuOffers: circleCardManageHref({ cardId, section: "my-card", hash: "business-card-menu-offers" }),
    booking: circleCardManageHref({ cardId, section: "my-card", hash: "business-card-booking" }),
    documents: circleCardManageHref({ cardId, section: "my-card", hash: "business-card-downloads" }),
    gallery: circleCardManageHref({ cardId, section: "my-card", hash: "business-card-gallery" }),
    reviews: circleCardManageHref({ cardId, section: "my-card", hash: "business-card-reviews" }),
    openingHours: circleCardManageHref({ cardId, section: "my-card", hash: "business-card-opening-hours" })
  };
  const completion = calculateBusinessProfileCompletion({
    businessName,
    about: businessDescription,
    profileImageUrl,
    businessLogoUrl,
    location: serviceArea,
    websiteUrl,
    email,
    phone,
    activeServiceCount,
    hasOpeningHours: Boolean(openingHours),
    activeGalleryCount,
    activeProductCount,
    activePriceCount,
    activeDocumentCount,
    bookingActive: Boolean(booking?.isActive && booking.showOnPublicCard),
    activeMenuOfferCount,
    trustSignalCount
  });
  const completionById = new Map(completion.items.map((item) => [item.id, item.complete]));
  const completionChecklist = [
    {
      label: "Business identity",
      complete: ["business-name", "about", "brand-image"].every((id) => completionById.get(id as BusinessProfileCompletionItemId))
    },
    {
      label: "Contact details",
      complete: ["location", "contact-route"].every((id) => completionById.get(id as BusinessProfileCompletionItemId))
    },
    { label: "Services", complete: Boolean(completionById.get("services")) },
    { label: "Gallery", complete: Boolean(completionById.get("gallery")) },
    { label: "Products", complete: Boolean(completionById.get("products")) },
    { label: "Booking", complete: Boolean(completionById.get("booking")) },
    { label: "Circle Trust", complete: Boolean(completionById.get("circle-trust")) }
  ];
  const completionActionHrefs: Record<BusinessProfileCompletionItemId, { label: string; href: string }> = {
    "business-name": {
      label: "Add your business name",
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-identity" })
    },
    about: {
      label: "Add your business description",
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-identity" })
    },
    "brand-image": {
      label: "Add a logo or profile image",
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-images" })
    },
    location: {
      label: "Add your business location",
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-contact-details" })
    },
    "contact-route": {
      label: "Add a website or contact route",
      href: circleCardManageHref({ cardId, section: "my-card", hash: "card-contact-details" })
    },
    services: { label: "Add your first service", href: moduleHrefs.services },
    "opening-hours": { label: "Add opening hours", href: moduleHrefs.openingHours },
    gallery: { label: "Upload portfolio images", href: moduleHrefs.gallery },
    products: { label: "Add a product", href: moduleHrefs.products },
    "price-list": { label: "Add your first price", href: moduleHrefs.priceList },
    documents: { label: "Add a document", href: moduleHrefs.documents },
    booking: { label: "Add a booking link", href: moduleHrefs.booking },
    "menu-offers": { label: "Add a menu or offer", href: moduleHrefs.menuOffers },
    "circle-trust": {
      label: "Build my Circle Trust",
      href: moduleHrefs.reviews
    }
  };
  const nextBestAction = completion.nextIncompleteId
    ? completionActionHrefs[completion.nextIncompleteId]
    : { label: "View your completed Business Card", href: publicUrl };
  const activeModules = [
    {
      type: "SERVICES",
      label: "Services",
      description: "Show what you offer.",
      status: services.length ? `${activeServiceCount} active` : "0 services",
      complete: activeServiceCount > 0,
      action: services.length ? "Manage Services" : "Add your first service",
      href: moduleHrefs.services
    },
    {
      type: "PRODUCTS",
      label: "Products",
      description: "Let people browse what you sell.",
      status: products.length ? `${activeProductCount} active` : "0 products",
      complete: activeProductCount > 0,
      action: products.length ? "Manage Products" : "Add first product",
      href: moduleHrefs.products
    },
    {
      type: "PRICE_LIST",
      label: "Price List",
      description: "Give visitors clear starting points.",
      status: priceItems.length ? `${activePriceCount} active` : "0 prices",
      complete: activePriceCount > 0,
      action: priceItems.length ? "Manage Price List" : "Add first price",
      href: moduleHrefs.priceList
    },
    {
      type: "MENU_OFFERS",
      label: "Menu & Offers",
      description: "Highlight timely promotions.",
      status: menuOfferItems.length ? `${activeMenuOfferCount} Active` : "0 Items",
      complete: activeMenuOfferCount > 0,
      action: menuOfferItems.length ? "Manage Menu & Offers" : "Add first item",
      href: moduleHrefs.menuOffers
    },
    {
      type: "BOOKING_ENQUIRY_LINK",
      label: "Booking / Enquiry",
      description: "Turn visitors into enquiries.",
      status: booking?.isActive && booking.showOnPublicCard ? "Active" : booking ? "Hidden" : "Not set",
      complete: Boolean(booking?.isActive && booking.showOnPublicCard),
      action: booking ? "Manage Booking" : "Add booking link",
      href: moduleHrefs.booking
    },
    {
      type: "DOWNLOADS_DOCUMENTS",
      label: "Downloads / Documents",
      description: "Share useful files and resources.",
      status: documents.length ? `${activeDocumentCount} active` : "0 documents",
      complete: activeDocumentCount > 0,
      action: documents.length ? "Manage Documents" : "Add first document",
      href: moduleHrefs.documents
    },
    {
      type: "GALLERY_PORTFOLIO",
      label: "Gallery / Portfolio",
      description: "Show proof of your work.",
      status: `${activeGalleryCount} image${activeGalleryCount === 1 ? "" : "s"}`,
      complete: activeGalleryCount > 0,
      action: galleryItems.length ? "Manage Gallery" : "Add your first gallery image",
      href: moduleHrefs.gallery
    },
    {
      type: "OPENING_HOURS",
      label: "Opening Hours",
      description: "Help visitors know when you are available.",
      status: openingHours ? "Set up" : "Not set",
      complete: Boolean(openingHours),
      action: openingHours ? "Edit Opening Hours" : "Set your opening hours",
      href: moduleHrefs.openingHours
    },
    {
      type: "REVIEWS_TESTIMONIALS",
      label: "Circle Trust",
      description: "Build reputation through real connections.",
      status: `${trustSignalCount} trust signal${trustSignalCount === 1 ? "" : "s"}`,
      complete: trustSignalCount > 0,
      action: trustSignalCount ? "Build Trust" : "Build my Circle Trust",
      href: moduleHrefs.reviews
    }
  ] as const;

  return (
    <CircleCardDashboardSection
      id="business-card-builder"
      title="Business Card Builder"
      summary={
        locked
          ? "Business Card Builder is a Pro feature."
          : "Structure services, products, enquiry and trust sections for a stronger business profile."
      }
      appSection="my-card"
      className={cn(
        "border-gold/20 bg-[linear-gradient(145deg,hsl(var(--card)/0.72),hsl(var(--background)/0.36))]",
        className
      )}
      badge={
        <Badge
          variant={access === "platform-preview" ? "premium" : "outline"}
          className={cn(access !== "platform-preview" && "border-gold/28 text-gold")}
        >
          {previewLabel}
        </Badge>
      }
    >
      {locked ? (
        <div className="space-y-3">
        <div className="rounded-2xl border border-gold/24 bg-gold/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Business Card Builder is a Pro feature.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Free keeps your personal identity card, 5 featured links and basic analytics. Pro prepares a
                second business card with services, products, stronger customisation and deeper insight.
              </p>
            </div>
            <Link href="/circle-card/pro" className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2 sm:w-auto")}>
              Explore Pro
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <CircleCardServicesBuilder
          mode={servicesMode}
          cardId={cardId}
          cardName={businessName || "Selected Business Card"}
          services={services}
        />
        <CircleCardProductsBuilder
          mode={productsMode}
          cardId={cardId}
          cardName={businessName || "Selected Business Card"}
          products={products}
        />
        <CircleCardPriceListBuilder
          mode={priceListMode}
          cardId={cardId}
          cardName={businessName || "Selected Business Card"}
          priceItems={priceItems}
        />
        <CircleCardMenuOffersBuilder
          mode={menuOffersMode}
          cardId={cardId}
          cardName={businessName || "Selected Business Card"}
          items={menuOfferItems}
        />
        <CircleCardBookingBuilder
          mode={bookingMode}
          cardId={cardId}
          cardName={businessName || "Selected Business Card"}
          booking={booking}
        />
        <CircleCardDocumentsBuilder
          mode={documentsMode}
          cardId={cardId}
          cardName={businessName || "Selected Business Card"}
          documents={documents}
        />
        <CircleCardGalleryBuilder
          mode={galleryMode}
          cardId={cardId}
          cardName={businessName || "Selected Business Card"}
          galleryItems={galleryItems}
        />
        <CircleCardReviewsBuilder
          mode={reviewsMode}
          cardId={cardId}
          cardName={businessName || "Selected Business Card"}
          reviews={reviews}
          pendingWalletTestimonials={pendingWalletTestimonials}
          approvedWalletTestimonialCount={approvedWalletTestimonialCount}
        />
        <CircleCardOpeningHoursBuilder
          mode={openingHoursMode}
          cardId={cardId}
          cardName={businessName || "Selected Business Card"}
          openingHours={openingHours}
        />
        </div>
      ) : (
        <div className="space-y-4 pb-16 sm:pb-0">
          <div className="rounded-2xl border border-gold/20 bg-gold/8 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
              Builder for: {businessName || "Selected Business Card"}
            </p>
            <p className="text-sm font-semibold text-foreground">
              Your business apps, all in one workspace.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Launch an active module below to manage what appears on this selected Business Card.
            </p>
          </div>

          <section aria-labelledby="business-profile-completion-title" className="grid gap-3 rounded-2xl border border-gold/20 bg-card/48 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.38fr)]">
            <div className="min-w-0">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">Business Pro</p>
                  <h3 id="business-profile-completion-title" className="mt-1 text-sm font-semibold text-foreground sm:text-base">Business Profile Completion</h3>
                </div>
                <p className="font-display text-3xl font-semibold text-gold">{completion.score}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/60" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold transition-[width]" style={{ width: `${completion.score}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
                {completionChecklist.map((item) => (
                  <div key={item.label} className="flex min-w-0 items-center gap-1.5 text-xs">
                    {item.complete ? (
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-300" aria-hidden="true" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-silver/40" aria-hidden="true" />
                    )}
                    <span className={cn("truncate", item.complete ? "text-foreground" : "text-muted")}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-gold/18 bg-gold/8 p-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">Next best action</p>
                <p className="mt-2 text-sm font-semibold leading-snug text-foreground">{nextBestAction.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {completion.score === 100
                    ? "Your Business Card is ready to share."
                    : `${completion.completedCount} of ${completion.totalCount} profile signals complete.`}
                </p>
              </div>
              <Link href={nextBestAction.href} className={cn(buttonVariants({ size: "sm" }), "mt-3 h-10 w-full gap-2")}>
                {nextBestAction.label}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <div aria-label="Business Card shortcuts" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Link href={publicUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 min-w-0 gap-2 px-2")}>
              <Eye size={14} aria-hidden="true" />
              <span className="truncate">View public Business Card</span>
            </Link>
            <CircleCardCopyLinkButton publicUrl={publicUrl} label="Copy public link" size="sm" className="h-10 min-w-0 px-2" analytics={{ cardId, source: "business_builder" }} />
            <CircleCardShareButton title={`${fullName} | Circle Card`} publicUrl={publicUrl} cardId={cardId} analyticsSource="business_builder" label="Share Business Card" size="sm" className="min-w-0" buttonClassName="h-10 min-w-0 px-2" hideStatus />
            <Link href={moduleHrefs.reviews} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 min-w-0 gap-2 px-2")}>
              <ShieldCheck size={14} aria-hidden="true" />
              <span className="truncate">Build my Circle Trust</span>
            </Link>
          </div>

          <nav aria-label="Business Card setup" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-9">
            <Link
              href={moduleHrefs.services}
              className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-silver/14 bg-background/24 px-2.5 py-2 transition-colors hover:border-gold/30 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-3"
            >
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-xs">Services</span>
              <span className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">{Math.min(activeServiceCount, 3)} / 3</span>
            </Link>
            <Link
              href={moduleHrefs.products}
              className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-silver/14 bg-background/24 px-2.5 py-2 transition-colors hover:border-gold/30 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-3"
            >
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-xs">Products</span>
              <span className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">{products.length} / {CIRCLE_CARD_PRODUCT_PRO_LIMIT}</span>
            </Link>
            <Link
              href={moduleHrefs.booking}
              className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-silver/14 bg-background/24 px-2.5 py-2 transition-colors hover:border-gold/30 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-3"
            >
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-xs">Booking</span>
              <span className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">{booking?.isActive && booking.showOnPublicCard ? "Active" : booking ? "Hidden" : "Not set"}</span>
            </Link>
            <Link
              href={moduleHrefs.priceList}
              className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-silver/14 bg-background/24 px-2.5 py-2 transition-colors hover:border-gold/30 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-3"
            >
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-xs">Prices</span>
              <span className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">{activePriceCount} active</span>
            </Link>
            <Link
              href={moduleHrefs.menuOffers}
              className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-silver/14 bg-background/24 px-2.5 py-2 transition-colors hover:border-gold/30 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-3"
            >
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-xs">Menu &amp; Offers</span>
              <span className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">{menuOfferItems.length} / {CIRCLE_CARD_MENU_OFFER_PRO_LIMIT}</span>
            </Link>
            <Link
              href={moduleHrefs.documents}
              className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-silver/14 bg-background/24 px-2.5 py-2 transition-colors hover:border-gold/30 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-3"
            >
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-xs">Downloads</span>
              <span className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">{documents.length} / {CIRCLE_CARD_DOCUMENT_PRO_LIMIT}</span>
            </Link>
            <Link
              href={moduleHrefs.openingHours}
              className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-silver/14 bg-background/24 px-2.5 py-2 transition-colors hover:border-gold/30 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-3"
            >
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-xs">Hours</span>
              <span className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">{openingHours ? "Set" : "Not set"}</span>
            </Link>
            <Link
              href={moduleHrefs.gallery}
              className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-silver/14 bg-background/24 px-2.5 py-2 transition-colors hover:border-gold/30 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-3"
            >
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-xs">Gallery</span>
              <span className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">{galleryItems.length} / {CIRCLE_CARD_GALLERY_PRO_LIMIT}</span>
            </Link>
            <Link
              href={moduleHrefs.reviews}
              className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-silver/14 bg-background/24 px-2.5 py-2 transition-colors hover:border-gold/30 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-3"
            >
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:text-xs">Circle Trust</span>
              <span className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">{trustSignalCount} signal{trustSignalCount === 1 ? "" : "s"}</span>
            </Link>
          </nav>

          <section aria-labelledby="business-builder-modules-title" className="rounded-2xl border border-silver/14 bg-background/18 p-3 sm:p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">Business apps</p>
              <h3 id="business-builder-modules-title" className="mt-1 font-display text-lg font-semibold text-foreground sm:text-xl">
                Open a module
              </h3>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {activeModules.map((module) => {
                const Icon = businessBuilderBlockIcon(module.type);

                return (
                  <Link
                    key={module.type}
                    href={module.href}
                    className="group flex min-h-36 min-w-0 flex-col rounded-xl border border-gold/20 bg-card/52 p-3 transition-colors hover:border-gold/40 hover:bg-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="flex max-w-[70%] flex-wrap justify-end gap-1.5">
                        <Badge variant={module.complete ? "outline" : "muted"} className={module.complete ? "border-emerald-400/24 text-emerald-200" : undefined}>
                          {module.complete ? "Complete" : "Set up"}
                        </Badge>
                        <Badge variant="muted" className="max-w-full">{module.status}</Badge>
                      </span>
                    </span>
                    <span className="mt-3 text-sm font-semibold text-foreground">{module.label}</span>
                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{module.description}</span>
                    <span className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold text-gold">
                      {module.action}
                      <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
              {blockDefinitions.map((definition) => {
                const Icon = businessBuilderBlockIcon(definition.type);

                return (
                  <div key={definition.type} className="min-w-0 rounded-xl border border-silver/12 bg-card/36 p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-silver/14 bg-background/30 text-silver">
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-snug text-foreground sm:text-sm">{definition.label}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                          {BUSINESS_CARD_BUILDER_BLOCK_DESCRIPTIONS[definition.type] ?? "Prepared for a future business profile block."}
                        </p>
                      </div>
                    </div>
                    <Badge variant="muted" className="mt-2.5">Coming Soon</Badge>
                  </div>
                );
              })}
            </div>
          </section>

          <CircleCardServicesBuilder
            mode={servicesMode}
            cardId={cardId}
            cardName={businessName || "Selected Business Card"}
            services={services}
          />

          <CircleCardProductsBuilder
            mode={productsMode}
            cardId={cardId}
            cardName={businessName || "Selected Business Card"}
            products={products}
          />

          <CircleCardPriceListBuilder
            mode={priceListMode}
            cardId={cardId}
            cardName={businessName || "Selected Business Card"}
            priceItems={priceItems}
          />

          <CircleCardMenuOffersBuilder
            mode={menuOffersMode}
            cardId={cardId}
            cardName={businessName || "Selected Business Card"}
            items={menuOfferItems}
          />

          <CircleCardBookingBuilder
            mode={bookingMode}
            cardId={cardId}
            cardName={businessName || "Selected Business Card"}
            booking={booking}
          />

          <CircleCardDocumentsBuilder
            mode={documentsMode}
            cardId={cardId}
            cardName={businessName || "Selected Business Card"}
            documents={documents}
          />

          <CircleCardGalleryBuilder
            mode={galleryMode}
            cardId={cardId}
            cardName={businessName || "Selected Business Card"}
            galleryItems={galleryItems}
          />

          <CircleCardReviewsBuilder
            mode={reviewsMode}
            cardId={cardId}
            cardName={businessName || "Selected Business Card"}
            reviews={reviews}
            pendingWalletTestimonials={pendingWalletTestimonials}
            approvedWalletTestimonialCount={approvedWalletTestimonialCount}
          />

          <CircleCardOpeningHoursBuilder
            mode={openingHoursMode}
            cardId={cardId}
            cardName={businessName || "Selected Business Card"}
            openingHours={openingHours}
          />

          <details className="group rounded-xl border border-silver/14 bg-background/18">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="text-sm font-semibold text-foreground">Business details</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  Existing card fields that can safely power a business profile.
                </span>
              </span>
              <ChevronDown size={16} className="mt-1 text-silver transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {detailItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-silver/12 bg-card/42 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted">{item.label}</p>
                  <p className="mt-1 min-h-5 break-words text-sm font-semibold text-foreground">
                    {item.value?.trim() || "Coming next"}
                  </p>
                  {item.href ? (
                    <Link href={item.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 h-8 gap-2")}>
                      {item.action}
                    </Link>
                  ) : (
                    <Badge variant="muted" className="mt-3">
                      {item.action}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </details>

        </div>
      )}
    </CircleCardDashboardSection>
  );
}

function CreatorProStudio({
  mode,
  entitlementLabel,
  cardId,
  fullName,
  profileImageUrl,
  about,
  identityTagCount,
  websiteUrl,
  activeSocialProfileCount,
  activeFeaturedLinkCount,
  activeLinkTypes,
  creatorTrustSignalCount,
  creatorBlocks,
  featuredContentItems,
  mediaKit,
  audienceSnapshot,
  brandPartnerships,
  creatorOffers,
  publicUrl,
  className
}: {
  mode: CreatorStudioMode;
  entitlementLabel: string;
  cardId: string;
  fullName: string;
  profileImageUrl?: string | null;
  about?: string | null;
  identityTagCount: number;
  websiteUrl?: string | null;
  activeSocialProfileCount: number;
  activeFeaturedLinkCount: number;
  activeLinkTypes: string[];
  creatorTrustSignalCount: number;
  creatorBlocks: ReturnType<typeof readCircleCardCreatorBlocks>;
  featuredContentItems: ReturnType<typeof readCircleCardFeaturedContentItems>;
  mediaKit: ReturnType<typeof readCircleCardMediaKit>;
  audienceSnapshot: ReturnType<typeof readCircleCardAudienceSnapshot>;
  brandPartnerships: ReturnType<typeof readCircleCardBrandPartnerships>;
  creatorOffers: ReturnType<typeof readCircleCardCreatorOffers>;
  publicUrl: string;
  className?: string;
}) {
  if (mode === "hidden") return null;

  const locked = mode === "locked";
  const isPreview = mode === "preview";
  const cardHref = (hash: string) => circleCardManageHref({ cardId, section: "my-card", hash });
  const featuredLinksHref = cardHref("custom-links");
  const featuredContentHref = cardHref("creator-featured-content");
  const mediaKitHref = cardHref("creator-media-kit");
  const audienceHref = cardHref("creator-audience");
  const brandPartnershipsHref = cardHref("creator-brand-partnerships");
  const creatorOffersHref = cardHref("creator-offers");
  const socialProfilesHref = cardHref("card-social-profiles");
  const identityHref = cardHref("card-identity");
  const imagesHref = cardHref("card-images");
  const shareHref = circleCardManageHref({ cardId, section: "share", hash: "share-assets" });
  const linkTypeSet = new Set(activeLinkTypes);
  const featuredContentCount = featuredContentItems.filter((item) => item.isActive).length;
  const mediaKitStatus = circleCardMediaKitStatus(mediaKit);
  const audienceStatus = circleCardAudienceSnapshotStatus(audienceSnapshot);
  const brandPartnershipStatus = circleCardBrandPartnershipStatus(brandPartnerships);
  const creatorOfferStatus = circleCardCreatorOfferStatus(creatorOffers);
  const creatorOfferCount = creatorOffers.filter((item) => item.active).length;
  const proofCount = activeLinkTypes.filter((type) =>
    ["PORTFOLIO", "CASE_STUDY", "REVIEW"].includes(type)
  ).length;
  const hasCommunityRoute = Boolean(websiteUrl?.trim()) || linkTypeSet.has("COMMUNITY");
  const completion = calculateCreatorProfileCompletion({
    creatorCardSelected: mode !== "preview",
    hasProfileImage: Boolean(profileImageUrl?.trim()),
    hasBio: Boolean(about?.trim()),
    activeSocialProfileCount,
    activeFeaturedLinkCount,
    identityTagCount,
    hasWebsiteOrCommunityLink: hasCommunityRoute,
    creatorTrustSignalCount
  });
  const completionById = new Map(completion.items.map((item) => [item.id, item.complete]));
  const completionActions: Record<CreatorProfileCompletionItemId, { label: string; href: string }> = {
    "creator-card": { label: "Select your Creator Card", href: identityHref },
    "profile-image": { label: "Add your creator image", href: imagesHref },
    "creator-bio": { label: "Add your creator bio", href: identityHref },
    "social-profile": { label: "Add your best social platform", href: socialProfilesHref },
    "featured-link": { label: "Add your first featured link", href: featuredLinksHref },
    "creator-niche": { label: "Add your creator niche", href: identityHref },
    "community-route": { label: "Add your community link", href: featuredLinksHref },
    "creator-trust": { label: "Start building your Circle Trust", href: shareHref }
  };
  const nextAction = completion.nextIncompleteId
    ? completionActions[completion.nextIncompleteId]
    : { label: "View your Creator profile", href: publicUrl };
  const preparedCreatorBlockCount = Object.values(creatorBlocks).filter((block) =>
    circleCardCreatorBlockHasContent(block)
  ).length;
  const modules = [
    {
      name: "Featured Content",
      benefit: "Showcase your best videos, posts and content.",
      status: featuredContentCount > 0 ? "Active" : "Not Started",
      action: featuredContentCount > 0 ? "Manage" : "Set up",
      href: featuredContentHref,
      icon: Star
    },
    {
      name: "Live Media Kit",
      benefit: "Give brands a clear, up-to-date overview.",
      status: mediaKitStatus,
      action: mediaKitStatus === "Not Started" ? "Set up" : "Manage Live Media Kit",
      href: mediaKitHref,
      icon: Download
    },
    {
      name: "Brand Partnerships",
      benefit: "Make it easy for brands to work with you.",
      status: brandPartnershipStatus,
      action: brandPartnershipStatus === "Not Started" ? "Set up" : "Manage Brand Partnerships",
      href: brandPartnershipsHref,
      icon: Handshake
    },
    {
      name: "Audience Snapshot",
      benefit: "Show your audience at a glance.",
      status: audienceStatus,
      action: audienceStatus === "Not Started" ? "Set up" : "Manage Audience Snapshot",
      href: audienceHref,
      icon: BarChart3
    },
    {
      name: "Creator Offers",
      benefit: "Promote affiliates, merch, communities or paid content.",
      status: creatorOfferStatus,
      action: creatorOfferCount > 0 ? "Manage Creator Offers" : "Set up",
      href: creatorOffersHref,
      icon: ShoppingBag
    },
    {
      name: "Press / Proof",
      benefit: "Show credibility, mentions and achievements.",
      status: proofCount > 0 ? "Active" : "Not Started",
      action: proofCount > 0 ? "Manage" : "Set up",
      href: featuredLinksHref,
      icon: Sparkles
    },
    {
      name: "Circle Trust",
      benefit: "Build reputation through real audience and brand signals.",
      status: creatorTrustSignalCount > 0 ? "Active" : "Not Started",
      action: creatorTrustSignalCount > 0 ? "View Trust" : "Build my Circle Trust",
      href: creatorTrustSignalCount > 0 ? publicUrl : shareHref,
      icon: ShieldCheck
    }
  ] as const;

  return (
    <CircleCardDashboardSection
      id="creator-pro-studio"
      title="Creator Pro Studio"
      summary="Showcase your content, grow collaborations, and build your Circle Trust."
      appSection="my-card"
      className={cn(
        "border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_34%),linear-gradient(145deg,hsl(var(--card)/0.76),hsl(var(--background)/0.4))]",
        className
      )}
      badge={
        <Badge variant={isPreview ? "premium" : "outline"} className={cn(!isPreview && "border-cyan-300/28 text-cyan-100")}>
          {isPreview ? "Platform Preview" : entitlementLabel}
        </Badge>
      }
    >
      <div className="space-y-4 pb-16 sm:pb-0">
        <section aria-labelledby="creator-completion-title" className="grid gap-3 rounded-2xl border border-cyan-300/18 bg-background/22 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.38fr)]">
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-cyan-200">Creator profile</p>
                <h3 id="creator-completion-title" className="mt-1 text-sm font-semibold text-foreground sm:text-base">Creator Profile Strength</h3>
              </div>
              <p className="font-display text-3xl font-semibold text-cyan-100">{completion.score}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/60">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400/70 via-gold/70 to-gold" style={{ width: `${completion.score}%` }} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Complete your creator profile to improve brand opportunities and build your Circle Trust.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Profile", "profile-image"],
                ["Bio", "creator-bio"],
                ["Audience", "social-profile"],
                ["Featured link", "featured-link"],
                ["Niche", "creator-niche"],
                ["Community", "community-route"],
                ["Creator Trust", "creator-trust"]
              ].map(([label, id]) => {
                const complete = Boolean(completionById.get(id as CreatorProfileCompletionItemId));
                return (
                  <span key={id} className={cn("flex min-w-0 items-center gap-1.5 text-xs", complete ? "text-foreground" : "text-muted")}>
                    {complete ? <CheckCircle2 size={14} className="shrink-0 text-cyan-200" /> : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-silver/40" />}
                    <span className="truncate">{label}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-cyan-300/16 bg-cyan-400/[0.06] p-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-cyan-200">Next best action</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{nextAction.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{completion.completedCount} of {completion.totalCount} creator signals complete.</p>
            </div>
            <Link href={nextAction.href} className={cn(buttonVariants({ size: "sm" }), "mt-3 h-10 w-full gap-2")}>
              {nextAction.label}<ArrowUpRight size={14} />
            </Link>
          </div>
        </section>

        {locked ? (
          <div className="rounded-2xl border border-gold/22 bg-gold/8 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Creator Pro helps you showcase content, attract collaborations and build Circle Trust.</p>
                <p className="mt-1 text-sm text-muted">Your Creator Card stays live on Free. Upgrade when you are ready to open the full studio.</p>
              </div>
              <Link href="/circle-card/pro" className={cn(buttonVariants({ variant: "outline" }), "h-10 w-full gap-2 sm:w-auto")}>Explore Creator Pro<ArrowUpRight size={15} /></Link>
            </div>
          </div>
        ) : null}

        <section aria-labelledby="creator-studio-modules-title" className="rounded-2xl border border-cyan-300/14 bg-background/18 p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-cyan-200">Studio tracks</p>
              <h3 id="creator-studio-modules-title" className="mt-1 font-display text-xl text-foreground">Build your creator presence</h3>
            </div>
            {preparedCreatorBlockCount ? <Badge variant="muted">{preparedCreatorBlockCount} creator block{preparedCreatorBlockCount === 1 ? "" : "s"} prepared</Badge> : null}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module, index) => {
              const Icon = module.icon;
              const availableOnFree = module.name === "Featured Content" || module.name === "Brand Partnerships" || module.name === "Creator Offers";
              const content = (
                <>
                  <span className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.07] text-cyan-100"><Icon size={17} /></span>
                    <Badge variant={module.status === "Active" ? "outline" : "muted"} className={module.status === "Active" ? "border-cyan-300/28 text-cyan-100" : undefined}>{module.status}</Badge>
                  </span>
                  <span className="mt-4 text-[10px] font-medium uppercase tracking-[0.1em] text-silver">Studio {String(index + 1).padStart(2, "0")}</span>
                  <span className="mt-1 text-base font-semibold text-foreground">{module.name}</span>
                  <span className="mt-1 text-sm leading-relaxed text-muted">{module.benefit}</span>
                  <span className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-semibold text-cyan-100">{locked && !availableOnFree ? "Unlock with Pro" : module.action}{module.href && (!locked || availableOnFree) ? <ArrowUpRight size={13} /> : null}</span>
                </>
              );

              return module.href && (!locked || availableOnFree) ? (
                <Link key={module.name} href={module.href} id={module.name === "Circle Trust" ? "creator-studio-circle-trust" : undefined} className="group flex min-h-52 min-w-0 flex-col rounded-2xl border border-silver/14 bg-card/48 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-400/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">{content}</Link>
              ) : (
                <div key={module.name} id={module.name === "Circle Trust" ? "creator-studio-circle-trust" : undefined} className="flex min-h-52 min-w-0 flex-col rounded-2xl border border-silver/12 bg-card/32 p-4">{content}</div>
              );
            })}
          </div>
        </section>

        {!isPreview ? (
          <CircleCardFeaturedContentManager
            cardId={cardId}
            cardName={fullName}
            initialItems={featuredContentItems}
            itemLimit={locked ? CIRCLE_CARD_FEATURED_CONTENT_FREE_LIMIT : CIRCLE_CARD_FEATURED_CONTENT_PRO_LIMIT}
            hasProAccess={!locked}
          />
        ) : null}

        {!isPreview ? (
          <CircleCardCreatorOffersManager
            cardId={cardId}
            cardName={fullName}
            initialItems={creatorOffers}
            itemLimit={locked ? CIRCLE_CARD_CREATOR_OFFER_FREE_LIMIT : CIRCLE_CARD_CREATOR_OFFER_PRO_LIMIT}
            hasProAccess={!locked}
          />
        ) : null}

        {!isPreview ? (
          <CircleCardMediaKitManager
            cardId={cardId}
            cardName={fullName}
            initialMediaKit={mediaKit}
            locked={locked}
          />
        ) : null}

        {!isPreview ? (
          <CircleCardAudienceSnapshotManager
            cardId={cardId}
            cardName={fullName}
            initialSnapshot={audienceSnapshot}
            locked={locked}
          />
        ) : null}

        {!isPreview ? (
          <CircleCardBrandPartnershipsManager
            cardId={cardId}
            cardName={fullName}
            initialItems={brandPartnerships}
            itemLimit={locked ? CIRCLE_CARD_BRAND_PARTNERSHIP_FREE_LIMIT : CIRCLE_CARD_BRAND_PARTNERSHIP_PRO_LIMIT}
            hasProAccess={!locked}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link href={publicUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 min-w-0 gap-2 px-2")}><Eye size={14} /><span className="truncate">View Creator profile</span></Link>
          <CircleCardCopyLinkButton publicUrl={publicUrl} label="Copy creator link" size="sm" className="h-10 min-w-0 px-2" analytics={{ cardId, source: "creator_studio" }} />
          <CircleCardShareButton title={`${fullName} | Circle Card`} publicUrl={publicUrl} cardId={cardId} analyticsSource="creator_studio" label="Share Creator Card" size="sm" className="min-w-0" buttonClassName="h-10 min-w-0 px-2" hideStatus />
          <Link href={shareHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 min-w-0 gap-2 px-2")}><ShieldCheck size={14} /><span className="truncate">Build my Circle Trust</span></Link>
        </div>
      </div>
    </CircleCardDashboardSection>
  );
}

function UpgradeTriggerColumn({
  title,
  triggers,
  href,
  ctaLabel,
  empty
}: {
  title: string;
  triggers: CircleCardUpgradeTrigger[];
  href: string;
  ctaLabel: string;
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-2")}>
          {ctaLabel}
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {triggers.length ? (
          triggers.slice(0, 3).map((trigger) => (
            <div key={trigger.id} className="rounded-lg border border-silver/12 bg-card/50 p-3">
              <p className="text-sm font-medium text-foreground">{trigger.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{trigger.message}</p>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-silver/12 bg-card/40 p-3 text-xs leading-relaxed text-muted">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}

function CircleCardUpgradeSignalsPanel({
  metrics,
  proTriggers,
  teamsTriggers
}: {
  metrics: CircleCardUsageMetric[];
  proTriggers: CircleCardUpgradeTrigger[];
  teamsTriggers: CircleCardUpgradeTrigger[];
}) {
  const allTriggers = [...proTriggers, ...teamsTriggers].sort((a, b) => b.priority - a.priority);
  const primaryTrigger = allTriggers[0];

  return (
    <section className="rounded-2xl border border-silver/14 bg-card/66 p-3 shadow-panel-soft sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Usage awareness</p>
          <h2 className="mt-1 font-display text-xl text-foreground">Your Circle Card signals</h2>
        </div>
        <Badge variant="outline" className="w-fit border-gold/28 text-gold">
          Early access
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="min-h-24 rounded-xl border border-border/70 bg-background/25 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">{metric.label}</p>
                <Icon size={15} className="shrink-0 text-gold" />
              </div>
              <p className="mt-2 text-xl font-semibold text-foreground">{metric.value}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted">{metric.hint}</p>
            </div>
          );
        })}
      </div>

      <details className="group mt-3 rounded-xl border border-border/70 bg-background/20">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Upgrade triggers</p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
              {primaryTrigger
                ? `${primaryTrigger.title}. ${primaryTrigger.message}`
                : "Keep building usage signals. Pro and Teams prompts appear as your card gets busier."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="normal-case tracking-normal">
              {allTriggers.length} signal{allTriggers.length === 1 ? "" : "s"}
            </Badge>
            <ChevronDown size={16} className="text-silver transition-transform group-open:rotate-180" />
          </div>
        </summary>
        <div className="grid gap-2 border-t border-border/70 p-3 lg:grid-cols-2">
          <UpgradeTriggerColumn
            title="Pro signals"
            triggers={proTriggers}
            href="/circle-card/pro"
            ctaLabel="Explore Pro"
            empty="Pro prompts appear when your card starts driving visibility, traffic and lead signals."
          />
          <UpgradeTriggerColumn
            title="Teams signals"
            triggers={teamsTriggers}
            href="/circle-card/teams"
            ctaLabel="Explore Teams"
            empty="Teams prompts appear when company, staff or shared relationship signals grow."
          />
        </div>
      </details>
    </section>
  );
}

function circleCardCustomLinkEditHref(linkId: string) {
  const params = new URLSearchParams({
    section: "my-card",
    editLink: linkId
  });

  return `/dashboard/circle-card?${params.toString()}#custom-link-${linkId}`;
}

const NOTICE_MESSAGES: Record<string, string> = {
  "card-created": "Circle Card created.",
  "onboarding-complete": "Your Circle Card is live.",
  "card-updated": "Circle Card updated.",
  "card-default-updated": "Default Circle Card updated.",
  "card-order-updated": "Public card order updated.",
  "card-order-unchanged": "That card is already in that position.",
  "card-set-live": "Circle Card is now live.",
  "card-hidden": "Circle Card hidden from public view.",
  "card-already-live": "That Circle Card is already live.",
  "card-already-hidden": "That Circle Card is already hidden.",
  "card-archived": "Circle Card archived.",
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
  "service-created": "Service added to this Business Card.",
  "service-updated": "Service updated.",
  "service-shown": "Service is now visible on the public Business Card.",
  "service-hidden": "Service hidden from the public Business Card.",
  "service-deleted": "Service deleted from this Business Card.",
  "gallery-item-created": "Gallery item added to this Business Card.",
  "gallery-item-updated": "Gallery item updated.",
  "gallery-item-shown": "Gallery item is now visible on the public Business Card.",
  "gallery-item-hidden": "Gallery item hidden from the public Business Card.",
  "gallery-item-deleted": "Gallery item deleted from this Business Card.",
  "opening-hours-saved": "Opening hours saved to this Business Card.",
  "opening-hours-preset-applied": "Opening hours preset applied to this Business Card.",
  "identity-updated": "Circle Card identity updated.",
  "smart-import-applied": "Smart Profile Import suggestions applied.",
  "own-card": "This is already your Circle Card."
};

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-card": "Check the card fields and try again.",
  "card-not-found": "That Circle Card could not be found.",
  "card-hidden-default": "Set the Circle Card live before making it your public default.",
  "card-limit": "You have reached the Circle Card limit for your current access.",
  "slug-taken": "That public card link is already taken.",
  "card-save-failed": "The Circle Card could not be saved.",
  "custom-link-invalid": "Check the custom link fields and try again.",
  "custom-link-not-found": "That custom link could not be found.",
  "custom-link-save-failed": "The custom link could not be saved.",
  "custom-link-access-code-required": "Generate a 4-digit access code before saving a private link.",
  "custom-link-active-limit": `Free Circle Cards can keep up to ${CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT} active custom links in this phase.`,
  "custom-link-total-limit": "This Circle Card already has the maximum number of saved custom links.",
  "service-invalid": "Check the service fields and try again.",
  "service-not-found": "That service could not be found on this Business Card.",
  "service-limit": `This Business Card can keep up to ${CIRCLE_CARD_SERVICE_LIMIT} services.`,
  "services-locked": "Add services to your Business Card with Pro.",
  "services-business-card-required": "Services can only be added to a Business Card.",
  "gallery-item-invalid": "Upload an image and check the gallery item fields.",
  "gallery-item-not-found": "That gallery item could not be found on this Business Card.",
  "gallery-limit": `Circle Card Pro can keep up to ${CIRCLE_CARD_GALLERY_PRO_LIMIT} gallery images.`,
  "gallery-locked": "Gallery is included with Circle Card Pro.",
  "gallery-business-card-required": "Gallery can only be added to a Business Card.",
  "opening-hours-invalid": "Check the opening hours and try again.",
  "opening-hours-locked": "Add opening hours to your Business Card with Pro.",
  "opening-hours-business-card-required": "Opening hours can only be added to a Business Card.",
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
  "identity-invalid": "Choose an account type and try again.",
  "smart-import-invalid": "Check the Smart Profile Import suggestions and try again.",
  "smart-import-empty": "Choose at least one Smart Profile Import suggestion before saving.",
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

const FUTURE_ANALYTICS_FEATURES: CircleCardPlanFeature[] =
  CIRCLE_CARD_PLAN_DEFINITIONS.FREE.lockedFeatures.filter((feature) =>
    ["advanced-analytics", "lead-capture", "team-analytics"].includes(feature.id)
  );

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

  if (input.walletQuery) {
    params.set("q", input.walletQuery);
  }

  if (input.walletView && input.walletView !== "all") {
    const view =
      input.walletView === "favourites"
        ? "favourites"
        : input.walletView === "recommended"
          ? "recommended"
          : input.walletView === "recent"
            ? "recent"
            : input.walletView === "connected"
              ? "connected"
              : "all";

    if (view !== "all") {
      params.set("view", view);
    }
  }

  if (input.walletCategory) {
    params.set("category", input.walletCategory);
  }

  if (input.walletFollowUp) {
    params.set("view", "follow-ups");
  }

  if (input.contactId) {
    params.set("contactId", input.contactId);
  }

  const query = params.toString();
  return query ? `/dashboard/circle-card/wallet?${query}` : "/dashboard/circle-card/wallet";
}

function buildDiscoverHref(input: {
  discoverQuery?: string;
  discoverCategory?: string;
  discoverAccountType?: string | null;
  discoverIdentityTag?: string;
  discoverProfileLayout?: string | null;
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

  if (input.discoverAccountType) {
    params.set("discoverAccountType", input.discoverAccountType);
  }

  if (input.discoverIdentityTag) {
    params.set("discoverIdentityTag", input.discoverIdentityTag);
  }

  if (input.discoverProfileLayout) {
    params.set("discoverProfileLayout", input.discoverProfileLayout);
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

function mergeInitialCircleCardSocialLinks(
  savedLinks: CircleCardSocialLink[],
  fallbackLinks: Array<{ platform: CircleCardSocialPlatform; url?: string | null }>
) {
  const links = [...savedLinks].sort((a, b) => a.sortOrder - b.sortOrder);
  const platformsWithSavedLinks = new Set(links.map((link) => link.platform));

  for (const fallback of fallbackLinks) {
    const url = fallback.url?.trim();

    if (!url || platformsWithSavedLinks.has(fallback.platform)) {
      continue;
    }

    links.push({
      id: `fallback-${fallback.platform}`,
      platform: fallback.platform,
      label: null,
      url,
      isActive: true,
      sortOrder: links.length
    });
    platformsWithSavedLinks.add(fallback.platform);
  }

  return links.map((link, index) => ({
    ...link,
    sortOrder: index
  }));
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
  const selectedCardId = firstValue(params.cardId) ?? "";
  const createCardRequested = firstValue(params.newCard) === "1";
  const notice = firstValue(params.notice);
  const created = firstValue(params.created) === "1";
  const error = firstValue(params.error);
  const focusedCustomLinkId = firstValue(params.editLink) ?? "";
  const walletQuery = (firstValue(params.walletQuery) ?? "").trim();
  const walletView = resolveWalletView(firstValue(params.walletView));
  const walletCategory = (firstValue(params.walletCategory) ?? "").trim();
  const walletFollowUp = resolveWalletFollowUpFilter(firstValue(params.walletFollowUp));
  const selectedContactId = firstValue(params.contactId);
  const testimonialForCardId = firstValue(params.testimonialFor) ?? "";
  const connectCardSlug = resolveCircleCardLookupSlug(firstValue(params.connectCard));
  const discoverQuery = (firstValue(params.discoverQuery) ?? "").trim();
  const discoverCategory = (firstValue(params.discoverCategory) ?? "").trim();
  const discoverAccountType = resolveCircleCardAccountType(firstValue(params.discoverAccountType));
  const discoverIdentityTag =
    normalizeCircleCardIdentityTags([firstValue(params.discoverIdentityTag) ?? ""])[0] ?? "";
  const discoverProfileLayout = resolveCircleCardProfileLayoutFilter(
    firstValue(params.discoverProfileLayout)
  );
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
    cards,
    archivedCardCount,
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
    activityItems,
    referralCentre
  ] = await Promise.all([
    prisma.circleCard.findMany({
      where: {
        userId: session.user.id,
        archivedAt: null
      },
      orderBy: [
        { displayOrder: "asc" },
        { isDefaultCard: "desc" },
        { isPrimary: "desc" },
        { updatedAt: "desc" }
      ],
      include: {
        customLinks: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        },
        walletTestimonialsReceived: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            status: true,
            reviewerName: true,
            reviewerRoleOrCompany: true,
            testimonialText: true,
            rating: true,
            relationship: true,
            createdAt: true
          }
        },
        recommendationsReceived: {
          where: { visibility: "PUBLIC", status: "ACTIVE" },
          select: { id: true }
        }
      }
    }),
    prisma.circleCard.count({
      where: {
        userId: session.user.id,
        archivedAt: {
          not: null
        }
      }
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
            cardType: true,
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
            isPublished: true,
            archivedAt: true,
            user: { select: { suspended: true } }
          }
        },
        walletTestimonials: {
          where: {
            reviewerUserId: session.user.id,
            status: "PENDING"
          },
          select: { id: true }
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
        ...CIRCLE_CARD_DISCOVER_VISIBLE_WHERE,
        userId: {
          not: session.user.id
        },
        ...buildCircleCardIdentityFilterWhere({
          accountType: discoverAccountType,
          identityTag: discoverIdentityTag
        }),
        ...buildCircleCardProfileLayoutFilterWhere({
          profileLayout: discoverProfileLayout
        }),
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
        accountType: true,
        identityTags: true,
        profileLayout: true,
        role: true,
        tagline: true,
        location: true,
        profileImageUrl: true,
        businessLogoUrl: true,
        themePrimaryColor: true,
        themeAccentColor: true,
        themeButtonColor: true,
        themeSurfaceStyle: true,
        themePreset: true,
        themeMetadata: true,
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
    }),
    getCircleCardReferralCentreForUser(session.user.id)
  ]);
  const platformOwnerDiagnostics = resolveCircleCardPlatformOwnerDiagnostics({
    role: session.user.role,
    email: session.user.email,
    hasAdminAccess: isAdminRole(session.user.role)
  });
  const isPlatformOwner = platformOwnerDiagnostics.platformOwnerResolved;
  const selectedOwnerPreviewMode = isPlatformOwner
    ? resolveCircleCardPlatformOwnerPreviewMode(firstValue(params.ownerPreview))
    : "platform-owner";
  const selectedOwnerCardTypePreviewMode = isPlatformOwner
    ? resolveCircleCardPlatformOwnerCardTypePreviewMode(firstValue(params.ownerCardType))
    : "personal";
  const actualCircleCardEntitlement = resolveCircleCardEntitlement({
    role: session.user.role,
    membershipTier: session.user.membershipTier,
    hasActiveSubscription: session.user.hasActiveSubscription,
    suspended: session.user.suspended
  });
  const circleCardEntitlement = isPlatformOwner
    ? resolveCircleCardPlatformOwnerPreviewEntitlement(
        selectedOwnerPreviewMode,
        actualCircleCardEntitlement
      )
    : actualCircleCardEntitlement;
  const featureAccess = getCircleCardFeatureAccess(circleCardEntitlement.accessLevel);
  const cardCount = cards.length;
  const liveCardCount = cards.filter((ownedCard) => ownedCard.isPublished).length;
  const canCreateAdditionalCard = canCreateCircleCard({
    accessLevel: circleCardEntitlement.accessLevel,
    existingCardCount: cardCount
  });
  const shouldShowNewCardForm = createCardRequested && canCreateAdditionalCard;
  const selectedExistingCard =
    selectedCardId && !shouldShowNewCardForm
      ? cards.find((candidate) => candidate.id === selectedCardId) ?? null
      : null;
  const defaultCard = cards.find((candidate) => candidate.isDefaultCard || candidate.isPrimary) ?? null;
  const card = shouldShowNewCardForm ? null : selectedExistingCard ?? defaultCard ?? cards[0] ?? null;
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
  const walletTestimonialContacts = normalizedWalletContacts
    .filter(
      (contact) => isEligibleCircleCardWalletTestimonialTarget(contact.card, session.user.id)
    )
    .map((contact) => ({
      walletContactId: contact.id,
      targetCardId: contact.card!.id,
      fullName: contact.card!.fullName,
      businessName: contact.card!.businessName,
      cardType: contact.card!.cardType,
      profileImageUrl: contact.card!.profileImageUrl,
      businessLogoUrl: contact.card!.businessLogoUrl,
      hasPendingTestimonial: contact.walletTestimonials.length > 0
    }));
  const requestedWalletTestimonialContact = walletTestimonialContacts.find(
    (contact) => contact.targetCardId === testimonialForCardId
  );
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
    discoverAccountType,
    discoverIdentityTag,
    discoverProfileLayout,
    discoverLocation,
    discoverRecommended,
    discoverBcn
  });
  const discoverHasFilters = Boolean(
    discoverQuery ||
      discoverCategory ||
      discoverAccountType ||
      discoverIdentityTag ||
      discoverProfileLayout ||
      discoverLocation ||
      discoverRecommended ||
      discoverBcn
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
      const accountTypeLabel = getCircleCardAccountTypeLabel(candidate.accountType);
      const identityTagLabels = candidate.identityTags.map(getCircleCardIdentityTagLabel).slice(0, 2);
      const profileLayoutLabel = getCircleCardProfileLayoutLabel(candidate.profileLayout);
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
        candidate.themeSurfaceStyle,
        candidate.themePreset,
        accountTypeLabel,
        profileLayoutLabel,
        ...candidate.identityTags.map(getCircleCardIdentityTagLabel),
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
        accountTypeLabel,
        identityTagLabels,
        profileLayoutLabel,
        recommendedByKnown,
        knownRecommenderNames,
        isBcnMember,
        savedContact,
        connectionState,
        matchesSearch: !discoverQueryLower || searchable.includes(discoverQueryLower),
        matchesLocation:
          !discoverLocationLower || Boolean(candidate.location?.toLowerCase().includes(discoverLocationLower)),
        matchesCategory: !discoverCategory || recommendationCategories.includes(discoverCategory),
        matchesAccountType: !discoverAccountType || candidate.accountType === discoverAccountType,
        matchesIdentityTag: !discoverIdentityTag || candidate.identityTags.includes(discoverIdentityTag),
        matchesProfileLayout:
          !discoverProfileLayout || candidate.profileLayout === discoverProfileLayout,
        matchesRecommended: !discoverRecommended || recommendations.length > 0
      };
    })
    .filter(
      (candidate) =>
        candidate.matchesSearch &&
        candidate.matchesLocation &&
        candidate.matchesCategory &&
        candidate.matchesAccountType &&
        candidate.matchesIdentityTag &&
        candidate.matchesProfileLayout &&
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
  const accountLabel = circleCardEntitlement.label;
  const isCircleCardFree = circleCardEntitlement.source === "FREE";
  const canPreviewFutureCircleCardFoundation =
    circleCardEntitlement.isAdminOverride || circleCardEntitlement.isEarlyAccess;
  const activeCardLimitLabel = `${cardCount}/${featureAccess.cardLimit} active`;
  const selectedCardReturnPath = card
    ? circleCardManageHref({ cardId: card.id, section: "my-card", hash: "circle-card-form" })
    : circleCardManageHref({ section: "my-card", hash: "circle-card-form", newCard: true });
  const createCardHref = circleCardManageHref({
    section: "my-card",
    hash: "circle-card-form",
    newCard: true
  });
  const isCreatingAdditionalCard = shouldShowNewCardForm && cardCount > 0;
  const isFirstCardCreateFlow = !card && !isCreatingAdditionalCard;
  const defaultNewCardType = cards.some((ownedCard) => ownedCard.cardType === "PERSONAL")
    ? "BUSINESS"
    : "PERSONAL";
  const defaultFirstCardName = member?.name ?? session.user.name ?? "";
  const defaultFirstCardBusinessName = member?.profile?.business?.companyName ?? "";
  const defaultFirstCardSlug = slugify(defaultFirstCardBusinessName || defaultFirstCardName);
  const customLinks = card?.customLinks ?? [];
  const activeCustomLinkCount = customLinks.filter((link) => link.isActive).length;
  const customLinkLimitLabel = isCircleCardFree
    ? `${activeCustomLinkCount}/${CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT} active links`
    : `${activeCustomLinkCount} active links`;
  const freeActiveCustomLinkLimitReached =
    isCircleCardFree && activeCustomLinkCount >= CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT;
  const socialLinks = readCircleCardSocialLinks(card?.socialLinks ?? null);
  const socialLinkItems = mergeInitialCircleCardSocialLinks(socialLinks.links, [
    { platform: "linkedin", url: member?.profile?.linkedin },
    { platform: "instagram", url: member?.profile?.instagram },
    { platform: "tiktok", url: member?.profile?.tiktok },
    { platform: "facebook", url: member?.profile?.facebook },
    { platform: "youtube", url: member?.profile?.youtube }
  ]);
  const activeSocialLinkCount = socialLinkItems.filter((link) => link.isActive && link.url.trim()).length;
  const activeSocialLinkMap = socialLinkItems.reduce<Record<string, string | undefined>>(
    (map, link) => {
      if (link.isActive && link.url.trim() && !map[link.platform]) {
        map[link.platform] = link.url;
      }

      return map;
    },
    {}
  );
  const publicUrl = card ? absoluteUrl(`/card/${card.slug}`) : null;
  const currentCardTypeMeta = card ? circleCardHubTypeMeta(card.cardType) : null;
  const currentCardDisplayName = card?.businessName || card?.fullName || "this Circle Card";
  const currentCardContextLabel = card
    ? `${currentCardDisplayName} - ${currentCardTypeMeta?.label ?? "Circle"} Card`
    : "No Circle Card selected";
  const currentCardSelectorOptions = cards.map((ownedCard) => {
    const typeMeta = circleCardHubTypeMeta(ownedCard.cardType);
    const statusMeta = circleCardHubStatusMeta({ isPublished: ownedCard.isPublished });

    return {
      id: ownedCard.id,
      label: ownedCard.businessName || ownedCard.fullName,
      detail: [ownedCard.fullName, ownedCard.role].filter(Boolean).join(" / "),
      typeLabel: typeMeta.label,
      statusLabel: statusMeta.label,
      isDefault: ownedCard.isDefaultCard
    };
  });
  const referralPath = referralCentre?.identity.code
    ? buildCircleCardReferralPath(referralCentre.identity.code)
    : "";
  const referralUrl = referralPath ? absoluteUrl(referralPath) : null;
  const referralShareUrl = referralUrl ? `${referralUrl}?source=referral_share` : null;
  const referralQrUrl = referralUrl ? `${referralUrl}?source=referral_qr` : null;
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
  const cardViewCount = analytics?.counts.CARD_VIEW ?? card?.viewCount ?? 0;
  const shareCount =
    (analytics?.counts.SHARE ?? 0) +
    (analytics?.counts.CONNECT_HUB_SHARE ?? 0) +
    (analytics?.counts.CONNECT_HUB_COPY_LINK ?? 0);
  const circleCardCompletion = calculateCircleCardCompletionForCard(
    card
      ? {
          ...card,
          user: {
            image: member?.image,
            profile: member?.profile
          }
        }
      : null,
    shareCount
  );
  const setupChecklistItems = buildCircleCardSetupChecklist({
    cardId: card?.id,
    profileImageUrl: card?.profileImageUrl,
    about: card?.about,
    activeFeaturedLinkCount: activeCustomLinkCount,
    location: card?.location,
    shareCount
  });
  const circleCardUpgradeTriggers = buildCircleCardUpgradeTriggers({
    activeFeaturedLinks: activeCustomLinkCount,
    featuredLinkLimit: CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT,
    walletContacts: savedContactCount,
    cardViews: cardViewCount,
    shares: shareCount,
    profileCompletion: circleCardCompletion.score,
    socialProfiles: activeSocialLinkCount,
    referrals: referrals.length,
    introductions: introductions.length,
    opportunities: opportunities.length,
    accountType: card?.accountType,
    businessName: card?.businessName,
    role: card?.role,
    tagline: card?.tagline,
    about: card?.about,
    identityTags: card?.identityTags ?? []
  });
  const circleCardUsageMetrics: CircleCardUsageMetric[] = [
    {
      label: "Featured links used",
      value: `${activeCustomLinkCount}/${CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT}`,
      hint: "Active profile links",
      icon: LinkIcon
    },
    {
      label: "Wallet contacts",
      value: savedContactCount.toLocaleString("en-GB"),
      hint: "Saved contacts",
      icon: WalletCards
    },
    {
      label: "Card views",
      value: cardViewCount.toLocaleString("en-GB"),
      hint: "Public views",
      icon: Eye
    },
    {
      label: "Shares",
      value: shareCount.toLocaleString("en-GB"),
      hint: "Shares and copied links",
      icon: Share2
    },
    {
      label: "Profile completion",
      value: `${circleCardCompletion.score}%`,
      hint: "Trust-building setup",
      icon: CheckCircle2
    }
  ];

  if (card) {
    await syncCircleCardActivationLeadScore({
      userId: session.user.id,
      completion: circleCardCompletion
    });
    if (circleCardCompletion.activationComplete) {
      await markCircleCardReferralActivationForUser({
        userId: session.user.id,
        circleCardId: card.id,
        completionScore: circleCardCompletion.score
      });
    }
  }

  const analyticsOverview = [
    {
      label: "Total Views",
      value: cardViewCount,
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
      value: shareCount,
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
    {
      section: "referrals",
      icon: Send,
      badge: referralCentre?.stats.signups
    },
    { section: "share", icon: QrCode },
    { section: "settings", icon: MenuIcon }
  ];
  const homeQuickStats = [
    {
      label: "Notifications",
      value: unreadNotificationCount,
      href: circleCardSectionHref("network", "notifications"),
      icon: Sparkles
    },
    {
      label: "Pending requests",
      value: pendingIncomingRequests.length,
      href: circleCardSectionHref("network", "connect-hub"),
      icon: MessageSquare
    },
    {
      label: "Follow-ups due",
      value: followUpsDueCount,
      href: followUpsDueCount === dueOpportunityFollowUps.length
        ? circleCardSectionHref("business", "opportunities")
        : buildWalletHref({ walletFollowUp: "needs-follow-up" }),
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
      href: "/dashboard/circle-card/wallet",
      icon: WalletCards
    },
    {
      label: "Referral signups",
      value: referralCentre?.stats.signups ?? 0,
      href: circleCardSectionHref("referrals", "referral-centre"),
      icon: Send
    }
  ];
  const circleCardBillingReadiness = getCircleCardBillingReadiness();
  const showPlatformOwnerDiagnostics = platformOwnerDiagnostics.hasAdminAccess;
  const platformOwnerDiagnosticItems = [
    {
      label: "Current User Email",
      value: platformOwnerDiagnostics.currentUserEmail || "Not available"
    },
    {
      label: "Current User Role",
      value: platformOwnerDiagnostics.currentUserRole
    },
    {
      label: "Owner Email Allowlist Present",
      value: platformOwnerDiagnostics.ownerEmailAllowlistPresent ? "Yes" : "No"
    },
    {
      label: "Platform Owner Resolved",
      value: platformOwnerDiagnostics.platformOwnerResolved ? "True" : "False"
    }
  ];
  const platformStatusItems: Array<{
    label: string;
    state: "Configured" | "Pending" | "Future";
    tone: CircleCardPlatformStatusTone;
    detail: string;
    icon: typeof Activity;
  }> = [
    {
      label: "Circle Card Status",
      state: card ? "Configured" : "Pending",
      tone: card ? "green" : "amber",
      detail: `${cardCount} active card${cardCount === 1 ? "" : "s"} / ${featureAccess.cardLimit} available`,
      icon: ContactRound
    },
    {
      label: "Billing",
      state: circleCardBillingReadiness.billingEnabled ? "Configured" : "Pending",
      tone: circleCardBillingReadiness.billingEnabled ? "green" : "amber",
      detail: circleCardBillingReadiness.billingEnabled
        ? "Billing flag is enabled; prices are read-only here."
        : "Billing is disabled for this foundation phase.",
      icon: CreditCard
    },
    {
      label: "Notifications",
      state: "Configured",
      tone: "green",
      detail: `${unreadNotificationCount} unread / ${notifications.length} recent loaded`,
      icon: Bell
    },
    {
      label: "Referral Engine",
      state: referralCentre ? "Configured" : "Pending",
      tone: referralCentre ? "green" : "amber",
      detail: `${referralCentre?.stats.signups ?? 0} signup${(referralCentre?.stats.signups ?? 0) === 1 ? "" : "s"} tracked`,
      icon: Send
    },
    {
      label: "Discover",
      state: card?.showInDiscover ? "Configured" : "Pending",
      tone: card?.showInDiscover ? "green" : "amber",
      detail: `${discoverCards.length} visible candidate${discoverCards.length === 1 ? "" : "s"} in this view`,
      icon: Compass
    },
    {
      label: "Wallet",
      state: "Configured",
      tone: "green",
      detail: `${savedContactCount} saved contact${savedContactCount === 1 ? "" : "s"}`,
      icon: WalletCards
    },
    {
      label: "Analytics",
      state: analytics ? "Configured" : "Pending",
      tone: analytics ? "green" : "amber",
      detail: `${cardViewCount.toLocaleString("en-GB")} public view${cardViewCount === 1 ? "" : "s"}`,
      icon: BarChart3
    },
    {
      label: "PWA",
      state: "Configured",
      tone: "green",
      detail: "Install prompt and manifest surfaces are present.",
      icon: Gauge
    }
  ];
  const platformOwnerQuickActions: Array<{
    label: string;
    href: string;
    icon: typeof Activity;
    external?: boolean;
  }> = [
    ...(card
      ? [
          {
            label: "Open Public Card",
            href: `/card/${card.slug}`,
            icon: ArrowUpRight,
            external: true
          }
        ]
      : []),
    {
      label: "Open Dashboard",
      href: circleCardSectionHref("home"),
      icon: Activity
    },
    {
      label: "Open Wallet",
      href: "/dashboard/circle-card/wallet",
      icon: WalletCards
    },
    {
      label: "Open Discover",
      href: circleCardSectionHref("network", "discover"),
      icon: Compass
    },
    {
      label: "Open Referral Centre",
      href: circleCardSectionHref("referrals", "referral-centre"),
      icon: Send
    },
    {
      label: "Open Notifications",
      href: circleCardSectionHref("network", "notifications"),
      icon: Bell
    },
    {
      label: "Open Analytics",
      href: card
        ? circleCardManageHref({ cardId: card.id, section: "my-card", hash: "analytics" })
        : circleCardSectionHref("my-card", "analytics"),
      icon: BarChart3
    },
    {
      label: "Open Admin Command Centre",
      href: "/admin/circle-card",
      icon: ShieldCheck
    }
  ];
  const platformOwnerLaunchChecklist = buildCircleCardPlatformOwnerLaunchChecklist({
    billingReadiness: circleCardBillingReadiness,
    platformOwnerDiagnostics,
    appUrlConfigured: Boolean(process.env.APP_URL?.trim()),
    nextAuthUrlConfigured: Boolean(process.env.NEXTAUTH_URL?.trim()),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    resendConfigured: Boolean(
      process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim()
    ),
    analyticsConfigured: Boolean(analytics),
    cardAvailable: Boolean(card),
    publicCardHref: card ? `/card/${card.slug}` : null,
    referralCentreHref: circleCardSectionHref("referrals", "referral-centre"),
    adminHref: "/admin/circle-card",
    proHref: "/circle-card/pro",
    teamsHref: "/circle-card/teams",
    walletContactCount: savedContactCount,
    discoverCandidateCount: discoverCards.length,
    notificationCount: notifications.length
  });
  const platformOwnerPerformanceInspector = buildCircleCardPlatformOwnerPerformanceInspector({
    appUrlConfigured: Boolean(process.env.APP_URL?.trim()),
    nextAuthUrlConfigured: Boolean(process.env.NEXTAUTH_URL?.trim()),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    resendConfigured: Boolean(
      process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim()
    ),
    billingFlagConfigured: process.env[CIRCLE_CARD_BILLING_FLAG_ENV] !== undefined,
    billingEnabled: circleCardBillingReadiness.billingEnabled,
    analyticsConfigured: Boolean(analytics),
    cardAvailable: Boolean(card),
    publicCardHref: card ? `/card/${card.slug}` : null,
    dashboardHref: circleCardSectionHref("home"),
    walletHref: "/dashboard/circle-card/wallet",
    referralCentreHref: circleCardSectionHref("referrals", "referral-centre"),
    discoverHref: circleCardSectionHref("network", "discover"),
    notificationCount: notifications.length,
    referralCount: referralCentre?.stats.signups ?? 0,
    manifestPath: CIRCLE_CARD_MANIFEST_PATH,
    logoAssetConfigured: true,
    pwaIconConfigured: Boolean(CIRCLE_CARD_ICON_192),
    uploadRouteConfigured: true,
    imageFallbackHandlingPresent: true
  });
  const currentEnvironment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
  const platformInformationItems = [
    {
      label: "Current Platform Version",
      value: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"
    },
    {
      label: "Environment",
      value: currentEnvironment
    },
    {
      label: "Circle Card Billing Enabled",
      value: circleCardBillingReadiness.billingEnabled ? "Yes" : "No"
    },
    {
      label: "Current Circle Card Plan",
      value: circleCardEntitlement.plan
    },
    {
      label: "Current Entitlement",
      value: circleCardEntitlement.label
    },
    {
      label: "Actual Entitlement",
      value: actualCircleCardEntitlement.label
    },
    {
      label: "Admin Override Active",
      value: circleCardEntitlement.isAdminOverride ? "Yes" : "No"
    },
    {
      label: "Notification Count",
      value: unreadNotificationCount.toLocaleString("en-GB")
    },
    {
      label: "Referral Count",
      value: referrals.length.toLocaleString("en-GB")
    },
    {
      label: "Profile Completion",
      value: `${circleCardCompletion.score}%`
    }
  ];
  const recentHomeActivity = visibleActivityItems.slice(0, 3);
  const servicesBuilderMode = resolveCircleCardServicesBuilderMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const productsBuilderMode = resolveCircleCardProductsBuilderMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const priceListBuilderMode = resolveCircleCardPriceListBuilderMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const menuOffersBuilderMode = resolveCircleCardMenuOffersBuilderMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const bookingBuilderMode = resolveCircleCardBookingBuilderMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const documentsBuilderMode = resolveCircleCardDocumentsBuilderMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const openingHoursBuilderMode = resolveCircleCardOpeningHoursBuilderMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const galleryBuilderMode = resolveCircleCardGalleryBuilderMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const reviewsBuilderMode = resolveCircleCardReviewsBuilderMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const creatorStudioMode = resolveCreatorStudioMode({
    cardType: card?.cardType,
    hasProAccess: !isCircleCardFree,
    isPlatformOwner,
    platformPreviewCardType: selectedOwnerCardTypePreviewMode
  });
  const selectedCardServices = card?.cardType === "BUSINESS"
    ? readCircleCardServices(card.contentBlocks)
    : [];
  const selectedCardProducts = card?.cardType === "BUSINESS"
    ? readCircleCardProductItems(card.contentBlocks)
    : [];
  const selectedCardPriceItems = card?.cardType === "BUSINESS"
    ? readCircleCardPriceListItems(card.contentBlocks)
    : [];
  const selectedCardMenuOfferItems = card?.cardType === "BUSINESS"
    ? readCircleCardMenuOfferItems(card.contentBlocks)
    : [];
  const selectedCardBooking = card?.cardType === "BUSINESS"
    ? readCircleCardBookingEnquiry(card.contentBlocks)
    : null;
  const selectedCardDocuments = card?.cardType === "BUSINESS"
    ? readCircleCardDocumentItems(card.contentBlocks)
    : [];
  const selectedCardGalleryItems = card?.cardType === "BUSINESS"
    ? readCircleCardGalleryItems(card.contentBlocks)
    : [];
  const selectedCardReviews = card?.cardType === "BUSINESS"
    ? readCircleCardReviewItems(card.contentBlocks)
    : [];
  const selectedCardPendingWalletTestimonials: CircleCardPendingWalletTestimonial[] =
    card?.cardType === "BUSINESS"
      ? card.walletTestimonialsReceived
        .filter((testimonial) => testimonial.status === "PENDING")
        .map((testimonial) => ({
          id: testimonial.id,
          reviewerName: testimonial.reviewerName,
          reviewerRoleOrCompany: testimonial.reviewerRoleOrCompany,
          testimonialText: testimonial.testimonialText,
          rating: testimonial.rating,
          relationship: testimonial.relationship,
          createdAt: testimonial.createdAt.toISOString()
        }))
      : [];
  const selectedCardApprovedWalletTestimonialCount = card?.cardType === "BUSINESS"
    ? card.walletTestimonialsReceived.filter((testimonial) => testimonial.status === "APPROVED").length
    : 0;
  const selectedCardOpeningHours = card?.cardType === "BUSINESS"
    ? readCircleCardOpeningHours(card.contentBlocks)
    : null;
  const selectedCardCreatorBlocks = card?.cardType === "CREATOR" || creatorStudioMode === "preview"
    ? readCircleCardCreatorBlocks(card?.contentBlocks)
    : {};
  const selectedCardFeaturedContentItems = card?.cardType === "CREATOR"
    ? readCircleCardFeaturedContentItems(card.contentBlocks)
    : [];
  const selectedCardCreatorOffers = card?.cardType === "CREATOR"
    ? readCircleCardCreatorOffers(card.contentBlocks)
    : [];
  const selectedCardMediaKit = card?.cardType === "CREATOR"
    ? readCircleCardMediaKit(card.contentBlocks)
    : null;
  const selectedCardAudienceSnapshot = card?.cardType === "CREATOR"
    ? readCircleCardAudienceSnapshot(card.contentBlocks)
    : null;
  const selectedCardBrandPartnerships = card?.cardType === "CREATOR"
    ? readCircleCardBrandPartnerships(card.contentBlocks)
    : [];
  const selectedCardCreatorTrustSignalCount = card?.cardType === "CREATOR"
    ? card.recommendationsReceived.length + card.walletTestimonialsReceived.filter(
        (testimonial) => testimonial.status === "APPROVED"
      ).length
    : 0;
  const showBusinessCardBuilder =
    servicesBuilderMode !== "hidden" ||
    productsBuilderMode !== "hidden" ||
    priceListBuilderMode !== "hidden" ||
    menuOffersBuilderMode !== "hidden" ||
    bookingBuilderMode !== "hidden" ||
    documentsBuilderMode !== "hidden" ||
    galleryBuilderMode !== "hidden" ||
    reviewsBuilderMode !== "hidden" ||
    openingHoursBuilderMode !== "hidden";
  const businessBuilderAccess: BusinessCardBuilderAccess = isPlatformOwner
    ? "platform-preview"
    : isCircleCardFree
      ? "locked"
      : "available";
  const businessBuilderPreviewLabel =
    businessBuilderAccess === "platform-preview"
      ? "Platform Preview"
      : businessBuilderAccess === "locked"
        ? "Requires Pro"
        : circleCardEntitlement.isEarlyAccess
          ? "Early Access"
          : circleCardEntitlement.isAdminOverride
            ? "Admin Preview"
            : "Pro Preview";
  const businessBuilderCategory =
    card?.identityTags[0]
      ? getCircleCardIdentityTagLabel(card.identityTags[0])
      : getCircleCardAccountTypeLabel(card?.accountType);

  if (card && discoverHasFilters) {
    await trackCircleCardEvent({
      cardId: card.id,
      eventType: "DISCOVER_SEARCH",
      userId: session.user.id,
      metadata: {
        source: "discover",
        query: discoverQuery || null,
        category: discoverCategory || null,
        accountType: discoverAccountType || null,
        identityTag: discoverIdentityTag || null,
        profileLayout: discoverProfileLayout || null,
        location: discoverLocation || null,
        recommendedOnly: discoverRecommended,
        bcnOnly: discoverBcn,
        resultCount: discoverCards.length
      }
    });
  }

  return (
    <div className="space-y-6">
      <CircleCardSectionRouter />
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
              Create a clean card, share it with a QR code, save useful contacts, and give people
              a direct route back to you.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={
                  card
                    ? circleCardManageHref({ cardId: card.id, section: "share", hash: "share-assets-qr" })
                    : circleCardSectionHref("share", "share-assets-qr")
                }
                className={cn(buttonVariants(), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <QrCode size={16} />
                QR
              </Link>
              <Link
                href={card ? selectedCardReturnPath : circleCardSectionHref("my-card", "circle-card-form")}
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
                href={circleCardSectionHref("referrals", "referral-centre")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <Send size={16} />
                Referral Centre
              </Link>
              <Link
                href={circleCardSectionHref("business", "referrals")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <Handshake size={16} />
                Business Referrals
              </Link>
              <Link
                href={circleCardSectionHref("business", "opportunities")}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <ShoppingBag size={16} />
                Opportunities
              </Link>
              <Link
                href="/dashboard/circle-card/wallet"
                className={cn(buttonVariants({ variant: "outline" }), "h-11 min-w-[128px] justify-center gap-2")}
              >
                <WalletCards size={16} />
                Wallet
              </Link>
              <Link
                href={
                  card
                    ? circleCardManageHref({ cardId: card.id, section: "my-card", hash: "analytics" })
                    : circleCardSectionHref("my-card", "analytics")
                }
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
            {isPlatformOwner ? (
              <CircleCardPlatformOwnerPreviewBadge activeMode={selectedOwnerPreviewMode} />
            ) : null}
            {isPlatformOwner ? (
              <CircleCardPlatformOwnerCardTypePreviewBadge
                activeMode={selectedOwnerCardTypePreviewMode}
              />
            ) : null}
            {isPlatformOwner ? <CircleCardPlatformOwnerSandboxBadge /> : null}
            <Badge variant="muted">{accountLabel}</Badge>
            <Badge variant="outline" className="border-silver/18 text-silver">
              {activeCardLimitLabel}
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
                href={
                  card
                    ? circleCardManageHref({ cardId: card.id, section: item.section })
                    : circleCardSectionHref(item.section)
                }
                data-circle-card-section-tab={item.section}
                data-active={selected ? "true" : "false"}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-xl border border-silver/14 bg-background/25 px-3 text-sm font-medium text-muted transition-colors hover:border-silver/30 hover:text-foreground",
                  "data-[active=true]:border-gold/42 data-[active=true]:bg-gold/14 data-[active=true]:text-gold data-[active=true]:shadow-inner-surface"
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
      {isPlatformOwner ? <CircleCardPlatformOwnerSandboxIndicator /> : null}

      <CircleCardDashboardSection
        id="my-cards"
        title="My Circle Cards"
        summary="Manage each identity, its public link, sharing tools and settings."
        defaultOpen
        className="border-gold/20 bg-[linear-gradient(145deg,hsl(var(--card)/0.78),hsl(var(--background)/0.42))]"
        badge={
          <span className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-gold/28 text-gold">
              {cardCount} active
            </Badge>
            {archivedCardCount ? (
              <Badge variant="outline" className="border-silver/18 text-silver">
                {archivedCardCount} archived
              </Badge>
            ) : null}
          </span>
        }
      >

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3 lg:grid-cols-2">
            {cards.length ? (
              cards.map((ownedCard) => {
                const selected = card?.id === ownedCard.id;
                const typeMeta = circleCardHubTypeMeta(ownedCard.cardType);
                const statusMeta = circleCardHubStatusMeta({ isPublished: ownedCard.isPublished });
                const TypeIcon = typeMeta.icon;
                const ownedPublicUrl = absoluteUrl(`/card/${ownedCard.slug}`);
                const cardTitle = `${ownedCard.fullName} | Circle Card`;
                const manageReturnPath = circleCardManageHref({
                  cardId: ownedCard.id,
                  section: "home",
                  hash: "my-cards"
                });

                return (
                  <article
                    key={ownedCard.id}
                    data-active={selected ? "true" : "false"}
                    className={cn(
                      "min-w-0 rounded-2xl border border-border/80 bg-background/28 p-3 transition-colors sm:p-4",
                      "data-[active=true]:border-gold/42 data-[active=true]:bg-gold/8"
                    )}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
                      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/18 bg-gold/10 text-gold sm:h-11 sm:w-11 sm:rounded-xl">
                          <TypeIcon size={18} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="border-silver/18 text-silver">
                              {typeMeta.label}
                            </Badge>
                            <Badge variant="outline" className={statusMeta.className}>
                              {statusMeta.label}
                            </Badge>
                          </div>
                          <h3 className="mt-1.5 truncate text-base font-semibold text-foreground sm:text-lg">
                            {ownedCard.businessName || ownedCard.fullName}
                          </h3>
                          <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">
                            {[ownedCard.fullName, ownedCard.role].filter(Boolean).join(" / ") ||
                              typeMeta.description}
                          </p>
                        </div>
                      </div>
                      {ownedCard.isDefaultCard ? (
                        <Badge variant="premium" className="shrink-0 gap-1 px-2">
                          <Star size={13} />
                          <span className="hidden sm:inline">Default Public Card</span>
                          <span className="sm:hidden">Default</span>
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-3 flex min-w-0 items-center gap-2 rounded-lg border border-silver/12 bg-card/36 px-2.5 py-2">
                      <LinkIcon size={13} className="shrink-0 text-silver" />
                      <p className="min-w-0 flex-1 truncate text-xs text-muted" title={ownedPublicUrl}>
                        <span className="sm:hidden">/card/{ownedCard.slug}</span>
                        <span className="hidden sm:inline">{ownedPublicUrl}</span>
                      </p>
                      {!ownedCard.isPublished ? <EyeOff size={13} className="shrink-0 text-silver" /> : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {ownedCard.isPublished ? (
                        <Link
                          href={`/card/${ownedCard.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 justify-center gap-1.5 px-2")}
                        >
                          <Eye size={14} />
                          View
                        </Link>
                      ) : (
                        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 px-2" disabled>
                          <EyeOff size={14} />
                          Hidden
                        </Button>
                      )}
                      <Link
                        href={circleCardManageHref({
                          cardId: ownedCard.id,
                          section: "my-card",
                          hash: "circle-card-form"
                        })}
                        className={cn(buttonVariants({ variant: selected ? "default" : "outline", size: "sm" }), "h-9 justify-center gap-1.5 px-2")}
                      >
                        <ContactRound size={14} />
                        {selected ? "Editing" : "Edit"}
                      </Link>
                      {ownedCard.isPublished ? (
                        <>
                          <CircleCardShareButton
                            title={cardTitle}
                            publicUrl={ownedPublicUrl}
                            cardId={ownedCard.id}
                            analyticsSource="my_circle_cards_hub"
                            label="Share"
                            size="sm"
                            hideStatus
                            buttonClassName="h-9 gap-1.5 px-2"
                          />
                          <CircleCardCopyLinkButton
                            publicUrl={ownedPublicUrl}
                            label="Copy Link"
                            size="sm"
                            className="h-9 w-full justify-center gap-1.5 px-2"
                            analytics={{
                              cardId: ownedCard.id,
                              source: "my_circle_cards_hub"
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 px-2" disabled>
                            <Share2 size={14} />
                            Share
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 px-2" disabled>
                            <LinkIcon size={14} />
                            Copy Link
                          </Button>
                        </>
                      )}
                    </div>

                    <details className="group mt-3 rounded-xl border border-silver/14 bg-background/18">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2">
                          <Wrench size={14} className="text-gold" />
                          More tools
                        </span>
                        <ChevronDown size={15} className="text-silver transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-2">
                        {ownedCard.isPublished ? (
                          <Link
                            href={circleCardManageHref({
                              cardId: ownedCard.id,
                              section: "share",
                              hash: "share-assets-qr"
                            })}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 justify-center gap-2")}
                          >
                            <QrCode size={14} />
                            Download QR
                          </Link>
                        ) : null}
                        <Link
                          href={circleCardManageHref({
                            cardId: ownedCard.id,
                            section: "my-card",
                            hash: "analytics"
                          })}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 justify-center gap-2")}
                        >
                          <BarChart3 size={14} />
                          Open Analytics
                        </Link>
                        <Link
                          href={circleCardManageHref({
                            cardId: ownedCard.id,
                            section: "settings",
                            hash: "circle-card-settings"
                          })}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 justify-center gap-2")}
                        >
                          <Wrench size={14} />
                          Settings
                        </Link>
                        <CircleCardVisibilityToggle
                          cardId={ownedCard.id}
                          isPublished={ownedCard.isPublished}
                          isDefaultCard={Boolean(ownedCard.isDefaultCard || ownedCard.isPrimary)}
                          isOnlyLiveCard={ownedCard.isPublished && liveCardCount === 1}
                          returnPath={manageReturnPath}
                        />
                        <form action={setDefaultCircleCardAction}>
                          <input type="hidden" name="cardId" value={ownedCard.id} />
                          <input type="hidden" name="returnPath" value={manageReturnPath} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="h-10 w-full gap-2"
                            disabled={ownedCard.isDefaultCard || !ownedCard.isPublished}
                          >
                            <Star size={14} />
                            {ownedCard.isDefaultCard
                              ? "Default Public Card"
                              : ownedCard.isPublished
                                ? "Make Default Public"
                                : "Set Live to Make Default"}
                          </Button>
                        </form>
                        <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2" disabled>
                          <WalletCards size={14} />
                          Wallet Pass - Coming Soon
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2" disabled>
                          <ClipboardCheck size={14} />
                          Duplicate - Coming Soon
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2" disabled>
                          <XCircle size={14} />
                          Archive - Coming Soon
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2" disabled>
                          <Trash2 size={14} />
                          Delete - Coming Soon
                        </Button>
                      </div>
                    </details>
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted lg:col-span-2">
                Create your first Circle Card to open the dashboard editor and public card tools.
              </div>
            )}
          </div>

          <aside className="space-y-3 rounded-2xl border border-border/80 bg-background/24 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Plan limit</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {circleCardEntitlement.label} allows {featureAccess.cardLimit} active Circle Card
                {featureAccess.cardLimit === 1 ? "" : "s"} in this dashboard preview.
              </p>
            </div>
            {canCreateAdditionalCard ? (
              <Link href={createCardHref} className={cn(buttonVariants(), "w-full justify-center gap-2")}>
                <ContactRound size={16} />
                + Create Another Circle Card
              </Link>
            ) : (
              <div className="rounded-xl border border-silver/14 bg-card/42 p-3">
                <p className="text-sm font-semibold text-foreground">You&apos;ve reached your plan limit.</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Existing cards keep their own public URLs, QR codes, share links, settings and analytics.
                </p>
              </div>
            )}
            <details className="group rounded-xl border border-silver/12 bg-card/42">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <Star size={15} className="text-gold" />
                  Card guidance
                </span>
                <ChevronDown size={15} className="text-silver transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-2 border-t border-silver/12 p-3 text-xs text-muted">
                <p className="leading-relaxed">
                  Changing the default only changes the main public identity. Individual URLs, QR codes,
                  wallet passes and analytics stay tied to each card.
                </p>
                <div className="rounded-lg border border-silver/12 bg-background/22 p-2">
                  Live cards are public and appear in the switcher. Hidden cards remain editable here.
                </div>
                {canPreviewFutureCircleCardFoundation ? (
                  <>
                  <div className="rounded-lg border border-silver/12 bg-card/42 p-2 text-muted">
                    Creator blocks reserved: {CIRCLE_CARD_CREATOR_BLOCK_TYPES.length}
                  </div>
                  <div className="rounded-lg border border-silver/12 bg-card/42 p-2 text-muted">
                    Business blocks reserved: {CIRCLE_CARD_BUSINESS_BLOCK_TYPES.length}
                  </div>
                  <div className="rounded-lg border border-silver/12 bg-card/42 p-2 text-muted">
                    Teams foundation stays preview-labelled until staff cards are active.
                  </div>
                  </>
                ) : null}
              </div>
            </details>
          </aside>
        </div>
      </CircleCardDashboardSection>

      {card ? (
        <CircleCardCurrentCardSelector
          cards={currentCardSelectorOptions}
          selectedCardId={card.id}
          hasExplicitSelection={Boolean(selectedCardId)}
          currentSection={activeSection}
          isPlatformOwner={isPlatformOwner}
          previewCardTypeLabel={
            isPlatformOwner
              ? CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS[selectedOwnerCardTypePreviewMode]
              : undefined
          }
        />
      ) : null}

      {!isPlatformOwner && card && publicUrl ? (
        <CircleCardSetupChecklistPanel
          cardId={card.id}
          fullName={card.fullName}
          publicUrl={publicUrl}
          setupItems={setupChecklistItems}
          created={created || notice === "card-created"}
        />
      ) : null}

      <CircleCardDashboardSection
        id="circle-card-plan"
        title="Plan and access"
        summary="Current limits, included capabilities and upgrade previews."
        badge={<Badge variant="outline" className="border-gold/28 text-gold">{circleCardEntitlement.label}</Badge>}
      >
        <CircleCardPlanPanel
          currentPlanKey={circleCardEntitlement.plan}
          cardCount={cardCount}
          activeFeaturedLinkCount={activeCustomLinkCount}
          platformOwnerPreviewEnabled={isPlatformOwner}
          platformOwnerPreviewMode={selectedOwnerPreviewMode}
          platformOwnerCardTypePreviewMode={selectedOwnerCardTypePreviewMode}
          className="border-0 bg-transparent p-0 shadow-none"
        />
      </CircleCardDashboardSection>

      {showPlatformOwnerDiagnostics ? (
        <section
          id="platform-owner-diagnostics"
          className="scroll-mt-24 rounded-2xl border border-gold/22 bg-gold/8 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Admin Diagnostics</p>
              <h2 className="mt-1 font-display text-xl text-foreground">Platform Owner Detection</h2>
            </div>
            <Badge variant={isPlatformOwner ? "premium" : "outline"}>
              {isPlatformOwner ? "Owner resolved" : "Owner hidden"}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {platformOwnerDiagnosticItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-border/70 bg-card/42 p-3">
                <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">{item.label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {isPlatformOwner ? (
        <CircleCardDashboardSection
          id="platform-owner-control-centre"
          title="Platform Owner Control Centre"
          summary="Owner-only operating cockpit for Circle Card build, test and launch foundations."
          badge={<Badge variant="premium">Platform Owner</Badge>}
          className="border-gold/26 bg-[linear-gradient(145deg,hsl(var(--card)/0.76),hsl(var(--background)/0.42))]"
        >
          <div className="grid gap-3">
            <CircleCardPlatformOwnerPreviewSwitcher activeMode={selectedOwnerPreviewMode} />
            <CircleCardPlatformOwnerCardTypePreviewSwitcher
              activeMode={selectedOwnerCardTypePreviewMode}
            />
            <CircleCardPlatformOwnerSandboxToggle />
            <CircleCardPlatformOwnerSandboxPanel />
            <details className="group rounded-xl border border-silver/14 bg-background/18">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ClipboardCheck size={15} className="text-gold" />
                    Launch Checklist
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Read-only launch readiness for deployment, testing, promotion and paid-feature prep.
                  </span>
                </span>
                <ChevronDown size={16} className="mt-1 text-silver transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-3 border-t border-silver/12 p-3 lg:grid-cols-2">
                {platformOwnerLaunchChecklist.map((group) => (
                  <div key={group.id} className="rounded-xl border border-border/70 bg-card/42 p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                      {group.title}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-silver/12 bg-background/22 p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{item.label}</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted">
                                {item.message}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                circleCardLaunchChecklistStatusClass(item.status)
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  circleCardLaunchChecklistStatusDotClass(item.status)
                                )}
                              />
                              {circleCardLaunchChecklistStatusLabel(item.status)}
                            </span>
                          </div>
                          {item.href && item.actionLabel ? (
                            <Link
                              href={item.href}
                              target={item.external ? "_blank" : undefined}
                              rel={item.external ? "noopener noreferrer" : undefined}
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "mt-2 h-8 gap-2"
                              )}
                            >
                              {item.actionLabel}
                              <ArrowUpRight size={13} />
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
            <details className="group rounded-xl border border-silver/14 bg-background/18">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Gauge size={15} className="text-gold" />
                    Performance Inspector
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Read-only system health lite using already-loaded dashboard data and static config.
                  </span>
                </span>
                <ChevronDown size={16} className="mt-1 text-silver transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-3 border-t border-silver/12 p-3 xl:grid-cols-3">
                {platformOwnerPerformanceInspector.map((group) => (
                  <div key={group.id} className="rounded-xl border border-border/70 bg-card/42 p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                      {group.title}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-silver/12 bg-background/22 p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{item.label}</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted">
                                {item.message}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                circleCardPerformanceStatusClass(item.status)
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  circleCardPerformanceStatusDotClass(item.status)
                                )}
                              />
                              {circleCardPerformanceStatusLabel(item.status)}
                            </span>
                          </div>
                          {item.href && item.actionLabel ? (
                            <Link
                              href={item.href}
                              target={item.external ? "_blank" : undefined}
                              rel={item.external ? "noopener noreferrer" : undefined}
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "mt-2 h-8 gap-2"
                              )}
                            >
                              {item.actionLabel}
                              <ArrowUpRight size={13} />
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="xl:col-span-3">
                  <CircleCardPlatformOwnerSessionDebug
                    membershipMode={selectedOwnerPreviewMode}
                    cardTypeMode={selectedOwnerCardTypePreviewMode}
                    environment={currentEnvironment}
                    billingEnabled={circleCardBillingReadiness.billingEnabled}
                    platformOwnerResolved={platformOwnerDiagnostics.platformOwnerResolved}
                    notificationCount={notifications.length}
                    referralCount={referralCentre?.stats.signups ?? 0}
                    profileCompletionScore={circleCardCompletion.score}
                  />
                </div>
              </div>
            </details>
            <CircleCardPlatformOwnerCardTypePreviewModules
              membershipMode={selectedOwnerPreviewMode}
              cardTypeMode={selectedOwnerCardTypePreviewMode}
            />
            <CircleCardPlatformOwnerFeatureMatrixLite
              membershipMode={selectedOwnerPreviewMode}
              cardTypeMode={selectedOwnerCardTypePreviewMode}
            />

            <details className="group rounded-xl border border-silver/14 bg-background/18">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Gauge size={15} className="text-gold" />
                    Platform Status
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Compact readiness signals for the current Circle Card operating layer.
                  </span>
                </span>
                <ChevronDown size={16} className="mt-1 text-silver transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-2 xl:grid-cols-4">
                {platformStatusItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="rounded-xl border border-border/70 bg-card/42 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/16 bg-gold/10 text-gold">
                          <Icon size={15} />
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            circleCardPlatformStatusToneClass(item.tone)
                          )}
                        >
                          <span
                            className={cn("h-1.5 w-1.5 rounded-full", circleCardPlatformStatusDotClass(item.tone))}
                          />
                          {item.state}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{item.detail}</p>
                    </div>
                  );
                })}
              </div>
            </details>

            <details className="group rounded-xl border border-silver/14 bg-background/18">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Rocket size={15} className="text-gold" />
                    Quick Actions
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Direct launch links into existing Circle Card and admin surfaces.
                  </span>
                </span>
                <ChevronDown size={16} className="mt-1 text-silver transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-2 lg:grid-cols-4">
                {platformOwnerQuickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      target={action.external ? "_blank" : undefined}
                      rel={action.external ? "noopener noreferrer" : undefined}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start gap-2")}
                    >
                      <Icon size={14} />
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            </details>

            <details className="group rounded-xl border border-silver/14 bg-background/18">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Wrench size={15} className="text-gold" />
                    Development Modules
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Permanent slots for upcoming internal tools.
                  </span>
                </span>
                <ChevronDown size={16} className="mt-1 text-silver transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-2 border-t border-silver/12 p-3 md:grid-cols-2 xl:grid-cols-3">
                {CIRCLE_CARD_CONTROL_CENTRE_DEVELOPMENT_MODULES.map((module) => (
                  <div key={module.id} className="rounded-xl border border-border/70 bg-card/42 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{module.title}</p>
                      <Badge variant="outline" className="border-gold/24 text-gold">
                        {module.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{module.description}</p>
                  </div>
                ))}
              </div>
            </details>

            <details className="group rounded-xl border border-silver/14 bg-background/18">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Code2 size={15} className="text-gold" />
                    Platform Information
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Live read-only operating context for the current owner session.
                  </span>
                </span>
                <ChevronDown size={16} className="mt-1 text-silver transition-transform group-open:rotate-180" />
              </summary>
              <dl className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {platformInformationItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/70 bg-card/42 p-3">
                    <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">{item.label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </details>

            <details className="group rounded-xl border border-silver/14 bg-background/18">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ClipboardCheck size={15} className="text-gold" />
                    Future Roadmap
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Internal phase map for Circle Card platform expansion.
                  </span>
                </span>
                <ChevronDown size={16} className="mt-1 text-silver transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-2 xl:grid-cols-4">
                {CIRCLE_CARD_CONTROL_CENTRE_ROADMAP.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                      item.status === "completed"
                        ? "border-gold/24 bg-gold/10 text-foreground"
                        : "border-border/70 bg-card/42 text-muted"
                    )}
                  >
                    {item.status === "completed" ? (
                      <CheckCircle2 size={15} className="shrink-0 text-gold" />
                    ) : (
                      <XCircle size={15} className="shrink-0 text-muted" />
                    )}
                    <span className="min-w-0">{item.label}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </CircleCardDashboardSection>
      ) : null}

      <CircleCardDashboardSection
        id="circle-card-upgrade-signals"
        title="Growth and upgrade signals"
        summary="Usage-based guidance for when Pro or Teams may become useful."
        badge={<Badge variant="muted">Advanced</Badge>}
      >
        <CircleCardUpgradeSignalsPanel
          metrics={circleCardUsageMetrics}
          proTriggers={circleCardUpgradeTriggers.pro}
          teamsTriggers={circleCardUpgradeTriggers.teams}
        />
      </CircleCardDashboardSection>

      {isPlatformOwner && card && publicUrl ? (
        <CircleCardSetupChecklistPanel
          cardId={card.id}
          fullName={card.fullName}
          publicUrl={publicUrl}
          setupItems={setupChecklistItems}
          created={created || notice === "card-created"}
        />
      ) : null}

      {isCircleCardFree ? <CircleCardBcnDiscoveryPanel /> : null}

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

      {card && !card.accountType ? (
        <CircleCardIdentityBanner
          cardId={card.id}
          returnPath={circleCardManageHref({ cardId: card.id, section: "my-card", hash: "card-identity" })}
          accountType={card.accountType}
          identityTags={card.identityTags}
        />
      ) : null}

      <section
        data-circle-card-section="home"
        className={cn("space-y-4", activeSection !== "home" && "hidden")}
      >
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
                  <Link href={circleCardManageHref({ cardId: card.id, section: "share", hash: "share-assets-qr" })}>
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
        id="referral-centre"
        title="Referral Centre"
        summary="Share Circle Card with people who would benefit from a cleaner way to connect"
        appSection="referrals"
        className={activeSection === "referrals" ? undefined : "hidden"}
        defaultOpen
        badge={
          <Badge variant="outline" className="border-gold/28 text-gold">
            {referralCentre?.stats.signups ?? 0} signup
            {(referralCentre?.stats.signups ?? 0) === 1 ? "" : "s"}
          </Badge>
        }
      >
        {referralCentre && referralUrl ? (
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-gold/18 bg-gold/8 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                        My referral link
                      </p>
                      <p className="mt-2 break-all text-sm font-medium text-foreground">
                        {referralUrl}
                      </p>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                        Invite people to discover Circle Card. Clicks, signups and activation are
                        tracked here before rewards are switched on.
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit shrink-0 border-silver/18 text-silver">
                      {referralCentre.identity.code}
                    </Badge>
                  </div>
                  <div id="referral-link-actions" className="mt-4 grid gap-2 sm:grid-cols-3">
                    <CircleCardCopyLinkButton
                      publicUrl={referralUrl}
                      label="Copy referral link"
                      className="h-11 w-full"
                    />
                    <CircleCardShareButton
                      title="Circle Card"
                      publicUrl={referralShareUrl ?? referralUrl}
                      text="Create your free Circle Card and make it easier for people to connect with you."
                      label="Share referral link"
                      hideStatus
                      buttonClassName="h-11"
                    />
                    <Link href="#referral-qr">
                      <Button type="button" variant="outline" className="h-11 w-full gap-2">
                        <QrCode size={16} />
                        Referral QR
                      </Button>
                    </Link>
                  </div>
                </div>

                <CircleCardReferralNudges nudges={referralCentre.nudges} />

                {circleCardCompletion.score >= 80 && card ? (
                  <div className="rounded-2xl border border-gold/20 bg-card/62 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Your Circle Card is ready to share.
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted">
                          Your profile is strong enough to invite people in. Future rewards will be
                          tracked when Pro billing is active.
                        </p>
                      </div>
                      <Badge variant="outline" className="w-fit shrink-0 border-gold/28 text-gold">
                        {circleCardCompletion.score}% complete
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <CircleCardCopyLinkButton
                        publicUrl={referralUrl}
                        label="Copy referral link"
                        className="h-11 w-full"
                      />
                      <CircleCardShareButton
                        title="Circle Card"
                        publicUrl={referralShareUrl ?? referralUrl}
                        text="Create your free Circle Card and make it easier for people to connect with you."
                        label="Share referral link"
                        hideStatus
                        buttonClassName="h-11"
                      />
                      <Link href={`/card/${card.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="outline" className="h-11 w-full gap-2">
                          Open public card
                          <ArrowUpRight size={16} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    ["Referral Clicks", referralCentre.stats.clicks, "People who opened your link"],
                    ["Referral Signups", referralCentre.stats.signups, "People who created an account"],
                    ["Activated Referrals", referralCentre.stats.activated, "Completed key setup"],
                    ["Pro Referrals", referralCentre.stats.proReferrals, "Pro interest captured"],
                    ["Teams Referrals", referralCentre.stats.teamsReferrals, "Teams interest captured"]
                  ].map(([label, value, hint]) => (
                    <div key={label} className="rounded-2xl border border-silver/14 bg-background/20 p-4">
                      <p className="text-xs text-muted">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {Number(value).toLocaleString("en-GB")}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-silver/14 bg-card/58 p-4">
                    <p className="text-sm font-semibold text-foreground">Activation insight</p>
                    <div className="mt-3 grid gap-2 text-sm text-muted">
                      <p>Inactive: {referralCentre.insights.referredButInactive}</p>
                      <p>Incomplete: {referralCentre.insights.referredButIncomplete}</p>
                      <p>Activated: {referralCentre.insights.referredAndActivated}</p>
                      <p>Likely Pro candidates: {referralCentre.insights.likelyProCandidates}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gold/18 bg-gold/8 p-4">
                    <p className="text-sm font-semibold text-foreground">Future Rewards</p>
                    <p className="mt-2 font-display text-2xl text-gold">
                      {referralCentre.rewardAwareness.statusLabel}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Future rewards will be tracked when Pro billing is active. No payout or
                      commission calculations are active.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                  <div id="referral-qr">
                  <CircleCardQrPanel
                    publicUrl={referralQrUrl ?? referralUrl}
                    slug={`${referralCentre.identity.code}-referral`}
                    label="Referral QR code"
                    showCopyImage
                  />
                </div>
                <div id="recent-referrals" className="rounded-2xl border border-silver/14 bg-card/58 p-4">
                  <p className="text-sm font-semibold text-foreground">Recent referrals</p>
                  <div className="mt-3 space-y-2">
                    {referralCentre.recentReferrals.length ? (
                      referralCentre.recentReferrals.map((referral) => (
                        <div
                          key={referral.id}
                          className="rounded-xl border border-silver/12 bg-background/20 p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {referral.name}
                              </p>
                              {referral.email ? (
                                <p className="mt-1 break-all text-xs text-muted">{referral.email}</p>
                              ) : null}
                            </div>
                            <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                              {circleCardGrowthReferralStatusLabel(referral.activationStatus)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted">
                            {referral.activatedAt
                              ? `Activated ${formatDate(referral.activatedAt)}`
                              : referral.signedUpAt
                                ? `Signed up ${formatDate(referral.signedUpAt)}`
                                : `Clicked ${formatDate(referral.clickedAt)}`}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">
                        Referral signups and activations will appear here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
            Create your Circle Card to generate a referral identity.
          </div>
        )}
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="notifications"
        title="Notification Centre"
        summary="Recent Circle Card activity and relationship items that need attention"
        appSection="network"
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
                            {circleCardNotificationTypeLabel(notification.type, notification.entityType)}
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
                        href={circleCardNotificationHref(notification.type, notification.entityType)}
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
                  <Sparkles size={20} />
                </div>
                <h3 className="mt-4 font-display text-2xl text-foreground">No notifications yet</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                  Nothing new right now. Keep building your Circle.
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
        appSection="network"
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
        appSection="network"
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
                <Link href="/dashboard/circle-card/wallet" className={cn(buttonVariants({ variant: "outline" }), "mt-5 gap-2")}>
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
        appSection="business"
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
        summary="Find opted-in Circle Cards, save useful people, and start connection requests"
        appSection="network"
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
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
              >
                <input type="hidden" name="section" value="network" />
                <div className="relative md:col-span-2 xl:col-span-2">
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
                <Select
                  name="discoverAccountType"
                  defaultValue={discoverAccountType ?? ""}
                  aria-label="Discover account type filter"
                >
                  <option value="">All account types</option>
                  {CIRCLE_CARD_ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {CIRCLE_CARD_ACCOUNT_TYPE_COPY[type].shortLabel}
                    </option>
                  ))}
                </Select>
                <Select
                  name="discoverIdentityTag"
                  defaultValue={discoverIdentityTag}
                  aria-label="Discover identity tag filter"
                >
                  <option value="">All identity tags</option>
                  {CIRCLE_CARD_IDENTITY_TAGS.map((tag) => (
                    <option key={tag.value} value={tag.value}>
                      {tag.label}
                    </option>
                  ))}
                </Select>
                <Select
                  name="discoverProfileLayout"
                  defaultValue={discoverProfileLayout ?? ""}
                  aria-label="Discover profile layout filter"
                >
                  <option value="">All layouts</option>
                  {CIRCLE_CARD_PROFILE_LAYOUTS.map((layout) => (
                    <option key={layout} value={layout}>
                      {CIRCLE_CARD_PROFILE_LAYOUT_COPY[layout].shortLabel}
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
                  Showing public cards whose owners chose to appear in Discover, excluding your own.
                  Recently updated cards appear first.
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
                            {candidate.accountTypeLabel ? (
                              <Badge variant="outline" className="border-gold/25 text-gold">
                                {candidate.accountTypeLabel}
                              </Badge>
                            ) : null}
                            {candidate.profileLayoutLabel ? (
                              <Badge variant="outline" className="border-silver/18 text-silver">
                                {candidate.profileLayoutLabel}
                              </Badge>
                            ) : null}
                            {candidate.identityTagLabels.map((tagLabel) => (
                              <Badge key={tagLabel} variant="outline" className="border-silver/18 text-silver">
                                {tagLabel}
                              </Badge>
                            ))}
                            {candidate.identityTags.length > candidate.identityTagLabels.length ? (
                              <Badge variant="outline" className="border-silver/18 text-silver">
                                +{candidate.identityTags.length - candidate.identityTagLabels.length} more
                              </Badge>
                            ) : null}
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
                            accountType: discoverAccountType || null,
                            identityTag: discoverIdentityTag || null,
                            profileLayout: discoverProfileLayout || null,
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
                            href={circleCardSectionHref("network", "connect-hub")}
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
                  <Link href={card ? circleCardManageHref({ cardId: card.id, section: "share", hash: "share-assets" }) : circleCardSectionHref("share", "share-assets")} className={cn(buttonVariants(), "gap-2")}>
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
        appSection="business"
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
        appSection="network"
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
                      <Link href={circleCardManageHref({ cardId: card.id, section: "share", hash: "share-assets-qr" })} className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-2")}>
                        <QrCode size={16} />
                        QR
                      </Link>
                      <Link
                        href={circleCardManageHref({ cardId: card.id, section: "share", hash: "share-assets" })}
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
                    href={circleCardSectionHref("network", "connect-hub")}
                    className="rounded-2xl border border-gold/18 bg-gold/8 p-4 hover:border-gold/32"
                  >
                    <span className="text-2xl font-semibold text-foreground">{pendingIncomingRequests.length}</span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.08em] text-gold">Incoming</span>
                  </a>
                  <a
                    href={circleCardSectionHref("network", "connect-hub")}
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
                        href={buildWalletHref({ contactId: contact.id })}
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
        appSection="share"
        className={activeSection === "share" ? undefined : "hidden"}
      >
        {card && publicUrl && qrUrl && nfcUrl && eventUrl ? (
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
              Share tools for: {currentCardDisplayName}
            </p>
            <CircleCardShareAssetsPanel
              cardId={card.id}
              fullName={card.fullName}
              slug={card.slug}
              publicUrl={publicUrl}
              qrUrl={qrUrl}
              nfcUrl={nfcUrl}
              eventUrl={eventUrl}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
            Create and publish your Circle Card before generating share assets.
          </div>
        )}
      </CircleCardDashboardSection>

      <div
        data-circle-card-section="my-card"
        className={cn("grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]", activeSection !== "my-card" && "hidden")}
      >
        <Card id="circle-card-form" className="scroll-mt-24 border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle>
              {card
                ? "Edit your Circle Card"
                : isCreatingAdditionalCard
                  ? "Create another Circle Card"
                  : "Create your first Circle Card"}
            </CardTitle>
            <CardDescription>
              Keep the card focused on the details people need when they want to reconnect.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CircleCardSaveForm
              id={isFirstCardCreateFlow ? "circle-card-first-card-form" : "circle-card-edit-form"}
              action={upsertCircleCardAction}
              existingCardId={card?.id}
              className="space-y-5 pb-24 sm:pb-0"
              noValidate={!isFirstCardCreateFlow}
            >
              <input type="hidden" name="returnPath" value={selectedCardReturnPath} />
              {card ? <input type="hidden" name="cardId" value={card.id} /> : null}

              {isFirstCardCreateFlow ? (
                <>
                  <CircleCardFirstCardFormHelper
                    formId="circle-card-first-card-form"
                    draftKey={`circle-card:first-card-draft:${session.user.id}`}
                    clearDraft={created || notice === "card-created"}
                  />
                  <input type="hidden" name="profileLayout" value={DEFAULT_CIRCLE_CARD_PROFILE_LAYOUT} />
                  <input type="hidden" name="isPublished" value="on" />

                  {error ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                    >
                      <p className="font-semibold">We could not create your Circle Card yet.</p>
                      <p className="mt-1">
                        {error === "slug-taken"
                          ? "That public link is already taken. Try adding your town, business name or initials to the slug."
                          : error === "identity-invalid"
                            ? "Choose what best describes you before creating your card."
                            : error === "invalid-card"
                              ? "Check your name, card type and public link, then try again."
                              : ERROR_MESSAGES[error] ?? "Check the highlighted fields and try again."}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-gold/24 bg-gold/8 p-4 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Badge variant="premium">Under 30 seconds</Badge>
                        <h2 className="mt-3 font-display text-2xl text-foreground">
                          Create your first Circle Card
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                          Start with the essentials. You can add photos, socials, colours and links after the card exists.
                        </p>
                      </div>
                      <CircleCardSubmitButton
                        className="hidden gap-2 sm:inline-flex"
                        pendingLabel="Creating..."
                      >
                        <Save size={16} />
                        Create Circle Card
                      </CircleCardSubmitButton>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="first-card-fullName">Full name</Label>
                        <Input
                          id="first-card-fullName"
                          name="fullName"
                          defaultValue={defaultFirstCardName}
                          autoComplete="name"
                          required
                          minLength={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first-card-businessName">Business or display name</Label>
                        <Input
                          id="first-card-businessName"
                          name="businessName"
                          defaultValue={defaultFirstCardBusinessName}
                          placeholder="Your business, brand or display name"
                          autoComplete="organization"
                          required
                        />
                        <p className="text-xs text-muted">
                          Use your business, brand or preferred public display name.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first-card-slug">Public link slug</Label>
                        <Input
                          id="first-card-slug"
                          name="slug"
                          defaultValue={defaultFirstCardSlug}
                          placeholder="your-name"
                          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                          maxLength={80}
                          required
                          aria-describedby="first-card-slug-help"
                        />
                        <p id="first-card-slug-help" className="text-xs text-muted">
                          Your card link will be /card/your-name. Use lowercase letters, numbers and hyphens.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first-card-cardType">Card type</Label>
                        <Select
                          id="first-card-cardType"
                          name="cardType"
                          defaultValue={defaultNewCardType}
                          required
                        >
                          {CIRCLE_CARD_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {CIRCLE_CARD_TYPE_COPY[type].label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <fieldset className="mt-5 space-y-3">
                      <legend className="text-sm font-medium text-foreground">
                        What best describes you?
                      </legend>
                      <div className="grid gap-3 md:grid-cols-3">
                        {CIRCLE_CARD_ACCOUNT_TYPES.map((type, index) => {
                          const copy = CIRCLE_CARD_ACCOUNT_TYPE_COPY[type];
                          const id = `first-card-account-${type.toLowerCase()}`;

                          return (
                            <label key={type} htmlFor={id} className="block cursor-pointer">
                              <input
                                id={id}
                                type="radio"
                                name="accountType"
                                value={type}
                                defaultChecked={index === 0}
                                required
                                className="peer sr-only"
                              />
                              <span className="flex h-full flex-col gap-2 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-muted transition peer-checked:border-gold/40 peer-checked:bg-gold/10 peer-checked:text-foreground">
                                <span className="font-medium text-foreground">{copy.label}</span>
                                <span className="text-xs leading-relaxed text-muted">
                                  {copy.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="mt-5 rounded-xl border border-silver/14 bg-background/22 p-3 text-xs leading-relaxed text-muted">
                      Optional setup comes next: profile photo, logo, bio, colours, website, contact details, socials, featured links, location and identity tags.
                    </div>
                  </div>

                  <div className="sticky bottom-2 z-30 rounded-2xl border border-gold/28 bg-background/92 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur sm:hidden">
                    <CircleCardSubmitButton
                      className="h-12 w-full gap-2"
                      pendingLabel="Creating..."
                    >
                      <Save size={16} />
                      Create Circle Card
                    </CircleCardSubmitButton>
                  </div>
                </>
              ) : (
                <>
              <CircleCardDashboardSection
                id="card-identity"
                title="Card identity"
                summary={card?.fullName || "Name, role, slug, tagline and about text"}
                defaultOpen
              >
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-gold">
                  Editing: {currentCardContextLabel}
                </p>
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
                    <Label htmlFor="cardType">Card type</Label>
                    <Select
                      id="cardType"
                      name="cardType"
                      defaultValue={card?.cardType ?? defaultNewCardType}
                    >
                      {CIRCLE_CARD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {CIRCLE_CARD_TYPE_COPY[type].label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted">
                      Used for dashboard management and the public card switcher.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <CircleCardIdentityFields
                      accountType={card?.accountType ?? null}
                      identityTags={card?.identityTags ?? []}
                      idPrefix="circle-card-edit-identity"
                      compact
                      required={!card}
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
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-gold">
                  Images for: {currentCardDisplayName}
                </p>
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
                id="card-theme"
                title="Profile Colours"
                summary="Primary, accent and button colours for your public profile"
              >
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-gold">
                  Styling: {currentCardDisplayName}
                </p>
                <CircleCardThemeFields
                  themePrimaryColor={card?.themePrimaryColor}
                  themeAccentColor={card?.themeAccentColor}
                  themeButtonColor={card?.themeButtonColor}
                  fullName={card?.fullName ?? member?.name}
                  tagline={card?.tagline}
                  profileLayout={card?.profileLayout}
                />
              </CircleCardDashboardSection>

              <CircleCardDashboardSection
                id="card-contact-details"
                title="Contact details"
                summary={[card?.websiteUrl, card?.email, card?.phone, card?.location].filter(Boolean).length ? "Website, email, phone and location" : "Add direct ways for people to reach you"}
              >
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-gold">
                  Contact details for: {currentCardDisplayName}
                </p>
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
                summary={`${activeSocialLinkCount} active social link${activeSocialLinkCount === 1 ? "" : "s"} connected`}
              >
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-gold">
                  Social links for: {currentCardDisplayName}
                </p>
                <CircleCardSocialLinkEditor cardId={card?.id} initialLinks={socialLinkItems} />
              </CircleCardDashboardSection>

              <label
                htmlFor="isPublished"
                className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
              >
                <CircleCardVisibilityCheckbox
                  id="isPublished"
                  defaultChecked={card?.isPublished ?? true}
                  isDefaultCard={Boolean(card?.isDefaultCard || card?.isPrimary)}
                  isOnlyLiveCard={Boolean(card?.isPublished && liveCardCount === 1)}
                />
                <span>
                  Live
                  <span className="mt-1 block text-xs text-muted">
                    Live cards are available at their /card link and public card switcher. Applies
                    to {currentCardDisplayName}.
                  </span>
                </span>
              </label>

              <label
                htmlFor="showInDiscover"
                className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
              >
                <input
                  id="showInDiscover"
                  name="showInDiscover"
                  type="checkbox"
                  defaultChecked={card?.showInDiscover ?? false}
                  className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                />
                <span>
                  Show my Circle Card in Discover
                  <span className="mt-1 block text-xs text-muted">
                    {CIRCLE_CARD_DISCOVER_SETTING_COPY}
                  </span>
                </span>
              </label>

              <CircleCardSubmitButton
                className="w-full gap-2 sm:w-auto"
                pendingLabel={card ? "Saving..." : "Creating..."}
              >
                <Save size={16} />
                {card ? "Save Circle Card" : "Create Circle Card"}
              </CircleCardSubmitButton>
              <div className="sticky bottom-2 z-30 rounded-2xl border border-gold/28 bg-background/92 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur sm:hidden">
                <CircleCardSubmitButton
                  className="h-12 w-full gap-2"
                  pendingLabel={card ? "Saving..." : "Creating..."}
                >
                  <Save size={16} />
                  {card ? "Save Circle Card" : "Create Circle Card"}
                </CircleCardSubmitButton>
              </div>
                </>
              )}
            </CircleCardSaveForm>
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
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
                    QR / Share for: {currentCardDisplayName}
                  </p>
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
                  Search, favourites, private notes and tags are now available in the dedicated
                  Wallet OS.
                </p>
                <Link href="/dashboard/circle-card/wallet" className={cn(buttonVariants({ variant: "outline" }), "mt-4 gap-2")}>
                  <WalletCards size={16} />
                  Open Wallet
                </Link>
              </CardContent>
            </Card>

            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <BarChart3 size={17} className="text-silver" />
                  Analytics
                </CardTitle>
                <CardDescription>
                  Analytics for {currentCardDisplayName}: {card?.viewCount ?? 0} public view{(card?.viewCount ?? 0) === 1 ? "" : "s"} recorded.
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
                  Circle Card growth path
                </CardTitle>
                <CardDescription>
                  {isCircleCardFree
                    ? "Free is your personal identity card. Pro is where the Business Card Builder becomes useful."
                    : "Pro and Teams benefits are prepared in the access layer without activating billing here."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="rounded-xl border border-silver/14 bg-background/22 p-3">
                    <p className="font-semibold text-foreground">Free</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Personal identity card, 5 featured links and basic analytics.
                    </p>
                  </div>
                  <div className="rounded-xl border border-gold/22 bg-gold/10 p-3">
                    <p className="font-semibold text-foreground">Pro</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Second card, Business Card Builder, services/products sections, stronger customisation,
                      stronger analytics and referral earning eligibility when billing is live.
                    </p>
                  </div>
                  <div className="rounded-xl border border-silver/14 bg-background/22 p-3">
                    <p className="font-semibold text-foreground">Teams</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Company cards, staff cards, shared branding and team analytics.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      {card && showBusinessCardBuilder ? (
        <BusinessCardBuilderFoundation
          access={businessBuilderAccess}
          previewLabel={businessBuilderPreviewLabel}
          cardId={card.id}
          publicUrl={publicUrl ?? absoluteUrl(`/card/${card.slug}`)}
          fullName={card.fullName}
          servicesMode={servicesBuilderMode}
          services={selectedCardServices}
          productsMode={productsBuilderMode}
          products={selectedCardProducts}
          priceListMode={priceListBuilderMode}
          priceItems={selectedCardPriceItems}
          menuOffersMode={menuOffersBuilderMode}
          menuOfferItems={selectedCardMenuOfferItems}
          bookingMode={bookingBuilderMode}
          booking={selectedCardBooking}
          documentsMode={documentsBuilderMode}
          documents={selectedCardDocuments}
          galleryMode={galleryBuilderMode}
          galleryItems={selectedCardGalleryItems}
          reviewsMode={reviewsBuilderMode}
          reviews={selectedCardReviews}
          pendingWalletTestimonials={selectedCardPendingWalletTestimonials}
          approvedWalletTestimonialCount={selectedCardApprovedWalletTestimonialCount}
          openingHoursMode={openingHoursBuilderMode}
          openingHours={selectedCardOpeningHours}
          businessName={card.businessName}
          businessDescription={card.about}
          primaryService={card.role}
          businessCategory={businessBuilderCategory}
          serviceArea={card.location}
          websiteUrl={card.websiteUrl}
          profileImageUrl={card.profileImageUrl}
          businessLogoUrl={card.businessLogoUrl}
          email={card.email}
          phone={card.phone}
          className={activeSection === "my-card" ? undefined : "hidden"}
        />
      ) : null}

      {card && creatorStudioMode !== "hidden" ? (
        <CreatorProStudio
          mode={creatorStudioMode}
          entitlementLabel={circleCardEntitlement.label}
          cardId={card.id}
          fullName={card.fullName}
          profileImageUrl={card.profileImageUrl}
          about={card.about}
          identityTagCount={card.identityTags.length}
          websiteUrl={card.websiteUrl}
          activeSocialProfileCount={activeSocialLinkCount}
          activeFeaturedLinkCount={activeCustomLinkCount}
          activeLinkTypes={customLinks.filter((link) => link.isActive).map((link) => link.type)}
          creatorTrustSignalCount={selectedCardCreatorTrustSignalCount}
          creatorBlocks={selectedCardCreatorBlocks}
          featuredContentItems={selectedCardFeaturedContentItems}
          creatorOffers={selectedCardCreatorOffers}
          mediaKit={selectedCardMediaKit}
          audienceSnapshot={selectedCardAudienceSnapshot}
          brandPartnerships={selectedCardBrandPartnerships}
          publicUrl={publicUrl ?? absoluteUrl(`/card/${card.slug}`)}
          className={activeSection === "my-card" ? undefined : "hidden"}
        />
      ) : null}

      {card ? (
        <CircleCardDashboardSection
          id="smart-profile-import"
          title="Smart Profile Import"
          summary="Scan public links, review suggestions, then apply only what you choose"
          appSection="my-card"
          className={activeSection === "my-card" ? undefined : "hidden"}
        >
          <CircleCardSmartProfileImportPanel
            cardId={card.id}
            returnPath={circleCardManageHref({ cardId: card.id, section: "my-card", hash: "smart-profile-import" })}
            isCreatorLayout={card.cardType === "CREATOR"}
            existingTagline={card.tagline}
            existingProfileImageUrl={card.profileImageUrl}
            existingWebsiteUrl={card.websiteUrl}
            existingSocialLinks={activeSocialLinkMap}
            customLinkLimitLabel={customLinkLimitLabel}
          />
        </CircleCardDashboardSection>
      ) : null}

      <CircleCardDashboardSection
        id="custom-links"
        title="Featured links"
        summary="Smart action blocks for bookings, offers, downloads, reviews, shops, menus and case studies"
        appSection="my-card"
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
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
            Links for: {currentCardDisplayName}
          </p>

        {card ? (
          <>
            <CircleCardSmartLinkCreateForm
              cardId={card.id}
              sortOrder={customLinks.length}
              defaultActive={!freeActiveCustomLinkLimitReached}
              examples={CUSTOM_LINK_EXAMPLES}
              activeLimitLabel={`Free cards can keep up to ${CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT} active custom links.`}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              {USE_OPTIMISTIC_SMART_LINK_MANAGER ? (
                <CircleCardSmartLinkManager
                  cardId={card.id}
                  cardSlug={card.slug}
                  initialLinks={customLinks.map((customLink) => ({
                    id: customLink.id,
                    type: resolveCustomLinkType(customLink.type),
                    actionMode: (customLink.actionMode || "AUTO") as CircleCardLinkActionMode,
                    visibility: (customLink.visibility || "PUBLIC") as CircleCardLinkVisibility,
                    label: customLink.label,
                    url: customLink.url,
                    description: customLink.description,
                    icon: customLink.icon,
                    imageUrl: customLink.imageUrl,
                    fileUrl: customLink.fileUrl,
                    fileName: customLink.fileName,
                    fileMimeType: customLink.fileMimeType,
                    buttonText: customLink.buttonText,
                    expiresAt: customLink.expiresAt?.toISOString() ?? null,
                    accessCodeHint: customLink.accessCodeHint,
                    hasAccessCode: Boolean(customLink.accessCodeHash),
                    sortOrder: customLink.sortOrder,
                    isActive: customLink.isActive
                  }))}
                  focusedLinkId={focusedCustomLinkId}
                />
              ) : (
              <div className="space-y-3">
                {customLinks.length ? (
                  customLinks.map((customLink, index) => {
                    const isFirst = index === 0;
                    const isLast = index === customLinks.length - 1;

                    return (
                      <Card
                        id={`custom-link-${customLink.id}`}
                        key={customLink.id}
                        className={cn(
                          "scroll-mt-24 border-silver/16 bg-card/62",
                          customLink.isActive ? "border-gold/20" : "opacity-78"
                        )}
                      >
                        <CardContent className="space-y-4 p-4 sm:p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex min-w-0 gap-3">
                              {customLink.imageUrl ? (
                                <span className="inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gold/18 bg-background/30">
                                  <img
                                    src={customLink.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </span>
                              ) : (
                                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/18 bg-gold/10 text-gold">
                                  <CustomLinkIcon icon={customLink.icon} type={customLink.type} />
                                </span>
                              )}
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
                                <input type="hidden" name="returnPath" value={circleCardManageHref({ cardId: card.id, section: "my-card", hash: "custom-links" })} />
                                <input type="hidden" name="cardId" value={card.id} />
                                <input type="hidden" name="linkId" value={customLink.id} />
                                <input type="hidden" name="direction" value="up" />
                                <CircleCardSubmitButton
                                  variant="outline"
                                  size="sm"
                                  className="h-10 w-full gap-2 sm:w-10 sm:px-0"
                                  disabled={isFirst}
                                  title="Move link up"
                                  pendingChildren={
                                    <>
                                      <ArrowUp size={14} className="animate-pulse" />
                                      <span className="sm:sr-only">Moving up</span>
                                    </>
                                  }
                                >
                                  <ArrowUp size={14} />
                                  <span className="sm:sr-only">Move up</span>
                                </CircleCardSubmitButton>
                              </form>
                              <form action={moveCircleCardLinkAction}>
                                <input type="hidden" name="returnPath" value={circleCardManageHref({ cardId: card.id, section: "my-card", hash: "custom-links" })} />
                                <input type="hidden" name="cardId" value={card.id} />
                                <input type="hidden" name="linkId" value={customLink.id} />
                                <input type="hidden" name="direction" value="down" />
                                <CircleCardSubmitButton
                                  variant="outline"
                                  size="sm"
                                  className="h-10 w-full gap-2 sm:w-10 sm:px-0"
                                  disabled={isLast}
                                  title="Move link down"
                                  pendingChildren={
                                    <>
                                      <ArrowDown size={14} className="animate-pulse" />
                                      <span className="sm:sr-only">Moving down</span>
                                    </>
                                  }
                                >
                                  <ArrowDown size={14} />
                                  <span className="sm:sr-only">Move down</span>
                                </CircleCardSubmitButton>
                              </form>
                              <form action={toggleCircleCardLinkAction}>
                                <input type="hidden" name="returnPath" value={circleCardManageHref({ cardId: card.id, section: "my-card", hash: "custom-links" })} />
                                <input type="hidden" name="cardId" value={card.id} />
                                <input type="hidden" name="linkId" value={customLink.id} />
                                <CircleCardSubmitButton
                                  variant="outline"
                                  size="sm"
                                  className="h-10 w-full gap-2 sm:w-auto"
                                  pendingLabel={customLink.isActive ? "Pausing..." : "Activating..."}
                                >
                                  {customLink.isActive ? "Pause" : "Activate"}
                                </CircleCardSubmitButton>
                              </form>
                              <form action={deleteCircleCardLinkAction}>
                                <input type="hidden" name="returnPath" value={circleCardManageHref({ cardId: card.id, section: "my-card", hash: "custom-links" })} />
                                <input type="hidden" name="cardId" value={card.id} />
                                <input type="hidden" name="linkId" value={customLink.id} />
                                <CircleCardSubmitButton
                                  variant="outline"
                                  size="sm"
                                  className="h-10 w-full gap-2 sm:w-auto"
                                  pendingChildren={
                                    <>
                                      <Trash2 size={14} className="animate-pulse" />
                                      Deleting...
                                    </>
                                  }
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </CircleCardSubmitButton>
                              </form>
                            </div>
                          </div>

                          <details
                            open={focusedCustomLinkId === customLink.id}
                            className="rounded-2xl border border-silver/14 bg-background/18 p-3"
                          >
                            <summary className="cursor-pointer list-none text-sm font-medium text-silver">
                              Edit link
                            </summary>
                            <form action={upsertCircleCardLinkAction} className="mt-4 space-y-4" noValidate>
                              <input type="hidden" name="returnPath" value={circleCardCustomLinkEditHref(customLink.id)} />
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
                                defaultImageUrl={customLink.imageUrl}
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

                              <CircleCardSubmitButton className="w-full gap-2 sm:w-auto" pendingLabel="Saving...">
                                <Save size={16} />
                                Save link
                              </CircleCardSubmitButton>
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
              )}

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
                      Free Circle Cards can keep up to {CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT} active
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
        appSection="my-card"
        className={activeSection === "my-card" ? undefined : "hidden"}
        badge={
          <Badge variant="outline" className="w-fit border-gold/25 text-gold">
            Basic analytics included
          </Badge>
        }
      >
        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
            Analytics for: {currentCardDisplayName}
          </p>

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
                        <Badge key={feature.id} variant="outline" className="border-gold/25 text-gold">
                          {feature.label}
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
        appSection="network"
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

        <Card
          id="leave-wallet-testimonial"
          className={cn(
            "scroll-mt-24 border-gold/18 bg-gold/8",
            testimonialForCardId && "border-gold/45 ring-2 ring-gold/20"
          )}
        >
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Star size={18} className="text-gold" />
              {requestedWalletTestimonialContact
                ? `Leave a testimonial for ${requestedWalletTestimonialContact.fullName}`
                : "Leave a testimonial"}
            </CardTitle>
            <CardDescription>
              {testimonialForCardId
                ? "Your selected Circle Card is ready below."
                : "Search your wallet to leave a testimonial."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CircleCardWalletTestimonialForm
              contacts={walletTestimonialContacts}
              initialTargetCardId={testimonialForCardId}
            />
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
                            <input type="hidden" name="returnPath" value={circleCardSectionHref("network", "connect-hub")} />
                            <Button type="submit" size="sm" className="w-full gap-2">
                              <UserCheck size={14} />
                              Accept
                            </Button>
                          </form>
                          <form action={declineCircleCardConnectionRequestAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="returnPath" value={circleCardSectionHref("network", "connect-hub")} />
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
                            <input type="hidden" name="returnPath" value={circleCardSectionHref("network", "connect-hub")} />
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
                    <Button type="button" variant="outline">Explore Circle Card</Button>
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
                        {Object.entries(selectedWalletContact.socialLinks).filter(
                          (entry): entry is [string, string] => typeof entry[1] === "string"
                        ).length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(selectedWalletContact.socialLinks)
                              .filter((entry): entry is [string, string] => typeof entry[1] === "string")
                              .map(([key, value]) => (
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
        appSection="settings"
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
                <CardDescription>Manage the public slug, layout and publishing state for this Circle Card.</CardDescription>
              </CardHeader>
              <CardContent>
                {card ? (
                  <CircleCardSaveForm
                    id="circle-card-settings-form"
                    action={upsertCircleCardAction}
                    existingCardId={card.id}
                    className="space-y-4"
                    noValidate
                  >
                    <input
                      type="hidden"
                      name="returnPath"
                      value={circleCardManageHref({
                        cardId: card.id,
                        section: "settings",
                        hash: "circle-card-settings"
                      })}
                    />
                    <input type="hidden" name="cardId" value={card.id} />
                    <input type="hidden" name="cardType" value={card.cardType} />
                    <input type="hidden" name="fullName" value={card.fullName} />
                    <input type="hidden" name="businessName" value={card.businessName ?? ""} />
                    <input type="hidden" name="accountType" value={card.accountType ?? ""} />
                    {card.identityTags.map((identityTag) => (
                      <input key={identityTag} type="hidden" name="identityTags" value={identityTag} />
                    ))}
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
                    <input type="hidden" name="socialLinksJson" value={JSON.stringify(socialLinkItems)} />

                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
                      Settings for: {currentCardDisplayName}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_260px]">
                      <div className="space-y-2">
                        <Label htmlFor="settings-slug">Public slug</Label>
                        <Input id="settings-slug" name="slug" defaultValue={card.slug} placeholder="your-name" />
                        <p className="break-all text-xs text-muted">
                          Public URL for {currentCardDisplayName}: {publicUrl ?? absoluteUrl(`/card/${card.slug}`)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="settings-profileLayout">Profile layout</Label>
                        <Select
                          id="settings-profileLayout"
                          name="profileLayout"
                          defaultValue={card.profileLayout}
                        >
                          {CIRCLE_CARD_PROFILE_LAYOUTS.map((layout) => (
                            <option key={layout} value={layout}>
                              {CIRCLE_CARD_PROFILE_LAYOUT_COPY[layout].label}
                            </option>
                          ))}
                        </Select>
                        <p className="text-xs text-muted">
                          Presentation only. Your wallet and relationship tools stay the same.
                        </p>
                      </div>
                      <label
                        htmlFor="settings-isPublished"
                        className="flex min-h-11 items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
                      >
                        <CircleCardVisibilityCheckbox
                          id="settings-isPublished"
                          defaultChecked={card.isPublished}
                          isDefaultCard={Boolean(card.isDefaultCard || card.isPrimary)}
                          isOnlyLiveCard={card.isPublished && liveCardCount === 1}
                        />
                        <span>
                          Live
                          <span className="mt-1 block text-xs text-muted">
                            Hidden cards are not available at their public /card link or switcher.
                          </span>
                        </span>
                      </label>
                      <label
                        htmlFor="settings-showInDiscover"
                        className="flex min-h-11 items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
                      >
                        <input
                          id="settings-showInDiscover"
                          name="showInDiscover"
                          type="checkbox"
                          value="on"
                          defaultChecked={card.showInDiscover}
                          className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                        />
                        <span>
                          Show my Circle Card in Discover
                          <span className="mt-1 block text-xs text-muted">
                            {CIRCLE_CARD_DISCOVER_SETTING_COPY}
                          </span>
                        </span>
                      </label>
                    </div>

                    <div className="rounded-2xl border border-silver/14 bg-background/18 p-4 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "normal-case tracking-normal",
                            card.showInDiscover
                              ? "border-gold/28 text-gold"
                              : "border-silver/18 text-silver"
                          )}
                        >
                          {card.showInDiscover
                            ? CIRCLE_CARD_DISCOVER_VISIBLE_LABEL
                            : CIRCLE_CARD_DISCOVER_HIDDEN_LABEL}
                        </Badge>
                        <span className="text-muted">
                          Discover visibility is separate from your public card link.
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <CircleCardSubmitButton className="gap-2" pendingLabel="Saving...">
                        <Save size={16} />
                        Save Settings
                      </CircleCardSubmitButton>
                      <Link href={circleCardManageHref({ cardId: card.id, section: "my-card", hash: "card-identity" })} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                        Edit Full Card
                        <ArrowUpRight size={16} />
                      </Link>
                    </div>
                  </CircleCardSaveForm>
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
                <Link href={card ? circleCardManageHref({ cardId: card.id, section: "share", hash: "share-assets" }) : circleCardSectionHref("share", "share-assets")} className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}>
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
      <BackToTopButton />
    </div>
  );
}
