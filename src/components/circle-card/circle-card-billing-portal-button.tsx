"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

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

  function openPortal() {
    setError(null);
    startTransition(async () => {
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
        setError(data.error ?? "Circle Card billing could not be opened.");
        return;
      }

      window.location.assign(data.url);
    });
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" className="w-full justify-center gap-2" onClick={openPortal} disabled={isPending}>
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
        {label}
      </Button>
      {error ? <p className="text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
