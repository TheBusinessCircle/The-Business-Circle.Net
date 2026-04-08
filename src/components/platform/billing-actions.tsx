"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getTierButtonVariant } from "@/lib/tier-styles";

type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";

type BillingActionsProps = {
  tier: MembershipTier;
  subscription: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  };
  upgradeOffer?: {
    label: string;
    deltaLabel: string;
    targetTier: Exclude<MembershipTier, "FOUNDATION">;
  } | null;
};

function formatBillingDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function BillingActions({ tier, subscription, upgradeOffer = null }: BillingActionsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const renewalDate = formatBillingDate(subscription.currentPeriodEnd);

  const openCheckout = (targetTier: Exclude<MembershipTier, "FOUNDATION">) => {
    setNotice(null);
    window.location.href = `/membership?tier=${targetTier}`;
  };

  const openPortal = (intent: "manage" | "downgrade") => {
    setNotice(null);

    startTransition(async () => {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent })
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setNotice(payload.error ?? "Unable to open billing portal.");
        return;
      }

      window.location.href = payload.url;
    });
  };

  return (
    <div className="space-y-3">
      {notice ? <p className="text-sm text-primary">{notice}</p> : null}

      {subscription.cancelAtPeriodEnd ? (
        <p className="rounded-xl border border-gold/35 bg-gold/10 px-3 py-2 text-xs text-gold">
          {renewalDate
            ? `Your subscription is set to end on ${renewalDate}.`
            : "Your subscription is set to end at the current billing period."}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {upgradeOffer ? (
          <Button
            disabled={isPending}
            variant={getTierButtonVariant(upgradeOffer.targetTier)}
            onClick={() => openCheckout(upgradeOffer.targetTier)}
          >
            {upgradeOffer.label}
          </Button>
        ) : null}

        {tier !== "FOUNDATION" ? (
          <Button disabled={isPending} variant="secondary" onClick={() => openPortal("downgrade")}>
            Change Plan
          </Button>
        ) : null}

        <Button disabled={isPending} variant="outline" onClick={() => openPortal("manage")}>
          Manage Billing
        </Button>
      </div>

      {upgradeOffer ? <p className="text-xs text-muted">{upgradeOffer.deltaLabel}</p> : null}

      {tier === "CORE" ? (
        <p className="text-xs text-muted">
          Core is your highest membership tier. Use the billing portal for any future changes.
        </p>
      ) : tier !== "FOUNDATION" ? (
        <p className="text-xs text-muted">
          Plan changes and downgrades can be completed in the Stripe billing portal.
        </p>
      ) : null}
    </div>
  );
}
