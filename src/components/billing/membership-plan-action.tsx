"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { MembershipBillingInterval } from "@/config/membership";
import { getTierButtonVariant } from "@/lib/tier-styles";
import { cn } from "@/lib/utils";

type CheckoutSource = "membership" | "join" | "dashboard";
type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";

type CheckoutApiPayload = {
  tier: MembershipTier;
  billingInterval: MembershipBillingInterval;
  coreAccessConfirmed: boolean;
  source: CheckoutSource;
};

type CheckoutApiResponse = {
  url?: string;
  error?: string;
};

type PortalApiResponse = {
  url?: string;
  error?: string;
};

type MembershipPlanActionProps = {
  tier: MembershipTier;
  source: CheckoutSource;
  billingInterval?: MembershipBillingInterval;
  isAuthenticated: boolean;
  isCurrentPlan?: boolean;
  hasActiveSubscription?: boolean;
  currentBillingInterval?: MembershipBillingInterval | null;
  buttonVariant?: "foundation" | "innerCircle" | "core" | "outline";
  authenticatedLabel: string;
  unauthenticatedLabel: string;
  joinHref: string;
  loginHref: string;
};

function withSelectionParams(pathname: string, params: Record<string, string | boolean | undefined>) {
  const url = new URL(pathname, "http://localhost");

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "boolean") {
      if (value) {
        url.searchParams.set(key, "1");
      }
      continue;
    }

    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return `${url.pathname}${url.search}`;
}

export function MembershipPlanAction({
  tier,
  source,
  billingInterval = "monthly",
  isAuthenticated,
  isCurrentPlan = false,
  hasActiveSubscription = false,
  currentBillingInterval,
  buttonVariant,
  authenticatedLabel,
  unauthenticatedLabel,
  joinHref,
  loginHref
}: MembershipPlanActionProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [coreAccessConfirmed, setCoreAccessConfirmed] = useState(false);
  const [isCheckoutPending, startCheckoutTransition] = useTransition();
  const [isPortalPending, startPortalTransition] = useTransition();

  const requiresCoreConfirmation = tier === "CORE";
  const hasConfirmedCoreAccess = !requiresCoreConfirmation || coreAccessConfirmed;
  const isBusy = isCheckoutPending || isPortalPending;
  const isCurrentActiveSelection =
    isAuthenticated &&
    hasActiveSubscription &&
    isCurrentPlan &&
    (currentBillingInterval ? currentBillingInterval === billingInterval : true);
  const showCoreConfirmation = requiresCoreConfirmation && !isCurrentActiveSelection;
  const tierButtonVariant = buttonVariant ?? getTierButtonVariant(tier);
  const checkoutLabel = useMemo(() => {
    if (isCheckoutPending) {
      return "Opening Billing...";
    }

    return authenticatedLabel;
  }, [authenticatedLabel, isCheckoutPending]);
  const resolvedJoinHref = useMemo(
    () =>
      withSelectionParams(joinHref, {
        interval: billingInterval,
        coreAccessConfirmed: requiresCoreConfirmation ? coreAccessConfirmed : undefined
      }),
    [billingInterval, coreAccessConfirmed, joinHref, requiresCoreConfirmation]
  );

  const startCheckout = () => {
    if (isCurrentActiveSelection) {
      return;
    }

    if (!hasConfirmedCoreAccess) {
      setNotice(
        "Please confirm that you are actively running a business or generating revenue to continue to Core."
      );
      return;
    }

    setNotice(null);

    startCheckoutTransition(async () => {
      const payload: CheckoutApiPayload = {
        tier,
        billingInterval,
        coreAccessConfirmed,
        source
      };

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => ({}))) as CheckoutApiResponse;

      if (!response.ok || !data.url) {
        setNotice(data.error ?? "Unable to open Stripe checkout.");
        return;
      }

      window.location.assign(data.url);
    });
  };

  const openBillingPortal = () => {
    setNotice(null);

    startPortalTransition(async () => {
      const response = await fetch("/api/stripe/portal", {
        method: "POST"
      });

      const data = (await response.json().catch(() => ({}))) as PortalApiResponse;

      if (!response.ok || !data.url) {
        setNotice(data.error ?? "Unable to open billing portal.");
        return;
      }

      window.location.assign(data.url);
    });
  };

  return (
    <div className="space-y-3">
      {showCoreConfirmation ? (
        <label className="flex items-start gap-3 rounded-2xl border border-gold/25 bg-background/25 px-4 py-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={coreAccessConfirmed}
            onChange={(event) => {
              setCoreAccessConfirmed(event.target.checked);
              if (notice) {
                setNotice(null);
              }
            }}
            className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
          />
          <span>I am actively running a business or generating revenue from a business</span>
        </label>
      ) : null}

      {!isAuthenticated ? (
        <div className="space-y-2">
          {hasConfirmedCoreAccess ? (
            <Link
              href={resolvedJoinHref}
              className={cn(buttonVariants({ variant: tierButtonVariant, size: "lg" }), "w-full")}
            >
              {unauthenticatedLabel}
            </Link>
          ) : (
            <Button className="w-full" variant={tierButtonVariant} size="lg" disabled>
              {unauthenticatedLabel}
            </Button>
          )}
          <p className="text-center text-xs text-muted">
            Already a member?{" "}
            <Link href={loginHref} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
          {notice ? (
            <p className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-2 text-center text-xs text-primary">
              {notice}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <Button
            type="button"
            className="w-full"
            variant={isCurrentActiveSelection ? "secondary" : tierButtonVariant}
            size="lg"
            disabled={isBusy || isCurrentActiveSelection || !hasConfirmedCoreAccess}
            onClick={startCheckout}
          >
            {isCheckoutPending ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
            {isCurrentActiveSelection ? "Current Active Plan" : checkoutLabel}
          </Button>

          {isCurrentActiveSelection ? (
            <Button
              type="button"
              className="w-full"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={openBillingPortal}
            >
              {isPortalPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
              Manage Billing
            </Button>
          ) : (
            <p className="text-center text-xs text-muted">Secure checkout powered by Stripe.</p>
          )}

          {notice ? (
            <p className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-2 text-center text-xs text-primary">
              {notice}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
