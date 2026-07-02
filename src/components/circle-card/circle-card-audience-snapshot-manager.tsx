"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BarChart3, ChevronDown, Loader2, Lock, Save, Users } from "lucide-react";
import { saveCircleCardAudienceSnapshotInlineAction } from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_AUDIENCE_CONTENT_TYPES,
  CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS,
  CIRCLE_CARD_POSTING_FREQUENCIES,
  CIRCLE_CARD_PRIMARY_AUDIENCES,
  circleCardAudienceSnapshotStatus,
  type CircleCardAudienceSnapshot
} from "@/lib/circle-card/content-blocks";

function Field({ label, name, defaultValue, placeholder, maxLength = 100 }: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`audience-${name}`}>{label}</Label>
      <Input id={`audience-${name}`} name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} maxLength={maxLength} />
    </div>
  );
}

function SelectField({ label, name, defaultValue, options }: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: readonly string[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`audience-${name}`}>{label}</Label>
      <select id={`audience-${name}`} name={name} defaultValue={defaultValue ?? ""} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">Not supplied</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

export function CircleCardAudienceSnapshotManager({
  cardId,
  cardName,
  initialSnapshot,
  locked
}: {
  cardId: string;
  cardName: string;
  initialSnapshot: CircleCardAudienceSnapshot | null;
  locked: boolean;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setSnapshot(initialSnapshot), [initialSnapshot]);

  const status = circleCardAudienceSnapshotStatus(snapshot);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveCircleCardAudienceSnapshotInlineAction(new FormData(event.currentTarget));
      if (result.ok) {
        setSnapshot(result.snapshot);
        setNotice(result.notice);
        setFormKey((current) => current + 1);
      } else {
        setNotice("");
        setError(result.message);
      }
    } catch {
      setError("The Audience Snapshot could not be saved. Your current details are still shown.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="creator-audience" className="scroll-mt-24 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05]">
      <details data-circle-card-module-details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl font-semibold text-foreground">Audience Snapshot</span>
              <Badge variant={locked ? "muted" : "premium"}>{locked ? "Locked" : "Creator Pro"}</Badge>
              {!locked ? <Badge variant="outline" className="border-cyan-300/24 text-cyan-100">{status}</Badge> : null}
            </span>
            <span className="mt-1 block text-sm text-muted">{locked ? "Unlock your creator-controlled audience overview" : status === "Not Started" ? "Set up Audience Snapshot" : "Manage Audience Snapshot"}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-silver transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-silver/12 p-3 sm:p-4">
          {locked ? (
            <div className="flex flex-col gap-3 rounded-xl border border-gold/22 bg-gold/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Lock size={15} />Audience Snapshot is included with Creator Pro.</p>
                <p className="mt-1 text-sm text-muted">Give brands a clear, creator-controlled overview without connecting social APIs.</p>
              </div>
              <Link href="/circle-card/pro" className={`${buttonVariants({ variant: "outline" })} h-11 w-full sm:w-auto`}>Explore Creator Pro</Link>
            </div>
          ) : (
            <form key={formKey} onSubmit={save} className="space-y-5" noValidate>
              <input type="hidden" name="cardId" value={cardId} />
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-200">Creator audience: {cardName}</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">Who Watches My Content</h3>
                <p className="mt-1 text-sm text-muted">Add only the audience details you want brands to see. Every value is entered and controlled by you.</p>
              </div>
              {notice ? <p role="status" className="rounded-xl border border-emerald-400/24 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{notice}</p> : null}
              {error ? <p role="alert" className="rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
              {status === "Not Started" ? <p className="rounded-xl border border-dashed border-cyan-300/18 bg-cyan-400/[0.04] p-3 text-sm text-muted">Help brands understand who your content reaches.</p> : null}

              <div className="rounded-xl border border-silver/14 bg-background/18 p-3 sm:p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><BarChart3 size={15} className="text-cyan-200" />Content and platforms</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <SelectField label="Primary Platform" name="primaryPlatform" defaultValue={snapshot?.primaryPlatform} options={CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS} />
                  <SelectField label="Secondary Platform" name="secondaryPlatform" defaultValue={snapshot?.secondaryPlatform} options={CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS} />
                  <SelectField label="Primary Content Type" name="primaryContentType" defaultValue={snapshot?.primaryContentType} options={CIRCLE_CARD_AUDIENCE_CONTENT_TYPES} />
                  <SelectField label="Posting Frequency" name="postingFrequency" defaultValue={snapshot?.postingFrequency} options={CIRCLE_CARD_POSTING_FREQUENCIES} />
                </div>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="audience-best-content">Best Performing Content</Label>
                  <Textarea id="audience-best-content" name="bestPerformingContent" defaultValue={snapshot?.bestPerformingContent ?? ""} rows={3} maxLength={300} placeholder="Tutorials, product comparisons, weekly vlogs..." />
                </div>
              </div>

              <div className="rounded-xl border border-silver/14 bg-background/18 p-3 sm:p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Users size={15} className="text-cyan-200" />Audience profile</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <SelectField label="Primary Audience" name="primaryAudience" defaultValue={snapshot?.primaryAudience} options={CIRCLE_CARD_PRIMARY_AUDIENCES} />
                  <Field label="Audience Age" name="audienceAge" defaultValue={snapshot?.audienceAge} placeholder="18–34" />
                  <Field label="Audience Gender" name="audienceGender" defaultValue={snapshot?.audienceGender} placeholder="Mixed, majority women..." />
                  <Field label="Top Country" name="topCountry" defaultValue={snapshot?.topCountry} placeholder="United Kingdom" />
                  <Field label="Additional Countries" name="additionalCountries" defaultValue={snapshot?.additionalCountries.join(", ")} placeholder="United States, Canada, Australia" maxLength={400} />
                  <Field label="Audience Interests" name="audienceInterests" defaultValue={snapshot?.audienceInterests.join(", ")} placeholder="Technology, entrepreneurship, productivity" maxLength={500} />
                </div>
              </div>

              <div className="rounded-xl border border-silver/14 bg-background/18 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-foreground">Audience size</h3>
                <p className="mt-1 text-xs text-muted">Use clear values such as 120K or 2.4M. No analytics connection is required.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Average Monthly Reach" name="averageMonthlyReach" defaultValue={snapshot?.averageMonthlyReach} placeholder="850K" />
                  <Field label="Average Monthly Views" name="averageMonthlyViews" defaultValue={snapshot?.averageMonthlyViews} placeholder="2.4M" />
                  <Field label="Followers" name="followers" defaultValue={snapshot?.followers} placeholder="120K" />
                  <Field label="Subscribers" name="subscribers" defaultValue={snapshot?.subscribers} placeholder="65K" />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-silver/14 bg-background/18 p-3 sm:p-4">
                <Label htmlFor="audience-creator-notes">Creator Notes</Label>
                <Textarea id="audience-creator-notes" name="creatorNotes" defaultValue={snapshot?.creatorNotes ?? ""} rows={4} maxLength={800} placeholder="Add useful context that helps brands understand your audience." />
              </div>

              <Button type="submit" className="h-11 w-full gap-2 sm:w-auto" disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? "Saving..." : "Save Audience Snapshot"}
              </Button>
            </form>
          )}
        </div>
      </details>
    </section>
  );
}
