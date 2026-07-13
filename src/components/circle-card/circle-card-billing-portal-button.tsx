"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";

type CircleCardBillingPortalButtonProps = {
  returnPath?: string;
  label?: string;
};

export function CircleCardBillingPortalButton({
  returnPath,
  label = "Manage Circle Card billing"
}: CircleCardBillingPortalButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inFlight = useRef(false);

  function openPortal() {
    if (inFlight.current || isPending) return;
    inFlight.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/stripe/circle-card/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returnPath })
        });
        const data = (await response.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };

        if (!response.ok || !data.url) {
          setError(data.error ?? "Circle Card billing could not be opened. Please try again.");
          return;
        }

        trackAnalyticsEvent(ANALYTICS_EVENTS.portalOpened, { source: "circle_card_dashboard" });
        window.location.assign(data.url);
      } catch {
        setError("We could not reach billing management. Check your connection and try again.");
      } finally {
        inFlight.current = false;
      }
    });
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" className="w-full justify-center gap-2" onClick={openPortal} disabled={isPending}>
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
        {isPending ? "Opening billing…" : label}
      </Button>
      {error ? <p role="alert" className="text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
