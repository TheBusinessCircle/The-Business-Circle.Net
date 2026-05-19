"use client";

import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { submitMemberTestimonialAction } from "@/actions/testimonial.actions";
import {
  googleReviewCtaIsActive,
  shouldShowGoogleReviewPendingState,
  testimonialIsReadyForGoogleReview
} from "@/components/testimonials/google-review.logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type SelectOption = {
  value: string;
  label: string;
};

type MemberTestimonialSubmissionFormProps = {
  categoryOptions: SelectOption[];
  displayLocationOptions: SelectOption[];
  googleReviewUrl?: string | null;
  googleReviewEnabled: boolean;
  showGoogleReviewButton: boolean;
  googleReviewButtonLabel: string;
  googleReviewPendingMessage: string;
  googleIntentTestimonialId?: string | null;
};

export function MemberTestimonialSubmissionForm({
  categoryOptions,
  displayLocationOptions,
  googleReviewUrl,
  googleReviewEnabled,
  showGoogleReviewButton,
  googleReviewButtonLabel,
  googleReviewPendingMessage,
  googleIntentTestimonialId
}: MemberTestimonialSubmissionFormProps) {
  const [testimonialText, setTestimonialText] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const testimonialReady = testimonialIsReadyForGoogleReview(testimonialText);
  const googleReviewSettings = {
    enabled: googleReviewEnabled,
    showButton: showGoogleReviewButton,
    googleReviewUrl
  };
  const googleReviewActive = googleReviewCtaIsActive(googleReviewSettings);
  const showGooglePending = shouldShowGoogleReviewPendingState(googleReviewSettings);

  async function trackGoogleIntent(kind: "intent" | "copy") {
    if (!googleIntentTestimonialId) {
      return;
    }

    await fetch("/api/testimonials/google-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        testimonialId: googleIntentTestimonialId,
        kind
      })
    }).catch(() => undefined);
  }

  async function copyTestimonial() {
    if (!testimonialReady) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(testimonialText);
      setCopied(true);
      setCopyFailed(false);
      void trackGoogleIntent("copy");
      window.setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      setCopied(false);
      setCopyFailed(true);
      return false;
    }
  }

  function openGoogleReviewPage() {
    if (!testimonialReady || !googleReviewActive || !googleReviewUrl) {
      return;
    }

    void trackGoogleIntent("intent");
    window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <form action={submitMemberTestimonialAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="testimonialQuote">Testimonial</Label>
        <Textarea
          id="testimonialQuote"
          name="quote"
          rows={5}
          required
          minLength={20}
          maxLength={1200}
          value={testimonialText}
          onChange={(event) => setTestimonialText(event.target.value)}
          placeholder="Share what changed, what felt clearer, or what became easier."
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={copyTestimonial}
            disabled={!testimonialReady}
            className="w-full sm:w-auto"
          >
            {copied ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
            {copied ? "Copied" : "Copy testimonial text"}
          </Button>
          <p className="text-xs leading-relaxed text-muted" aria-live="polite">
            {copyFailed
              ? "Copy was unavailable. Select the testimonial text and copy it manually."
              : testimonialReady
                ? "Your words are ready to copy into Google."
                : "Write at least 20 characters to copy this testimonial."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="testimonialCategory">Experience</Label>
          <Select id="testimonialCategory" name="category" defaultValue="BCN_EXPERIENCE">
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="testimonialDisplayLocation">Display preference</Label>
          <Select id="testimonialDisplayLocation" name="displayLocation" defaultValue="ANYWHERE">
            {displayLocationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="testimonialRating">Rating, optional</Label>
          <Select id="testimonialRating" name="rating" defaultValue="">
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((rating) => (
              <option key={rating} value={rating}>
                {rating} out of 5
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="submittedByCompany">Company, optional</Label>
          <Input id="submittedByCompany" name="submittedByCompany" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="submittedByRole">Role, optional</Label>
          <Input id="submittedByRole" name="submittedByRole" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="submittedByWebsite">Website, optional</Label>
          <Input id="submittedByWebsite" name="submittedByWebsite" type="url" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="submittedByLinkedIn">LinkedIn, optional</Label>
          <Input id="submittedByLinkedIn" name="submittedByLinkedIn" type="url" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldCheck size={15} className="text-primary" />
          Permission
        </div>
        <div className="grid gap-3">
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="permissionToFeaturePublicly"
              required
              className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            I give permission for this testimonial to be featured publicly on The Business Circle
            Network.
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="permissionToUseName"
              defaultChecked
              className="h-4 w-4 rounded border-border bg-background accent-primary"
            />
            I give permission for my name to be shown.
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="permissionToUseCompany"
              defaultChecked
              className="h-4 w-4 rounded border-border bg-background accent-primary"
            />
            I give permission for my company name to be shown.
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="permissionToUseImage"
              className="h-4 w-4 rounded border-border bg-background accent-primary"
            />
            I give permission for my profile image/logo to be shown.
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="permissionToUseInMarketing"
              className="h-4 w-4 rounded border-border bg-background accent-primary"
            />
            I give permission for this testimonial to be used in marketing material.
          </label>
        </div>
      </div>

      {googleReviewActive ? (
        <section className="space-y-3 rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/12 via-background/35 to-primary/8 p-4 shadow-inner-surface">
          <div className="space-y-1.5">
            <h3 className="font-display text-xl text-foreground">Leave this on Google too</h3>
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              Copy your testimonial first, then open Google and paste the same words into The
              Business Circle Network LTD review box. This saves you writing it twice and helps
              other business owners see that BCN is genuine.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={copyTestimonial}
              disabled={!testimonialReady}
              className="w-full sm:w-auto"
            >
              {copied ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
              {copied ? "Copied" : "Copy testimonial"}
            </Button>
            <Button
              type="button"
              onClick={openGoogleReviewPage}
              disabled={!testimonialReady}
              className="w-full sm:w-auto"
            >
              <ExternalLink size={15} className="mr-2" />
              Open Google review page
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted" aria-live="polite">
            {testimonialReady
              ? "Google will open in a new tab. Paste the copied testimonial into the review box."
              : "Write at least 20 characters before opening Google."}
          </p>
        </section>
      ) : showGooglePending ? (
        <section className="space-y-3 rounded-2xl border border-gold/24 bg-gold/10 p-4">
          <div className="space-y-1.5">
            <h3 className="font-display text-xl text-foreground">Google review</h3>
            <p className="text-sm leading-relaxed text-muted">{googleReviewPendingMessage}</p>
          </div>
          <Button type="button" disabled variant="outline">
            {googleReviewButtonLabel}
          </Button>
        </section>
      ) : null}

      <Button type="submit">Submit testimonial</Button>
    </form>
  );
}
