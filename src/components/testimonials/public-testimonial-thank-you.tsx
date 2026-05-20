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
        ? "Testimonial copied."
        : "We could not copy automatically. Please select the testimonial text and copy it."
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
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted">
          Thank you — your testimonial has been submitted. If you are happy to leave the same words
          as a Google review, you can copy your testimonial below and paste it into Google.
        </p>
        <Textarea
          readOnly
          rows={6}
          value={testimonialText}
          aria-label="Your submitted testimonial"
          className="min-h-[150px] border-gold/24 bg-background/35"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="outline" onClick={copyTestimonial} disabled={!testimonialText.trim()}>
          {copied ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
          {copied ? "Copied" : "Copy testimonial"}
        </Button>
        <a
          href={googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackGoogleReviewIntent}
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
        >
          <ExternalLink size={15} className="mr-2" />
          Leave Google review
        </a>
      </div>
      {copyMessage ? (
        <p className="text-sm text-gold" aria-live="polite">
          {copyMessage}
        </p>
      ) : null}
    </div>
  );
}
