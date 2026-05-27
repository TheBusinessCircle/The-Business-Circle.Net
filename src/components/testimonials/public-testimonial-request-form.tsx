"use client";

import { ShieldCheck, Star } from "lucide-react";
import { submitExternalTestimonialAction } from "@/actions/testimonial.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PublicTestimonialRequestFormProps = {
  token?: string | null;
  recipientName?: string | null;
  requestCompanyName?: string | null;
  category: string;
  displayLocation: string;
  returnPath?: string;
  trackingSource?: string | null;
  campaign?: string | null;
  referral?: string | null;
};

const ratingOptions = [1, 2, 3, 4, 5];

export function PublicTestimonialRequestForm({
  token,
  recipientName,
  requestCompanyName,
  category,
  displayLocation,
  returnPath,
  trackingSource,
  campaign,
  referral
}: PublicTestimonialRequestFormProps) {
  return (
    <form action={submitExternalTestimonialAction} className="space-y-5">
      {token ? <input type="hidden" name="requestToken" value={token} /> : null}
      <input type="hidden" name="returnPath" value={returnPath ?? (token ? `/testimonial/${token}` : "/testimonial")} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="displayLocation" value={displayLocation} />
      <input type="hidden" name="source" value={trackingSource ?? ""} />
      <input type="hidden" name="campaign" value={campaign ?? ""} />
      <input type="hidden" name="ref" value={referral ?? ""} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      {recipientName || requestCompanyName ? (
        <div className="rounded-2xl border border-border/80 bg-background/25 p-4 text-sm leading-relaxed text-muted">
          This request was prepared for{" "}
          <span className="font-medium text-foreground">
            {[recipientName, requestCompanyName].filter(Boolean).join(", ")}
          </span>
          . You only need to add the details you are happy to submit.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            name="businessName"
            required
            minLength={2}
            autoComplete="organization"
            defaultValue={requestCompanyName ?? ""}
            className="min-h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authorName">Owner name (optional)</Label>
          <Input id="authorName" name="authorName" autoComplete="name" className="min-h-12" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="submittedEmail">Email (optional)</Label>
          <Input
            id="submittedEmail"
            name="submittedEmail"
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="Used internally only if we need to contact you."
            className="min-h-12"
          />
          <p className="text-xs leading-relaxed text-muted">
            Email is not required for public testimonials and is not shown on the website.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="testimonialTitle">Testimonial title (optional)</Label>
          <Input
            id="testimonialTitle"
            name="outcome"
            maxLength={600}
            placeholder="Clearer direction and a stronger website"
            className="min-h-12"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quote">Your full review</Label>
        <Textarea
          id="quote"
          name="quote"
          rows={7}
          required
          minLength={20}
          maxLength={1600}
          placeholder="Share what changed, what became clearer, and how the support helped your business."
          className="min-h-[180px]"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Rating (optional)</legend>
        <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
          {ratingOptions.map((rating) => (
            <label key={rating} className="cursor-pointer">
              <input type="radio" name="rating" value={rating} className="peer sr-only" />
              <span className="flex min-h-12 items-center justify-center gap-1 rounded-xl border border-border/80 bg-background/30 px-3 text-sm text-muted transition-colors peer-checked:border-gold/50 peer-checked:bg-gold/12 peer-checked:text-gold">
                <Star size={14} className="fill-current" />
                {rating}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-14 items-start gap-3 rounded-2xl border border-border/80 bg-background/22 p-4 text-sm leading-relaxed text-muted">
        <input
          type="checkbox"
          name="allowDisplayTestimonial"
          required
          className="mt-1 h-5 w-5 shrink-0 rounded border-border bg-background accent-primary"
        />
        <span>
          <span className="mb-1 flex items-center gap-2 font-medium text-foreground">
            <ShieldCheck size={15} className="text-primary" />
            Permission
          </span>
          I&apos;m happy for this testimonial to be displayed publicly on The Business Circle website.
        </span>
      </label>

      <Button type="submit" size="lg" className="min-h-12 w-full sm:w-auto">
        Submit testimonial
      </Button>
    </form>
  );
}
