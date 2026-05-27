"use client";

import { ShieldCheck, Star } from "lucide-react";
import { submitMemberTestimonialAction } from "@/actions/testimonial.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MemberTestimonialSubmissionFormProps = {
  defaultOwnerName?: string;
  defaultBusinessName?: string;
  returnPath?: string;
};

const ratingOptions = [1, 2, 3, 4, 5];

export function MemberTestimonialSubmissionForm({
  defaultOwnerName = "",
  defaultBusinessName = "",
  returnPath = "/profile"
}: MemberTestimonialSubmissionFormProps) {
  return (
    <form action={submitMemberTestimonialAction} className="space-y-5">
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="category" value="BCN_EXPERIENCE" />
      <input type="hidden" name="displayLocation" value="ANYWHERE" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="submittedByCompany">Business name</Label>
          <Input
            id="submittedByCompany"
            name="submittedByCompany"
            required
            minLength={2}
            autoComplete="organization"
            defaultValue={defaultBusinessName}
            className="min-h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="submittedByName">Owner name (optional)</Label>
          <Input
            id="submittedByName"
            name="submittedByName"
            autoComplete="name"
            defaultValue={defaultOwnerName}
            className="min-h-12"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="testimonialTitle">Testimonial title (optional)</Label>
          <Input
            id="testimonialTitle"
            name="outcome"
            maxLength={500}
            placeholder="Clearer direction and a stronger website"
            className="min-h-12"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="testimonialQuote">Your full review</Label>
        <Textarea
          id="testimonialQuote"
          name="quote"
          rows={7}
          required
          minLength={20}
          maxLength={1200}
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
          name="permissionToFeaturePublicly"
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
