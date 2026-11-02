import { BusinessDirectoryFields } from "@/components/circle-card/business-directory-fields";
import { HUCKNALL_HUB_PATH } from "@/lib/circle-card/local-hubs";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
  CircleCardBillingStatusPanel,
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
  CircleCardAuthoritativeProAnalytics,
  CircleCardProCheckoutButtons,
  CircleCardPressProofManager,
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
  CircleTrustProgressPanel,
  CircleCardVisibilityCheckbox,
  CircleCardVisibilityToggle,
  CircleCardWalletTestimonialForm,
  type CircleCardPendingWalletTestimonial
} from "@/components/circle-card";
import {
  CircleCardPlatformOwnerCardTypePreviewModules,
  CircleCardPlatformOwnerCardTypePreviewSwitcher,
  CircleCardPlatformOwnerFeatureMatrixLite,
  CircleCardPlatformOwnerPreviewSwitcher,
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
import {
  circleCardFileActionLabel,
  circleCardFileKindLabel,
  detectCircleCardFileKind,
  resolveCircleCardFileAction
} from "@/lib/circle-card/file-actions";
import { calculateFirstCircleCardReadiness } from "@/lib/circle-card/first-card-readiness";
import {
  canCreateCircleCard,
  getCircleCardFeatureAccess
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
  CIRCLE_CARD_CURRENT_CARD_COOKIE,
  normalizeCircleCardCurrentCardId
} from "@/lib/circle-card/current-card-preference";
import {
  buildCircleCardProHref,
  circleCardProCapabilityLabel,
  normalizeCircleCardProIntent,
  type CircleCardProCapability
} from "@/lib/circle-card/pro-intent";
import {
  CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT,
  CIRCLE_CARD_PLAN_DEFINITIONS,
  type CircleCardPlanFeature
} from "@/lib/circle-card/plans";
import {
  CIRCLE_CARD_LINK_PLAN_ORDER,
  isCircleCardLinkEligibleForPublicLaunch,
  selectCircleCardLinksWithinPlan,
  selectCircleCardsWithinPlan
} from "@/lib/circle-card/plan-policy";
import {
  canUserStartCircleCardCheckout,
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
  buildCircleTrustSummary,
  type CircleTrustSummary,
  type CircleTrustTestimonial
} from "@/lib/circle-card/circle-trust";
import {
  calculateCreatorProfileCompletion,
  resolveCreatorStudioMode,
  type CreatorProfileCompletionItemId,
  type CreatorStudioMode
} from "@/lib/circle-card/creator-profile-foundation";
import { signOutAction } from "@/lib/actions/auth-actions";
import {
  CIRCLE_CARD_RECOMMENDATION_CATEGORIES,
  circleCardRecommendationVisibil…12152 tokens truncated…{cn(buttonVariants({ variant: "outline" }), "h-10 min-w-0 justify-center gap-1.5 px-2 text-xs sm:text-sm")}
                  >
                    <Eye size={15} />
                    Public Card
                  </Link>
                ) : (
                  <Button type="button" variant="outline" disabled className="h-10 min-w-0 gap-1.5 px-2 text-xs sm:text-sm">
                    <Eye size={15} />
                    Public Card
                  </Button>
                )}
                <Link
                  href={card ? `/dashboard/circle-card/studio?card=${card.id}` : "/dashboard/circle-card/studio"}
                  className={cn(buttonVariants({ variant: "outline" }), "h-10 min-w-0 justify-center gap-1.5 px-2 text-xs sm:text-sm")}
                >
                  <Sparkles size={15} />
                  Studio
                </Link>
                <Link href="/dashboard/circle-card/wallet" className={cn(buttonVariants({ variant: "outline" }), "h-10 min-w-0 justify-center gap-1.5 px-2 text-xs sm:text-sm")}>
                  <WalletCards size={15} />
                  Wallet
                </Link>
                <Link href={circleCardSectionHref("my-card", "circle-trust")} className={cn(buttonVariants({ variant: "outline" }), "h-10 min-w-0 justify-center gap-1.5 px-2 text-xs sm:text-sm")}>
                  <ShieldCheck size={15} />
                  Trust
                </Link>
                <Link href={circleCardSectionHref("referrals", "referral-centre")} className={cn(buttonVariants({ variant: "outline" }), "h-10 min-w-0 justify-center gap-1.5 px-2 text-xs sm:text-sm")}>
                  <Send size={15} />
                  Referrals
                </Link>
                <Link href={circleCardSectionHref("settings", "circle-card-settings")} className={cn(buttonVariants({ variant: "outline" }), "h-10 min-w-0 justify-center gap-1.5 px-2 text-xs sm:text-sm")}>
                  <MenuIcon size={15} />
                  Settings
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{accountLabel}</Badge>
            <Badge variant="outline" className="border-silver/18 text-silver">
              {activeCardLimitLabel}
            </Badge>
          </div>
        </div>
      </section>

      {showCircleCardProSuccess ? (
        <section className="rounded-2xl border border-emerald-400/28 bg-emerald-400/10 p-4 sm:p-5">
          <CircleCardAuthoritativeProAnalytics capability={confirmedProCapability} />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge variant="outline" className="border-emerald-400/30 text-emerald-100">
                Circle Card Pro is active.
              </Badge>
              <h2 className="mt-3 font-display text-2xl text-foreground">
                Your Pro workspace is ready.
              </h2>
              <p className="mt-2 text-sm text-muted">Unlocked: {circleCardProCapabilityLabel(confirmedProCapability)}. Access is confirmed from the server, not the return URL.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href={card ? `/dashboard/circle-card/studio?card=${card.id}` : "/dashboard/circle-card/studio"}
                className={cn(buttonVariants(), "justify-center gap-2")}
              >
                <Sparkles size={15} />
                Open Circle Studio
              </Link>
              <Link
                href={card ? circleCardManageHref({ cardId: card.id, section: "my-card", hash: "circle-card-form" }) : circleCardSectionHref("my-card", "circle-card-form")}
                className={cn(buttonVariants({ variant: "outline" }), "justify-center gap-2")}
              >
                <ContactRound size={15} />
                Edit your card
              </Link>
              {card ? (
                <Link
                  href={`/card/${card.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }), "justify-center gap-2")}
                >
                  <Eye size={15} />
                  View public card
                </Link>
              ) : null}
              <Link
                href={circleCardSectionHref("referrals", "referral-centre")}
                className={cn(buttonVariants({ variant: "outline" }), "justify-center gap-2")}
              >
                <Send size={15} />
                Referral Centre
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <CircleCardInstallPrompt showManualFallback />

      <nav
        aria-label="Circle Card sections"
        className="sticky top-16 z-20 -mx-2 border-y border-silver/12 bg-background/92 px-2 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:bg-card/78"
      >
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 sm:gap-2">
          {appSectionItems.map((item) => {
            const Icon = item.icon;
            const selected =
              activeSection === item.section &&
              ((item.section === "home" && item.targetId === "circle-card-home") ||
                (item.section === "my-card" && item.targetId === "my-cards") ||
                item.section === "business" ||
                item.section === "referrals" ||
                item.section === "settings");

            return (
              <Link
                key={item.section}
                href={
                  item.href ?? (card
                    ? circleCardManageHref({ cardId: card.id, section: item.section, hash: item.targetId })
                    : circleCardSectionHref(item.section, item.targetId))
                }
                data-circle-card-section-tab={item.section}
                data-circle-card-target-tab={item.targetId}
                data-active={selected ? "true" : "false"}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-silver/14 bg-background/25 px-1 text-[10px] font-medium text-muted transition-colors hover:border-silver/30 hover:text-foreground sm:h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-xs",
                  "data-[active=true]:border-gold/42 data-[active=true]:bg-gold/14 data-[active=true]:text-gold data-[active=true]:shadow-inner-surface"
                )}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="hidden rounded-full border border-gold/24 bg-gold/12 px-2 py-0.5 text-[11px] text-gold sm:inline-flex">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {isPlatformOwner ? <CircleCardPlatformOwnerSandboxIndicator /> : null}

      <CircleCardDashboardSection
        id="my-cards"
        title="Your Cards"
        summary="Your identities, public links and sharing tools."
        appSection="my-card"
        className={cn(
          "border-gold/20 bg-[linear-gradient(145deg,hsl(var(--card)/0.78),hsl(var(--background)/0.42))]",
          activeSection !== "my-card" && "hidden"
        )}
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
                const lockedByPlan = !planAllowedCardIds.has(ownedCard.id);
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
                      "data-[active=true]:border-gold/42 data-[active=true]:bg-gold/8",
                      lockedByPlan && "border-silver/14 bg-background/18"
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
                            {lockedByPlan ? (
                              <Badge variant="outline" className="gap-1 border-gold/28 text-gold">
                                <Lock size={12} /> Locked by plan
                              </Badge>
                            ) : null}
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
                      {ownedCard.isPublished && !lockedByPlan ? (
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
                        {lockedByPlan ? "View saved" : selected ? "Editing" : "Edit"}
                      </Link>
                      {ownedCard.isPublished && !lockedByPlan ? (
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
                        {ownedCard.isPublished && !lockedByPlan ? (
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
                        {lockedByPlan ? (
                          <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2" disabled>
                            <Lock size={14} /> Private while plan-locked
                          </Button>
                        ) : (
                          <CircleCardVisibilityToggle
                            cardId={ownedCard.id}
                            isPublished={ownedCard.isPublished}
                            isDefaultCard={Boolean(ownedCard.isDefaultCard || ownedCard.isPrimary)}
                            isOnlyLiveCard={ownedCard.isPublished && liveCardCount === 1}
                            returnPath={manageReturnPath}
                          />
                        )}
                        <form action={setDefaultCircleCardAction}>
                          <input type="hidden" name="cardId" value={ownedCard.id} />
                          <input type="hidden" name="returnPath" value={manageReturnPath} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="h-10 w-full gap-2"
                            disabled={lockedByPlan || ownedCard.isDefaultCard || !ownedCard.isPublished}
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
                Create your first Circle Card to open your card editor and public sharing tools.
              </div>
            )}
          </div>

          <aside className="space-y-3 rounded-2xl border border-border/80 bg-background/24 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Plan limit</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {circleCardEntitlement.label} allows {featureAccess.cardLimit} active Circle Card
                {featureAccess.cardLimit === 1 ? "" : "s"} in your Circle Card workspace.
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
                  Your default card stays public. Saved extra cards are kept privately and become
                  read-only until the plan that includes them is restored.
                </p>
                <CircleCardProCheckoutButtons monthlyLabel="£9.99/month" billingEnabled={circleCardCheckoutAvailable} authenticated intent={{ source: "second_card", capability: "create_second_card", returnPath: createCardHref }} label="Create a second card with Pro" earlyAccessLabel="Register for a second card" showPrice={false} className="mt-3" />
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

      {card && isSelectedCardLockedByPlan ? (
        <div
          role="status"
          data-circle-card-section="my-card"
          className={cn(
            "rounded-2xl border border-gold/24 bg-gold/[.08] p-4 text-sm",
            activeSection !== "my-card" && "hidden"
          )}
        >
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <Lock size={15} className="text-gold" /> Saved extra card locked by plan
          </p>
          <p className="mt-1 leading-relaxed text-muted">
            This card and all of its content are preserved privately. It is read-only and excluded
            from public rendering until Circle Card Pro is restored.
          </p>
        </div>
      ) : null}

      {card && selectedCardTrust ? (
        <CircleCardDashboardSection
          id="circle-trust"
          title="Circle Trust"
          summary="Build trust through verified relationships and clear Trust Signals."
          appSection="my-card"
          className={cn(
            "border-gold/20 bg-[radial-gradient(circle_at_top_right,hsl(var(--gold)/0.1),transparent_34%),hsl(var(--card)/0.62)]",
            activeSection !== "my-card" && "hidden"
          )}
          badge={
            <Badge variant="outline" className="border-gold/28 text-gold">
              {selectedCardTrust.score} Trust Score
            </Badge>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">
                Trusted by your Circle
              </p>
              <h2 className="mt-2 font-display text-2xl text-foreground">Build your Circle Trust</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Your Trust Signals come from real platform activity, verified connections and approved relationship proof.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["Trust Signals", selectedCardTrust.signals.length],
                  ["Connections", selectedCardTrust.verifiedConnectionCount],
                  ["Testimonials", selectedCardTrust.verifiedTestimonialCount]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-silver/12 bg-background/22 p-3">
                    <p className="font-display text-xl text-foreground">{value}</p>
                    <p className="mt-1 text-[11px] text-muted sm:text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-52 lg:grid-cols-1">
              <Link
                href={
                  card.cardType === "BUSINESS"
                    ? circleCardManageHref({ cardId: card.id, section: "business", hash: "business-card-builder" })
                    : card.cardType === "CREATOR"
                      ? circleCardManageHref({ cardId: card.id, section: "my-card", hash: "creator-pro-studio" })
                      : circleCardManageHref({ cardId: card.id, section: "my-card", hash: "circle-card-form" })
                }
                className={cn(buttonVariants(), "w-full gap-2")}
              >
                <ShieldCheck size={15} />
                Build Trust
              </Link>
              {card.isPublished ? (
                <Link href={`/card/${card.slug}/trust`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}>
                  View Trust
                  <ArrowUpRight size={14} />
                </Link>
              ) : null}
            </div>
          </div>
        </CircleCardDashboardSection>
      ) : null}

      {!isPlatformOwner && card && publicUrl ? (
        <div
          data-circle-card-section="my-card"
          className={activeSection === "my-card" ? undefined : "hidden"}
        >
          <CircleCardSetupChecklistPanel
            cardId={card.id}
            fullName={card.fullName}
            publicUrl={publicUrl}
            setupItems={setupChecklistItems}
            created={created || notice === "card-created"}
          />
        </div>
      ) : null}

      <CircleCardDashboardSection
        id="circle-card-plan"
        title="Plan and access"
        summary="Current limits, included capabilities and upgrade previews."
        appSection="settings"
        className={activeSection === "settings" ? undefined : "hidden"}
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
        <CircleCardBillingStatusPanel
          access={actualCircleCardAccess}
          billingEnabled={circleCardCheckoutAvailable}
        />
      </CircleCardDashboardSection>

      {showPlatformOwnerDiagnostics ? (
        <details
          id="owner-tools"
          className="group scroll-mt-24 overflow-hidden rounded-2xl border border-gold/20 bg-card/58 shadow-panel-soft"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden sm:px-5 sm:py-4">
            <span>
              <span className="font-display text-lg font-semibold text-foreground">Owner Tools</span>
              <span className="mt-1 block text-xs text-muted">Platform preview, safety and diagnostics</span>
            </span>
            <ChevronDown size={17} className="shrink-0 text-gold transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-silver/12 p-3 sm:p-5">
            <details className="group/diagnostics rounded-xl border border-silver/14 bg-background/18">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-semibold text-foreground">Diagnostics</span>
                <Badge variant={isPlatformOwner ? "premium" : "outline"}>
                  {isPlatformOwner ? "Owner resolved" : "Owner hidden"}
                </Badge>
              </summary>
              <dl className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-2 xl:grid-cols-4">
                {platformOwnerDiagnosticItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/70 bg-card/42 p-3">
                    <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">{item.label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </details>

            <details className="group/commission rounded-xl border border-silver/14 bg-background/18">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-semibold text-foreground">Commission Monitor</span>
                <ChevronDown size={15} className="text-silver transition-transform group-open/commission:rotate-180" />
              </summary>
              <div className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-3">
                {[
                  ["Active Pro referrals", commissionEarnings?.activeProReferrals ?? 0],
                  ["Pending", formatCurrency((commissionEarnings?.pendingPence ?? 0) / 100)],
                  ["Paid", formatCurrency((commissionEarnings?.paidPence ?? 0) / 100)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border/70 bg-card/42 p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </details>

      {isPlatformOwner ? (
        <CircleCardDashboardSection
          id="platform-owner-control-centre"
          title="Platform Preview"
          summary="Owner-only preview, sandbox and launch controls."
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
                    Read-only system health using already-loaded Circle Card data and static config.
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
                    Direct launch links into existing Circle Card and owner surfaces.
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
          </div>
        </details>
      ) : null}

      <CircleCardDashboardSection
        id="circle-card-upgrade-signals"
        title="Growth and upgrade signals"
        summary="Usage-based guidance for when Pro or Teams may become useful."
        appSection="settings"
        className={activeSection === "settings" ? undefined : "hidden"}
        badge={<Badge variant="muted">Advanced</Badge>}
      >
        <CircleCardUpgradeSignalsPanel
          metrics={circleCardUsageMetrics}
          proTriggers={circleCardUpgradeTriggers.pro}
        />
      </CircleCardDashboardSection>

      {isPlatformOwner && card && publicUrl ? (
        <div
          data-circle-card-section="my-card"
          className={activeSection === "my-card" ? undefined : "hidden"}
        >
          <CircleCardSetupChecklistPanel
            cardId={card.id}
            fullName={card.fullName}
            publicUrl={publicUrl}
            setupItems={setupChecklistItems}
            created={created || notice === "card-created"}
          />
        </div>
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

      <CircleCardDashboardSection
        id="circle-card-home"
        title="Circle Card Home"
        summary="Activity and signals that need attention."
        appSection="home"
        defaultOpen
        className={activeSection === "home" ? undefined : "hidden"}
        badge={
          <Badge variant="outline" className="border-gold/28 text-gold">
            {card?.isPublished ? "Published" : card ? "Unpublished" : "Setup needed"}
          </Badge>
        }
      >
        <div className="space-y-4">
          <Card className="border-silver/16 bg-background/20 shadow-none">
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

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {homeQuickStats.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-xl border border-silver/14 bg-card/54 p-3 transition-colors hover:border-gold/28 hover:bg-card/72 sm:rounded-2xl sm:p-4"
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
      </CircleCardDashboardSection>

      <CircleCardDashboardSection
        id="referral-centre"
        title="Referrals"
        summary="Share Circle Card with people who would benefit from a cleaner way to connect"
        appSection="referrals"
        className={activeSection === "referrals" ? undefined : "hidden"}
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
                  <div className="rounded-2xl border border-gold/22 bg-gradient-to-br from-gold/12 via-card/72 to-background/28 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.16)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">Circle Card Pro earnings</p>
                      {commissionEarnings?.isFoundingAmbassador ? (
                        <Badge className="border-gold/30 bg-gold/12 text-gold">Founding Ambassador</Badge>
                      ) : (
                        <Badge variant="outline" className="border-silver/18 text-silver">Standard</Badge>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {[
                        ["Total referred", commissionEarnings?.totalReferredUsers ?? 0],
                        ["Active Pro", commissionEarnings?.activeProReferrals ?? 0],
                        ["Estimated monthly", formatCurrency((commissionEarnings?.estimatedMonthlyPence ?? 0) / 100)],
                        ["Pending", formatCurrency((commissionEarnings?.pendingPence ?? 0) / 100)],
                        ["Paid", formatCurrency((commissionEarnings?.paidPence ?? 0) / 100)]
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0 rounded-xl border border-silver/12 bg-background/22 p-3 last:col-span-2">
                          <p className="text-[11px] text-muted">{label}</p>
                          <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      {commissionEarnings?.isFoundingAmbassador
                        ? "First 10 active Pro referrals at £3/month, next 5 at £2/month, then £1/month."
                        : "£1/month for each active referred Pro user."}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-silver">
                      {commissionEarnings?.notice ?? referralCentre.rewardAwareness.statusLabel} Pending does not mean paid. No payout is automatic.
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
                Introductions are private Circle Card activity. They are not shown on public Circle Cards.
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
              <fieldset disabled={isSelectedCardLockedByPlan} className="contents">

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
                          <BusinessDirectoryFields idPrefix="first-card-directory" />
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
                      Used in your private card workspace and the public card switcher.
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
                title="Circle Studio"
                summary="Your professionally designed Pro identity system"
              >
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-gold">
                  Styling: {currentCardDisplayName}
                </p>
                <CircleCardThemeFields
                  cardId={card?.id}
                  themeMetadata={card?.themeMetadata}
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

<BusinessDirectoryFields postcode={card?.businessPostcode} category={card?.businessCategory} />
<a href={HUCKNALL_HUB_PATH} className="text-sm text-gold underline">Explore Hucknall &amp; NG15 Circle Hub</a>
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
              </fieldset>
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
                  Circle Wallet.
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
                  Circle Insights
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
                    : "Pro is active from authoritative account access and opens the working presentation layer."}
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
                      Circle Studio activation, Media Kit and Audience Snapshot.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      {card && selectedCardTrust && showBusinessCardBuilder ? (
        <BusinessCardBuilderFoundation
          access={businessBuilderAccess}
          previewLabel={businessBuilderPreviewLabel}
          cardId={card.id}
          publicUrl={publicUrl ?? absoluteUrl(`/card/${card.slug}`)}
          billingEnabled={circleCardCheckoutAvailable}
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
          trust={selectedCardTrust}
          hasProAccess={!isCircleCardFree}
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
          className={activeSection === "business" ? undefined : "hidden"}
        />
      ) : null}

      {card && selectedCardTrust && creatorStudioMode !== "hidden" ? (
        <CreatorProStudio
          mode={creatorStudioMode}
          entitlementLabel={circleCardEntitlement.label}
          cardId={card.id}
          fullName={card.fullName}
          profileImageUrl={card.profileImageUrl}
          about={card.about}
          websiteUrl={card.websiteUrl}
          activeSocialProfileCount={activeSocialLinkCount}
          activeFeaturedLinkCount={activeCustomLinkCount}
          activeLinkTypes={customLinks.filter((link) => link.isActive).map((link) => link.type)}
          creatorTrustSignalCount={selectedCardCreatorTrustSignalCount}
          trust={selectedCardTrust}
          featuredContentItems={selectedCardFeaturedContentItems}
          creatorOffers={selectedCardCreatorOffers}
          pressProofItems={selectedCardPressProofItems}
          mediaKit={selectedCardMediaKit}
          audienceSnapshot={selectedCardAudienceSnapshot}
          brandPartnerships={selectedCardBrandPartnerships}
          publicUrl={publicUrl ?? absoluteUrl(`/card/${card.slug}`)}
          billingEnabled={circleCardCheckoutAvailable}
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
          {isSelectedCardLockedByPlan ? (
            <p className="rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-muted">
              Smart Profile Import is read-only for this saved extra card until Pro is restored.
            </p>
          ) : (
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
          )}
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
          {planHiddenActiveLinkCount > 0 ? (
            <div className="rounded-2xl border border-gold/22 bg-gold/[.07] p-4 text-sm">
              <p className="font-semibold text-foreground">
                {planHiddenActiveLinkCount} active link{planHiddenActiveLinkCount === 1 ? " is" : "s are"} hidden by the Free plan
              </p>
              <p className="mt-1 leading-relaxed text-muted">
                The first five eligible active links stay public in the order shown. Hidden links
                remain saved and return automatically when Pro is restored.
              </p>
              <CircleCardProCheckoutButtons monthlyLabel="£9.99/month" billingEnabled={circleCardCheckoutAvailable} authenticated intent={{ source: "link_limit", capability: "activate_more_links", cardId: card?.id, returnPath: card ? circleCardManageHref({ cardId: card.id, section: "my-card", hash: "custom-links" }) : "/dashboard/circle-card?section=my-card#custom-links" }} label="Activate more links with Pro" earlyAccessLabel="Register for more active links" showPrice={false} className="mt-3" />
            </div>
          ) : null}

        {card ? (
          <>
            {!isSelectedCardLockedByPlan ? (
              <CircleCardSmartLinkCreateForm
                cardId={card.id}
                sortOrder={customLinks.length}
                defaultActive={!freeActiveCustomLinkLimitReached}
                examples={CUSTOM_LINK_EXAMPLES}
                activeLimitLabel={`Free cards can keep up to ${CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT} active custom links.`}
              />
            ) : null}

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
                    isActive: customLink.isActive,
                    createdAt: customLink.createdAt.toISOString()
                  }))}
                  focusedLinkId={focusedCustomLinkId}
                  activeLinkLimit={actualCircleCardAccess.limits.activeLinks}
                  readOnly={isSelectedCardLockedByPlan}
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
        title="Circle Insights"
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
            Insights for: {currentCardDisplayName}
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
                    <CardTitle className="text-lg">Activity foundation</CardTitle>
                    <CardDescription>
                      These events keep today&apos;s analytics useful and provide a safe base for future insights.
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
                            Open Referrals
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
        badge={
          <Badge variant="outline" className="border-gold/28 text-gold">
            {card?.isPublished ? "Published" : card ? "Unpublished" : "Setup needed"}
          </Badge>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <CircleCardInstallPrompt variant="settings" showManualFallback />
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
<BusinessDirectoryFields postcode={card.businessPostcode} category={card.businessCategory} idPrefix="settings-directory" />
<a href={HUCKNALL_HUB_PATH} className="text-sm text-gold underline">View Hucknall &amp; NG15 Circle Hub</a>
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
                <CardDescription>Sign out of Circle Card on this device.</CardDescription>
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

