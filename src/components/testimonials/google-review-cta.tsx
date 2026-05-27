"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  googleReviewCtaIsActive,
  shouldShowGoogleReviewPendingState,
  testimonialIsReadyForGoogleReview
} from "@/components/testimonials/google-review.logic";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GoogleReviewCtaProps = {
  testimonialId?: string | null;
  testimonialText: string;
  googleReviewUrl?: string | null;
  enabled: boolean;
  showButton: boolean;
  label: string;
  pendingMessage: string;
};

export function GoogleReviewCta({
  testimonialId,
  testimonialText,
  googleReviewUrl,
  enabled,
  showButton,
  label,
  pendingMessage
}: GoogleReviewCtaProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const testimonialReady = testimonialIsReadyForGoogleReview(testimonialText);
  const active = googleReviewCtaIsActive({
    enabled,
    showButton,
    googleReviewUrl
  });
  const showPending = shouldShowGoogleReviewPendingState({
    enabled,
    showButton,
    googleReviewUrl
  });

  async function track(kind: "intent" | "copy") {
    if (!testimonialId) {
      return;
    }

    await fetch("/api/testimonials/google-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        testimonialId,
        kind
      })
    }).catch(() => undefined);
  }

  async function copyText() {
    if (!testimonialReady) {
      return false;
    }

    let didCopy = false;

    try {
      await navigator.clipboard.writeText(testimonialText);
      didCopy = true;
    } catch {
      const fallback = document.getElementById("testimonial-copy-fallback") as HTMLTextAreaElement | null;
      fallback?.focus();
      fallback?.select();

      try {
        didCopy = document.execCommand("copy");
      } catch {
        didCopy = false;
      }
    }

    setCopied(didCopy);
    setCopyFailed(!didCopy);

    if (didCopy) {
      await track("copy");
      window.setTimeout(() => setCopied(false), 1800);
    }

    return didCopy;
  }

  if (!showButton && !active && !showPending) {
    return null;
  }

  if (!active) {
    return showPending ? (
      <p className="text-sm leading-relaxed text-muted">{pendingMessage}</p>
    ) : null;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gold/24 bg-gold/10 p-4">
      <div className="space-y-1.5">
        <h3 className="font-display text-xl text-foreground">
          Would you also be happy to leave this as a Google review?
        </h3>
        <p className="text-sm leading-relaxed text-muted">
          Tap copy, open Google, paste the review and submit.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={copyText}
          disabled={!testimonialReady}
          className="min-h-11 w-full sm:w-auto"
        >
          {copied ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
          {copied ? "Copied" : "Copy review"}
        </Button>
        <a
          href={googleReviewUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (!testimonialReady) {
              event.preventDefault();
              return;
            }

            void track("intent");
          }}
          aria-disabled={!testimonialReady}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "min-h-11 w-full sm:w-auto",
            !testimonialReady ? "pointer-events-none opacity-50" : ""
          )}
        >
          <ExternalLink size={15} className="mr-2" />
          {label}
        </a>
      </div>
      {!testimonialReady ? (
        <p className="text-sm text-muted">
          Testimonial text needs to be available before Google opens.
        </p>
      ) : copied ? (
        <p className="text-sm text-gold">
          Your testimonial has been copied. Paste it into Google to save writing it again.
        </p>
      ) : copyFailed ? (
        <p className="text-sm text-muted">
          Copy was unavailable. Select the review text below and copy it manually.
        </p>
      ) : null}
      <textarea
        id="testimonial-copy-fallback"
        className="sr-only"
        readOnly
        value={testimonialText}
        aria-label="Copy your testimonial below, then paste it into Google."
      />
    </div>
  );
}
