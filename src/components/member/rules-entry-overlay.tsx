"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RulesEntryOverlayProps = {
  reviewHref: string;
};

const FADE_OUT_MS = 420;

export function RulesEntryOverlay({ reviewHref }: RulesEntryOverlayProps) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function reviewRules() {
    setLeaving(true);
    window.setTimeout(() => {
      router.push(reviewHref);
    }, FADE_OUT_MS);
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-hidden bg-[#030712] px-4 py-6 transition-opacity duration-500 sm:px-6",
        leaving ? "opacity-0" : "opacity-100"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-entry-title"
    >
      <div className="rules-entry-sweep absolute inset-0 opacity-80" />
      <div className="rules-entry-glow absolute inset-0 opacity-90" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-silver/18 to-transparent" />

      <section className="relative w-full max-w-2xl rounded-[2rem] border border-gold/24 bg-card/82 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:p-8 lg:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/28 bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.1em] text-gold">
          <ShieldCheck size={14} />
          BCN Standard
        </div>
        <h1
          id="rules-entry-title"
          className="mt-5 font-display text-4xl leading-tight text-foreground sm:text-5xl"
        >
          Before you enter the room
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
          This is a private environment built for business owners who value clarity, proper
          conversation, and a stronger space around the work.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          Before accessing conversations, take a moment to understand how this space works.
        </p>
        <div className="mt-8">
          <Button type="button" size="lg" className="w-full sm:w-auto" onClick={reviewRules}>
            Review BCN Rules <ArrowRight size={16} />
          </Button>
        </div>
      </section>
    </div>
  );
}

