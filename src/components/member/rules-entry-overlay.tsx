"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RulesEntryOverlayProps = {
  reviewHref: string;
};

export const RULES_ENTRY_FADE_OUT_MS = 480;

const TRUST_POINTS = [
  {
    title: "Private by design",
    copy: "A focused environment for serious business owners."
  },
  {
    title: "Built for better conversations",
    copy: "Less noise. More useful context, insight, and direction."
  },
  {
    title: "Held to a higher standard",
    copy: "The quality of the room is protected by the people inside it."
  }
] as const;

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
    }, RULES_ENTRY_FADE_OUT_MS);
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
      aria-describedby="rules-entry-description"
    >
      <div className="rules-entry-orbits" aria-hidden="true">
        <span className="rules-entry-orbit rules-entry-orbit-primary" />
        <span className="rules-entry-orbit rules-entry-orbit-secondary" />
        <span className="rules-entry-orbit rules-entry-orbit-tertiary" />
        <span className="rules-entry-orbit rules-entry-core-glow" />
      </div>

      <section className="rules-entry-card" aria-label="Welcome to The Business Circle Network">
        <div className="rules-entry-eyebrow">
          <span className="rules-entry-eyebrow-dot" aria-hidden="true" />
          Welcome to The Business Circle Network
        </div>
        <h1
          id="rules-entry-title"
          className="rules-entry-heading mt-5 font-display text-[2.65rem] font-semibold leading-[0.98] text-[rgba(255,255,255,0.94)] sm:text-[4rem] lg:text-[4.75rem]"
        >
          You&rsquo;re in the right room.
        </h1>
        <div id="rules-entry-description" className="mt-7 space-y-4">
          <p className="rules-entry-copy rules-entry-copy-strong">
            You have not just joined another platform.
          </p>
          <p className="rules-entry-copy">
            You have stepped into a private environment built for business owners, founders, and
            CEOs who value clarity, proper conversation, and a higher standard around the work.
          </p>
          <p className="rules-entry-copy">
            Before conversations, messaging, and calls open, take a moment to understand how this
            room is protected.
          </p>
        </div>

        <div className="rules-entry-trust-grid mt-8">
          {TRUST_POINTS.map((point, index) => (
            <article key={point.title} className="rules-entry-trust-card">
              <span className="rules-entry-trust-number">{index + 1}</span>
              <h2>{point.title}</h2>
              <p>{point.copy}</p>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <p className="rules-entry-closing">
            You did not just sign up.
            <span>You stepped into a standard.</span>
          </p>
          <Button
            type="button"
            size="lg"
            className="rules-entry-button mt-6 w-full sm:w-auto"
            onClick={reviewRules}
            disabled={leaving}
          >
            Review BCN Rules <ArrowRight size={16} />
          </Button>
          <p className="mt-3 text-center text-xs text-[rgba(255,255,255,0.56)] sm:text-left">
            A quick read before the room fully opens.
          </p>
        </div>
      </section>
    </div>
  );
}
