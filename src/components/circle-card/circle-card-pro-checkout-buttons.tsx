"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type CircleCardProCheckoutButtonsProps = {
  monthlyLabel: string;
  annualLabel: string;
};

type CheckoutPeriod = "monthly" | "annual";

export function CircleCardProCheckoutButtons({
  monthlyLabel,
  annualLabel
}: CircleCardProCheckoutButtonsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<CheckoutPeriod>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startCheckout() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/stripe/circle-card/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "pro",
          period: selectedPeriod,
          source: "circle_card_pro_page"
        })
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
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { value: "monthly" as const, label: monthlyLabel },
          { value: "annual" as const, label: annualLabel }
        ].map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={selectedPeriod === option.value ? "default" : "outline"}
            className="h-auto justify-start px-4 py-3 text-left"
            onClick={() => setSelectedPeriod(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <Button type="button" size="lg" className="w-full gap-2 sm:w-auto" onClick={startCheckout} disabled={isPending}>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        Continue to Stripe
      </Button>
      {error ? <p className="text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
