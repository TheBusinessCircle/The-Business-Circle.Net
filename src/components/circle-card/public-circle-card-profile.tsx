import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import {
  removeCircleWalletContactAction,
  saveCircleWalletContactAction
} from "@/actions/circle-card.actions";
import { BrandMark } from "@/components/branding/brand-mark";
import { CircleCardInstallPrompt } from "@/components/circle-card/circle-card-install-prompt";
import { CircleCardQrPanel } from "@/components/circle-card/circle-card-qr-panel";
import { CircleCardShareButton } from "@/components/circle-card/circle-card-share-button";
import { CircleCardTrackedLink } from "@/components/circle-card/circle-card-tracked-link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CircleCardEventTypeValue } from "@/lib/circle-card/analytics-events";
import { getExternalLinkProps } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { PublicCircleCard } from "@/server/circle-card";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe2,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  UserRound,
  WalletCards
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

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  x: "X"
};

const premiumPrimaryActionClassName =
  "h-12 w-full rounded-2xl border border-gold/45 bg-[linear-gradient(135deg,#f0cf88_0%,#d3aa58_48%,#a9782e_100%)] text-[#061126] shadow-[0_18px_44px_rgba(211,170,88,0.2)] hover:border-gold/70 hover:bg-gold hover:text-[#061126]";

const premiumSecondaryActionClassName =
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

function displayHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function socialLabel(key: string) {
  return SOCIAL_LABELS[key] ?? key.replace(/[-_]+/g, " ");
}

function roleLine(card: PublicCircleCard) {
  return [card.role, card.businessName].filter(Boolean).join(" at ");
}

function CircleCardBadgeMark() {
  return (
    <span className="absolute -bottom-1 right-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/55 bg-[#061126] text-[11px] font-semibold text-gold shadow-[0_0_26px_rgba(64,112,255,0.22)]">
      CC
      <span className="sr-only">Circle Card badge</span>
    </span>
  );
}

type ContactActionProps = {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
  anchorProps?: AnchorHTMLAttributes<HTMLAnchorElement>;
  analyticsCardId?: string;
  eventType?: CircleCardEventTypeValue;
  metadata?: Record<string, unknown>;
};

function ContactAction({
  icon,
  label,
  value,
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
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/18 bg-gold/10 text-gold">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-muted">{label}</span>
          <span className="block truncate text-sm font-medium text-foreground">{value}</span>
        </span>
      </span>
      {href ? (
        <ExternalLink
          size={15}
          aria-hidden="true"
          className="shrink-0 text-silver transition-colors group-hover:text-gold"
        />
      ) : null}
    </>
  );

  if (href && eventType && analyticsCardId) {
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

  if (href) {
    return (
      <a {...anchorProps} href={href} className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

type TrustSignalProps = {
  icon: ReactNode;
  title: string;
  text: string;
  highlight?: boolean;
};

function TrustSignal({ icon, title, text, highlight = false }: TrustSignalProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-3",
        highlight
          ? "border-gold/24 bg-gold/10"
          : "border-silver/14 bg-white/[0.035]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
          highlight ? "border-gold/24 text-gold" : "border-silver/14 text-silver"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">{text}</span>
      </span>
    </div>
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
  const socialLinks = Object.entries(card.socialLinks).filter((entry): entry is [string, string] =>
    Boolean(entry[1])
  );
  const noticeMessage = notice ? NOTICE_MESSAGES[notice] : null;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;
  const viewLabel = card.isDemo ? "Demo card" : `${card.viewCount + 1} public views`;

  function renderWalletAction({ mobileBar = false }: { mobileBar?: boolean } = {}) {
    const iconSize = mobileBar ? 15 : 16;
    const actionClassName = mobileBar
      ? mobileActionClassName
      : cn(premiumSecondaryActionClassName, "gap-2");

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
          <Button
            type="submit"
            className={actionClassName}
          >
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
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(47,109,255,0.22),transparent_34%),linear-gradient(180deg,#030813_0%,#071126_46%,#030712_100%)]"
      />

      <div className="public-page-stack relative max-w-6xl pt-4 sm:pt-6 lg:pt-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/circle-card"
            className="inline-flex min-w-0 items-center gap-3 rounded-full border border-silver/12 bg-white/[0.035] px-3 py-2 shadow-inner-surface backdrop-blur"
          >
            <BrandMark placement="workspace" className="h-9 w-9 border-gold/45" shine />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Circle Card</span>
              <span className="block text-xs text-muted">The Business Circle</span>
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

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <article
            aria-labelledby="circle-card-profile-title"
            className="relative overflow-hidden rounded-[2rem] border border-gold/24 bg-[radial-gradient(circle_at_50%_0%,rgba(47,109,255,0.2),transparent_34%),linear-gradient(160deg,rgba(10,25,58,0.92),rgba(4,10,24,0.96)_54%,rgba(3,7,16,0.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_70px_rgba(47,109,255,0.12)] sm:p-7"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,95,0.72),rgba(75,126,255,0.45),transparent)]"
            />

            <div className="relative z-10">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="grid h-32 w-32 place-items-center rounded-full border border-gold/55 bg-gold/12 p-1 shadow-[0_0_0_8px_rgba(212,175,95,0.05),0_0_52px_rgba(47,109,255,0.24)] sm:h-40 sm:w-40">
                    <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#071126] text-3xl font-semibold text-foreground">
                      {card.profileImageUrl ? (
                        <img
                          src={card.profileImageUrl}
                          alt={card.fullName}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <span>{initials(card.fullName)}</span>
                      )}
                    </div>
                  </div>
                  <CircleCardBadgeMark />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/28 bg-gold/12 px-3 py-1 text-xs font-medium text-gold">
                  <Sparkles size={13} />
                  Circle Card
                </span>
                <span className="inline-flex rounded-full border border-silver/16 bg-white/[0.04] px-3 py-1 text-xs font-medium text-silver">
                  {ownerAccountLabel}
                </span>
                {ownerIsBcnMember ? (
                  <span className="inline-flex rounded-full border border-[#3f7cff]/28 bg-[#1e5bff]/12 px-3 py-1 text-xs font-medium text-[#d8e6ff]">
                    BCN Member
                  </span>
                ) : null}
              </div>

              <div className="mx-auto mt-5 max-w-2xl text-center">
                <h1
                  id="circle-card-profile-title"
                  className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl"
                >
                  {card.fullName}
                </h1>

                {displayRole ? (
                  <p className="mt-3 inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-silver/12 bg-white/[0.035] px-3 py-1.5 text-sm text-silver">
                    <BriefcaseBusiness size={15} className="shrink-0 text-gold" />
                    <span className="truncate">{displayRole}</span>
                  </p>
                ) : null}

                {card.tagline ? (
                  <p className="mt-5 text-xl font-medium leading-snug text-foreground sm:text-2xl">
                    {card.tagline}
                  </p>
                ) : null}

                {card.about ? (
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
                    {card.about}
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

              <section aria-labelledby="circle-card-contact-title" className="mt-7">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 id="circle-card-contact-title" className="text-sm font-semibold text-foreground">
                    Contact
                  </h2>
                  <span className="text-xs text-muted">Only shared details are shown</span>
                </div>

                <div className="grid gap-2">
                  {card.websiteUrl ? (
                    <ContactAction
                      icon={<Globe2 size={17} />}
                      label="Website"
                      value={displayHost(card.websiteUrl)}
                      href={card.websiteUrl}
                      anchorProps={getExternalLinkProps(card.websiteUrl)}
                      analyticsCardId={analyticsCardId}
                      eventType="WEBSITE_CLICK"
                      metadata={{ source: "public_card" }}
                    />
                  ) : null}

                  {socialLinks.map(([label, href]) => (
                    <ContactAction
                      key={label}
                      icon={<ExternalLink size={16} />}
                      label={socialLabel(label)}
                      value={displayHost(href)}
                      href={href}
                      anchorProps={getExternalLinkProps(href)}
                    />
                  ))}

                  {card.email ? (
                    <ContactAction
                      icon={<Mail size={17} />}
                      label="Email"
                      value={card.email}
                      href={`mailto:${card.email}`}
                      analyticsCardId={analyticsCardId}
                      eventType="EMAIL_CLICK"
                      metadata={{ source: "public_card" }}
                    />
                  ) : null}

                  {telHref ? (
                    <ContactAction
                      icon={<Phone size={17} />}
                      label="Phone"
                      value={card.phone ?? "Call"}
                      href={telHref}
                      analyticsCardId={analyticsCardId}
                      eventType="PHONE_CLICK"
                      metadata={{ source: "public_card" }}
                    />
                  ) : null}

                  {card.location ? (
                    <ContactAction
                      icon={<MapPin size={17} />}
                      label="Location"
                      value={card.location}
                    />
                  ) : null}
                </div>
              </section>
            </div>
          </article>

          <section id="qr" aria-label="Circle Card QR code" className="scroll-mt-24 lg:row-span-1">
            <CircleCardQrPanel
              publicUrl={publicUrl}
              slug={card.slug}
              label="Scan to save or share this card"
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
            aria-label="Circle Card actions"
            className="rounded-[1.75rem] border border-gold/22 bg-[linear-gradient(145deg,rgba(8,19,43,0.9),rgba(4,10,24,0.96))] p-4 shadow-[0_22px_58px_rgba(0,0,0,0.32)] sm:p-5 lg:col-start-1"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <a
                href={`/card/${card.slug}/vcard`}
                className={cn(buttonVariants(), premiumPrimaryActionClassName, "gap-2")}
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
                buttonClassName={cn(premiumSecondaryActionClassName, "gap-2")}
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

          <aside
            aria-label="Circle Card trust"
            className="rounded-[1.75rem] border border-silver/14 bg-[linear-gradient(145deg,rgba(9,20,45,0.86),rgba(4,10,24,0.94))] p-5 shadow-panel-soft lg:col-start-2"
          >
            <div className="flex items-center gap-3">
              <BrandMark placement="workspace" className="h-11 w-11 border-gold/40" shine />
              <div>
                <p className="text-sm font-semibold text-foreground">Trusted identity layer</p>
                <p className="text-xs text-muted">Powered by The Business Circle</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <TrustSignal
                icon={<Star size={16} />}
                title="Circle Card badge"
                text="Part of The Business Circle relationship layer."
                highlight
              />
              {ownerIsBcnMember ? (
                <TrustSignal
                  icon={<ShieldCheck size={16} />}
                  title="BCN Member"
                  text="Linked to an active Business Circle membership."
                />
              ) : (
                <TrustSignal
                  icon={<ShieldCheck size={16} />}
                  title={ownerAccountLabel}
                  text="A Circle Card account inside The Business Circle ecosystem."
                />
              )}
              <TrustSignal
                icon={<BadgeCheck size={16} />}
                title="Founder verification"
                text="Prepared for manual founder verification."
              />
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
