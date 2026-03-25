"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTierButtonVariant } from "@/lib/tier-styles";

type CheckoutSource = "membership" | "join" | "dashboard";
type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";

type CheckoutApiPayload = {
  tier: MembershipTier;
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
  isAuthenticated: boolean;
  isCurrentPlan?: boolean;
  hasActiveSubscription?: boolean;
  buttonVariant?: "foundation" | "innerCircle" | "core" | "outline";
  authenticatedLabel: string;
  unauthenticatedLabel: string;
  joinHref: string;
  loginHref: string;
};

export function MembershipPlanAction({
  tier,
  source,
  isAuthenticated,
  isCurrentPlan = false,
  hasActiveSubscription = false,
  buttonVariant,
  authenticatedLabel,
  unauthenticatedLabel,
  joinHref,
  loginHref
}: MembershipPlanActionProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [isCheckoutPending, startCheckoutTransition] = useTransition();
  const [isPortalPending, startPortalTransition] = useTransition();

  const isBusy = isCheckoutPending || isPortalPending;
  const isCurrentActivePlan = isAuthenticated && hasActiveSubscription && isCurrentPlan;
  const tierButtonVariant = buttonVariant ?? getTierButtonVariant(tier);
  const checkoutLabel = useMemo(() => {
    if (isCheckoutPending) {
      return "Opening Billing...";
    }

    return authenticatedLabel;
  }, [authenticatedLabel, isCheckoutPending]);

  const startCheckout = () => {
    if (isCurrentActivePlan) {
      return;
    }

    setNotice(null);

    startCheckoutTransition(async () => {
      const payload: CheckoutApiPayload = {
        tier,
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

  if (!isAuthenticated) {
    return (
      <div className="space-y-2">
        <Link href={joinHref} className="block">
          <Button className="w-full" variant={tierButtonVariant} size="lg">
            {unauthenticatedLabel}
          </Button>
        </Link>
        <p className="text-center text-xs text-muted">
          Already a member?{" "}
          <Link href={loginHref} className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full"
        variant={isCurrentActivePlan ? "secondary" : tierButtonVariant}
        size="lg"
        disabled={isBusy || isCurrentActivePlan}
        onClick={startCheckout}
      >
        {isCheckoutPending ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
        {isCurrentActivePlan ? "Current Active Plan" : checkoutLabel}
      </Button>

      {isCurrentActivePlan ? (
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
    </div>
  );
}

