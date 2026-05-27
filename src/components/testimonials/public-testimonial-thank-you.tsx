"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { BCN_GOOGLE_REVIEW_URL } from "@/components/testimonials/google-review.logic";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PublicTestimonialThankYouProps = {
  testimonialId?: string | null;
  testimonialText: string;
  googleReviewUrl?: string;
};

export function PublicTestimonialThankYou({
  testimonialId,
  testimonialText,
  googleReviewUrl = BCN_GOOGLE_REVIEW_URL
}: PublicTestimonialThankYouProps) {
  const [copied, setCopied] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

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

  async function copyTestimonial() {
    const trimmed = testimonialText.trim();

    if (!trimmed) {
      return;
    }

    let didCopy = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(trimmed);
        didCopy = true;
      } catch {
        didCopy = false;
      }
    }

    if (!didCopy) {
      const textArea = document.createElement("textarea");
      textArea.value = trimmed;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.inset = "0 auto auto 0";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        didCopy = document.execCommand("copy");
      } catch {
        didCopy = false;
      } finally {
        document.body.removeChild(textArea);
      }
    }

    setCopied(didCopy);
    setCopyMessage(
      didCopy
        ? "Review copied."
        : "We could not copy automatically. Please select the review text and copy it."
    );
    if (didCopy) {
      void track("copy");
    }
    window.setTimeout(() => setCopied(false), 1800);
  }

  function trackGoogleReviewIntent() {
    void track("intent");
  }

  return (
    <div className="space-y-4">
      {googleReviewUrl ? (
        <div className="space-y-1.5">
          <h3 className="font-display text-xl text-foreground">
            Would you also be happy to leave this as a Google review?
          </h3>
          <p className="text-sm leading-relaxed text-muted">
            Tap copy, open Google, paste the review and submit.
          </p>
        </div>
      ) : null}

      <Textarea
        readOnly
        rows={6}
        value={testimonialText}
        aria-label="Your submitted testimonial"
        className="min-h-[150px] border-gold/24 bg-background/35"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={copyTestimonial}
          disabled={!testimonialText.trim()}
          className="min-h-11 w-full sm:w-auto"
        >
          {copied ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
          {copied ? "Copied" : "Copy review"}
        </Button>
        {googleReviewUrl ? (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackGoogleReviewIntent}
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full sm:w-auto")}
          >
            <ExternalLink size={15} className="mr-2" />
            Leave Google review
          </a>
        ) : null}
      </div>
      {copyMessage ? (
        <p className="text-sm text-gold" aria-live="polite">
          {copyMessage}
        </p>
      ) : null}
    </div>
  );
}
