"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
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
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  function reviewRules() {
    if (leaving) {
      return;
    }

    setLeaving(true);
    window.setTimeout(() => {
      router.push(reviewHref);
    }, FADE_OUT_MS);
  }

  return (
    <div
      className={cn(
        "rules-entry-overlay flex min-h-dvh items-center justify-center px-6 py-6 sm:px-10 sm:py-12",
        leaving && "rules-entry-overlay-leaving"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-entry-title"
    >
      <section className="rules-entry-card">
        <div className="rules-entry-eyebrow">
          <span className="rules-entry-eyebrow-dot" aria-hidden="true" />
          Private Member Standard
        </div>
        <h1
          id="rules-entry-title"
          className="rules-entry-heading mt-5 font-display text-[2.35rem] font-semibold leading-[1.02] text-[rgba(255,255,255,0.92)] sm:text-[3.35rem] lg:text-[4rem]"
        >
          Before you enter the room
        </h1>
        <p className="rules-entry-copy mt-6">
          This is a private environment built for business owners who value clarity, proper
          conversation, and a stronger space around the work.
        </p>
        <p className="rules-entry-copy mt-4">
          Before accessing conversations, take a moment to understand how this space works.
        </p>
        <div className="mt-8">
          <Button
            type="button"
            size="lg"
            className="rules-entry-button w-full sm:w-auto"
            onClick={reviewRules}
            disabled={leaving}
          >
            Review BCN Rules <ArrowRight size={16} />
          </Button>
        </div>
      </section>
    </div>
  );
}
