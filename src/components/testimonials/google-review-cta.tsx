"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
  const active = Boolean(enabled && showButton && googleReviewUrl);

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
    try {
      await navigator.clipboard.writeText(testimonialText);
      setCopied(true);
      await track("copy");
      window.setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }

  async function handleGoogleClick() {
    const copiedToClipboard = await copyText();
    await track("intent");

    if (googleReviewUrl) {
      window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
    }

    if (!copiedToClipboard) {
      const fallback = document.getElementById("testimonial-copy-fallback");
      fallback?.focus();
    }
  }

  if (!showButton && !active) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gold/24 bg-gold/10 p-4">
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={copyText}>
          {copied ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
          {copied ? "Copied" : "Copy your testimonial"}
        </Button>
        {active ? (
          <Button type="button" onClick={handleGoogleClick}>
            <ExternalLink size={15} className="mr-2" />
            {label}
          </Button>
        ) : (
          <Button type="button" disabled variant="outline">
            {pendingMessage}
          </Button>
        )}
      </div>
      {copied ? (
        <p className="text-sm text-gold">
          Your testimonial has been copied. Paste it into Google to save writing it again.
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
