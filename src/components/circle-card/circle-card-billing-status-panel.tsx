import { AlertTriangle, CheckCircle2, Crown, ShieldCheck } from "lucide-react";
import { CircleCardBillingPortalButton } from "@/components/circle-card/circle-card-billing-portal-button";
import { CircleCardProCheckoutButtons } from "@/components/circle-card/circle-card-pro-checkout-buttons";
import { Badge } from "@/components/ui/badge";
import type { CircleCardAccessSnapshot } from "@/lib/circle-card/permissions";
import { cn } from "@/lib/utils";

type CircleCardBillingStatusTone = "neutral" | "success" | "warning";

export type CircleCardBillingStatusView = {
  label: string;
  title: string;
  description: string;
  tone: CircleCardBillingStatusTone;
  dateLabel: string | null;
  date: Date | null;
  showUpgrade: boolean;
  upgradeLabel: string;
};

function paidPlanLabel(access: CircleCardAccessSnapshot) {
  return access.plan === "TEAMS" ? "Circle Card Teams" : "Circle Card Pro";
}

export function buildCircleCardBillingStatusView(
  access: CircleCardAccessSnapshot
): CircleCardBillingStatusView {
  const planLabel = paidPlanLabel(access);
  const paidThrough = access.effectiveAccessEndsAt ?? access.accessEndsAt;

  switch (access.source) {
    case "admin":
      return {
        label: "Admin access",
        title: "Circle Card Pro is available",
        description:
          "Pro access is provided by your administrator. No standalone Circle Card renewal or cancellation applies to this access.",
        tone: "success",
        dateLabel: null,
        date: null,
        showUpgrade: false,
        upgradeLabel: "Explore Pro"
      };
    case "ambassador":
      return {
        label: "Ambassador access",
        title: "Circle Card Pro is included",
        description:
          "Your ambassador grant includes Pro. This is not a renewing standalone Circle Card subscription.",
        tone: "success",
        dateLabel: null,
        date: null,
        showUpgrade: false,
        upgradeLabel: "Explore Pro"
      };
    case "grandfathered":
      return {
        label: "Grandfathered access",
        title: "Circle Card Pro is included",
        description:
          "Your persisted access grant includes Pro. This is not a renewing standalone Circle Card subscription.",
        tone: "success",
        dateLabel: null,
        date: null,
        showUpgrade: false,
        upgradeLabel: "Explore Pro"
      };
    case "bcn_membership":
      return {
        label: "Included with BCN",
        title: "Circle Card Pro is included",
        description:
          "Your active BCN membership includes Circle Card Pro. BCN membership billing remains separate from Circle Card billing.",
        tone: "success",
        dateLabel: null,
        date: null,
        showUpgrade: false,
        upgradeLabel: "Explore Pro"
      };
    default:
      break;
  }

  switch (access.lifecycleStatus) {
    case "checkout_pending":
      return {
        label: "Checkout pending",
        title: "Pro payment is not confirmed yet",
        description:
          "No Pro access has been granted. Complete the existing checkout, or return after it expires to start again.",
        tone: "neutral",
        dateLabel: access.checkoutSessionExpiresAt ? "Checkout expires" : null,
        date: access.checkoutSessionExpiresAt,
        showUpgrade: true,
        upgradeLabel: "View Pro"
      };
    case "active":
      return {
        label: "Active",
        title: `${planLabel} is active`,
        description:
          "Paid access is confirmed from Stripe invoice evidence. Your BCN membership billing is unchanged.",
        tone: "success",
        dateLabel: paidThrough ? "Paid access confirmed through" : null,
        date: paidThrough,
        showUpgrade: false,
        upgradeLabel: "Explore Pro"
      };
    case "cancelling": {
      const confirmedEnd = access.effectiveAccessEndsAt ?? access.accessEndsAt;
      const cancellationDate =
        confirmedEnd && access.cancellationEffectiveAt
          ? new Date(
              Math.min(confirmedEnd.getTime(), access.cancellationEffectiveAt.getTime())
            )
          : confirmedEnd;
      return {
        label: "Cancelling",
        title: `${planLabel} remains active`,
        description:
          "Cancellation is scheduled. Pro stays available through the confirmed paid period, then the account returns to Free without deleting saved content.",
        tone: "neutral",
        dateLabel: cancellationDate ? "Pro access ends" : null,
        date: cancellationDate,
        showUpgrade: false,
        upgradeLabel: "Explore Pro"
      };
    }
    case "past_due_grace": {
      const graceEndsAt = access.recoveryGraceEndsAt ?? paidThrough;
      return {
        label: "Payment needs attention",
        title: `${planLabel} is in recovery grace`,
        description:
          "A payment failed, but there is time to put it right. Pro remains available through the recovery deadline, your content stays preserved, and the billing portal is ready when you want to update payment details.",
        tone: "warning",
        dateLabel: graceEndsAt ? "Recovery access ends" : null,
        date: graceEndsAt,
        showUpgrade: false,
        upgradeLabel: "Explore Pro"
      };
    }
    case "payment_failed":
      return {
        label: "Payment failed",
        title: "Circle Card is on Free",
        description:
          "The paid period and recovery grace have ended. Saved cards, links, and Studio settings remain stored and can be restored with future Pro access.",
        tone: "warning",
        dateLabel: paidThrough ? "Paid access ended" : null,
        date: paidThrough,
        showUpgrade: true,
        upgradeLabel: "Restore Pro"
      };
    case "expired":
      return {
        label: "Expired",
        title: "Circle Card is on Free",
        description:
          "Pro access has ended. Saved Pro content remains stored, while public presentation safely follows Free limits.",
        tone: "neutral",
        dateLabel: paidThrough ? "Pro access ended" : null,
        date: paidThrough,
        showUpgrade: true,
        upgradeLabel: "Restore Pro"
      };
    case "paused":
      return {
        label: "Paused",
        title: "Circle Card is on Free",
        description:
          "The subscription is paused, so Pro is not active. Saved Pro content remains stored and public presentation follows Free limits.",
        tone: "neutral",
        dateLabel: paidThrough ? "Last confirmed paid access" : null,
        date: paidThrough,
        showUpgrade: true,
        upgradeLabel: "View Pro"
      };
    case "incomplete":
      return {
        label: "Payment incomplete",
        title: "Circle Card is on Free",
        description:
          "Payment has not produced confirmed paid access. Saved content remains available under Free limits until payment is confirmed.",
        tone: "warning",
        dateLabel: null,
        date: null,
        showUpgrade: true,
        upgradeLabel: "View Pro"
      };
    case "free":
    default:
      return {
        label: "Free",
        title: "Circle Card Free",
        description:
          "Your Free plan includes one Circle Card, five active links, sharing, QR, wallet, referrals, and basic analytics.",
        tone: "neutral",
        dateLabel: null,
        date: null,
        showUpgrade: true,
        upgradeLabel: "Explore Pro"
      };
  }
}

function formatBillingDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(value);
}

function toneClassName(tone: CircleCardBillingStatusTone) {
  switch (tone) {
    case "success":
      return "border-emerald-400/24 bg-emerald-400/10";
    case "warning":
      return "border-amber-400/28 bg-amber-400/10";
    case "neutral":
    default:
      return "border-silver/16 bg-background/22";
  }
}

export function CircleCardBillingStatusPanel({
  access,
  billingEnabled
}: {
  access: CircleCardAccessSnapshot;
  billingEnabled: boolean;
}) {
  const view = buildCircleCardBillingStatusView(access);
  const StatusIcon =
    view.tone === "warning"
      ? AlertTriangle
      : view.tone === "success"
        ? CheckCircle2
        : access.hasProAccess
          ? ShieldCheck
          : Crown;
  return (
    <section
      aria-labelledby="circle-card-billing-status-title"
      className={cn("mt-4 rounded-2xl border p-4", toneClassName(view.tone))}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-background/25 text-gold">
            <StatusIcon size={18} />
          </span>
          <div>
            <Badge variant="outline" className="border-current/20 normal-case tracking-normal">
              {view.label}
            </Badge>
            <h3 id="circle-card-billing-status-title" className="mt-2 text-base font-semibold text-foreground">
              {view.title}
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
              {view.description}
            </p>
            {view.dateLabel && view.date ? (
              <p className="mt-2 text-sm font-medium text-foreground">
                {view.dateLabel}: {" "}
                <time dateTime={view.date.toISOString()}>{formatBillingDate(view.date)}</time>
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid shrink-0 gap-2 sm:min-w-64">
          {access.hasBillingRelationship ? (
            <CircleCardBillingPortalButton
              returnPath="/dashboard/circle-card?billing=portal-return"
              label={
                access.lifecycleStatus === "past_due_grace" ||
                access.lifecycleStatus === "payment_failed"
                  ? "Update Payment Method"
                  : "Manage Circle Card billing"
              }
            />
          ) : null}
          {view.showUpgrade ? (
            <CircleCardProCheckoutButtons
              monthlyLabel="£9.99/month"
              billingEnabled={billingEnabled}
              authenticated
              intent={{ source: "dashboard", capability: view.upgradeLabel === "Restore Pro" ? "restore_pro" : "explore_pro", returnPath: "/dashboard/circle-card?section=settings#circle-card-plan" }}
              label={view.upgradeLabel}
              earlyAccessLabel={view.upgradeLabel === "Restore Pro" ? "Register to restore Pro" : "Register interest in Pro"}
              showPrice={false}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
