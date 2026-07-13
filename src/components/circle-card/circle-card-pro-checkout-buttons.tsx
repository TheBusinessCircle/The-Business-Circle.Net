"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import {
  buildCircleCardProHref,
  normalizeCircleCardProIntent,
  type CircleCardProIntent
} from "@/lib/circle-card/pro-intent";
import { cn } from "@/lib/utils";

type CircleCardProCheckoutButtonsProps = {
  monthlyLabel: string;
  billingEnabled?: boolean;
  authenticated?: boolean;
  intent?: Partial<CircleCardProIntent>;
  label?: string;
  earlyAccessLabel?: string;
  showPrice?: boolean;
  className?: string;
};

export function CircleCardProCheckoutButtons({
  monthlyLabel,
  billingEnabled = true,
  authenticated = true,
  intent: rawIntent,
  label = "Unlock Circle Card Pro",
  earlyAccessLabel = "Register for Pro early access",
  showPrice = true,
  className
}: CircleCardProCheckoutButtonsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const intent = normalizeCircleCardProIntent(rawIntent);
  const proHref = buildCircleCardProHref(intent);
  const loginHref = `/login?from=${encodeURIComponent(proHref)}`;

  function trackCta(mode: "early_access" | "login" | "checkout") {
    trackAnalyticsEvent(ANALYTICS_EVENTS.proCtaClicked, {
      source: intent.source,
      capability: intent.capability,
      mode,
      billingEnabled
    });
    if (intent.source === "studio") {
      trackAnalyticsEvent(ANALYTICS_EVENTS.studioUpgradeClicked, {
        capability: intent.capability,
        mode,
        billingEnabled
      });
    }
  }

  function startCheckout() {
    if (inFlight.current || isPending || !billingEnabled || !authenticated) return;
    inFlight.current = true;
    setError(null);
    trackCta("checkout");
    trackAnalyticsEvent(ANALYTICS_EVENTS.checkoutRequested, {
      source: intent.source,
      capability: intent.capability
    });
    startTransition(async () => {
      try {
        const response = await fetch("/api/stripe/circle-card/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent })
        });
        const data = (await response.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
          checkoutSessionReused?: boolean;
        };

        if (!response.ok || !data.url) {
          setError(data.error ?? "Secure checkout could not be prepared. Please try again.");
          trackAnalyticsEvent(ANALYTICS_EVENTS.checkoutFailed, {
            source: intent.source,
            capability: intent.capability,
            status: response.status
          });
          return;
        }

        if (data.checkoutSessionReused) {
          trackAnalyticsEvent(ANALYTICS_EVENTS.checkoutReused, {
            source: intent.source,
            capability: intent.capability
          });
        }
        window.location.assign(data.url);
      } catch {
        setError("We could not reach secure checkout. Check your connection and try again.");
        trackAnalyticsEvent(ANALYTICS_EVENTS.checkoutFailed, {
          source: intent.source,
          capability: intent.capability,
          status: "network"
        });
      } finally {
        inFlight.current = false;
      }
    });
  }

  if (!billingEnabled || !authenticated) {
    const href = billingEnabled ? loginHref : proHref;
    const mode = billingEnabled ? "login" : "early_access";
    return (
      <div className={cn("grid gap-3", className)}>
        {showPrice ? <div className="rounded-lg border border-gold/24 bg-gold/10 px-4 py-3 text-sm font-medium text-gold">{monthlyLabel}</div> : null}
        <Link
          href={href}
          onClick={() => trackCta(mode)}
          className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 sm:w-auto")}
        >
          {billingEnabled ? "Sign in to continue" : earlyAccessLabel}
          <ArrowRight size={16} />
        </Link>
        {!billingEnabled ? <p className="text-xs leading-relaxed text-muted">Pro payments are opening shortly. No payment will be taken.</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {showPrice ? <div className="rounded-lg border border-gold/24 bg-gold/10 px-4 py-3 text-sm font-medium text-gold">{monthlyLabel}</div> : null}
      <Button type="button" size="lg" className="w-full gap-2 sm:w-auto" onClick={startCheckout} disabled={isPending}>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        {isPending ? "Preparing secure checkout…" : label}
      </Button>
      {error ? <p role="alert" className="text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
