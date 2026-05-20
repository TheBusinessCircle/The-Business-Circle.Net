"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { submitExternalTestimonialAction } from "@/actions/testimonial.actions";
import { BCN_GOOGLE_REVIEW_URL } from "@/components/testimonials/google-review.logic";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
};

type PublicTestimonialRequestFormProps = {
  token: string;
  recipientName?: string | null;
  requestCompanyName?: string | null;
  category: string;
  displayLocation: string;
  categoryOptions: SelectOption[];
  displayLocationOptions: SelectOption[];
};

async function writeClipboardText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the legacy selection copy path.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.inset = "0 auto auto 0";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}

export function PublicTestimonialRequestForm({
  token,
  recipientName,
  requestCompanyName,
  category,
  displayLocation,
  categoryOptions,
  displayLocationOptions
}: PublicTestimonialRequestFormProps) {
  const [testimonialText, setTestimonialText] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function copyTestimonial() {
    const trimmed = testimonialText.trim();

    if (!trimmed) {
      setCopied(false);
      setCopyMessage("Write your testimonial first, then copy it.");
      return;
    }

    const didCopy = await writeClipboardText(trimmed);
    setCopied(didCopy);
    setCopyMessage(
      didCopy
        ? "Testimonial copied."
        : "We could not copy automatically. Please select the testimonial text and copy it."
    );
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <form action={submitExternalTestimonialAction} className="space-y-4">
      <input type="hidden" name="requestToken" value={token} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      {recipientName || requestCompanyName ? (
        <div className="rounded-2xl border border-border/80 bg-background/25 p-4 text-sm leading-relaxed text-muted">
          This request was prepared for{" "}
          <span className="font-medium text-foreground">
            {[recipientName, requestCompanyName].filter(Boolean).join(", ")}
          </span>
          . Please enter the details you would like attached to your testimonial below.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="authorName">Name</Label>
          <Input id="authorName" name="authorName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authorRole">Role/title</Label>
          <Input id="authorRole" name="authorRole" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessName">Business/company name</Label>
          <Input id="businessName" name="businessName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessWebsite">Business website</Label>
          <Input id="businessWebsite" name="businessWebsite" type="url" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="submittedEmail">Email</Label>
          <Input id="submittedEmail" name="submittedEmail" type="email" required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="submittedByLinkedIn">LinkedIn</Label>
          <Input id="submittedByLinkedIn" name="submittedByLinkedIn" type="url" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Experience</Label>
          <Select id="category" name="category" defaultValue={category}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayLocation">Display preference</Label>
          <Select id="displayLocation" name="displayLocation" defaultValue={displayLocation}>
            {displayLocationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="rating">Rating, optional</Label>
          <Select id="rating" name="rating" defaultValue="">
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((rating) => (
              <option key={rating} value={rating}>
                {rating} out of 5
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quote">Testimonial quote</Label>
        <Textarea
          id="quote"
          name="quote"
          rows={5}
          required
          minLength={20}
          maxLength={1600}
          value={testimonialText}
          onChange={(event) => {
            setTestimonialText(event.target.value);
            if (copyMessage) {
              setCopyMessage("");
            }
          }}
          placeholder="Share what changed, what became clearer, or what the work helped you move through."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outcome">Outcome, optional</Label>
        <Textarea
          id="outcome"
          name="outcome"
          rows={3}
          maxLength={600}
          placeholder="A result, decision, connection, or clarity point that came from the work."
        />
      </div>

      <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Public display permissions</p>
        <div className="grid gap-3">
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="allowDisplayTestimonial"
              className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            Display my testimonial publicly.
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="allowDisplayName"
              className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            Display my name.
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="allowDisplayCompany"
              className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            Display my business/company name.
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="allowDisplayRole"
              className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            Display my role/title.
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="allowMarketingUse"
              className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            Allow The Business Circle Network to use this testimonial in marketing.
          </label>
          <span className="text-xs leading-relaxed text-muted">
            Every testimonial is reviewed before anything is published.
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-gold/24 bg-gold/10 p-4">
        <p className="text-sm leading-relaxed text-muted">
          Once you have written your testimonial, you can copy it first, submit it here, and then
          paste the same words into Google if you are happy to leave a public review too.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          You can paste the same testimonial into Google if you are happy to leave it there too.
        </p>
        {copyMessage ? (
          <p className="mt-3 text-sm text-gold" aria-live="polite">
            {copyMessage}
          </p>
        ) : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-[auto_auto_auto] sm:justify-start">
          <Button type="button" variant="outline" onClick={copyTestimonial}>
            {copied ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
            {copied ? "Copied" : "Copy testimonial"}
          </Button>
          <Button type="submit">Submit testimonial</Button>
          <a
            href={BCN_GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            <ExternalLink size={15} className="mr-2" />
            Leave Google review
          </a>
        </div>
      </div>
    </form>
  );
}
