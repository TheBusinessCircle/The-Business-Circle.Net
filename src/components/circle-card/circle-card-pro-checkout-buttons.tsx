"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type CircleCardProCheckoutButtonsProps = {
  monthlyLabel: string;
};

export function CircleCardProCheckoutButtons({
  monthlyLabel
}: CircleCardProCheckoutButtonsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startCheckout() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/stripe/circle-card/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        setError(data.error ?? "Checkout could not be started.");
        return;
      }

      window.location.assign(data.url);
    });
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-lg border border-gold/24 bg-gold/10 px-4 py-3 text-sm font-medium text-gold">
        {monthlyLabel}
      </div>
      <Button type="button" size="lg" className="w-full gap-2 sm:w-auto" onClick={startCheckout} disabled={isPending}>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        Continue to Stripe
      </Button>
      {error ? <p className="text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
