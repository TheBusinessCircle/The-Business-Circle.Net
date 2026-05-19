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
    if (!testimonialText.trim()) {
      return;
    }

    await navigator.clipboard.writeText(testimonialText).catch(() => undefined);
    setCopied(true);
    void track("copy");
    window.setTimeout(() => setCopied(false), 1800);
  }

  function trackGoogleReviewIntent() {
    void track("intent");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted">
          You can copy the testimonial you just wrote and paste it into Google if you are happy to
          leave a public review.
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
          Leave this as a Google review
        </a>
      </div>
    </div>
  );
}
