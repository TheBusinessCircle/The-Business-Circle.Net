"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronDown, Download, Loader2, Lock, Save, Sparkles } from "lucide-react";
import { saveCircleCardMediaKitInlineAction } from "@/actions/circle-card.actions";
import { CircleCardLinkFileUploadField } from "@/components/circle-card/circle-card-link-file-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS,
  CIRCLE_CARD_MEDIA_KIT_WORK_TYPES,
  circleCardMediaKitStatus,
  type CircleCardMediaKit
} from "@/lib/circle-card/content-blocks";

function Field({ label, name, defaultValue, type = "text", placeholder, maxLength = 120 }: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`media-kit-${name}`}>{label}</Label>
      <Input id={`media-kit-${name}`} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} maxLength={maxLength} />
    </div>
  );
}

function PlatformSelect({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`media-kit-${name}`}>{label}</Label>
      <select id={`media-kit-${name}`} name={name} defaultValue={defaultValue ?? ""} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">Not supplied</option>
        {CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
      </select>
    </div>
  );
}

function collaborationLabel(value: string) {
  return value === "Sponsored Posts" ? "Sponsored Content" : value;
}

export function CircleCardMediaKitManager({
  cardId,
  cardName,
  initialMediaKit,
  locked
}: {
  cardId: string;
  cardName: string;
  initialMediaKit: CircleCardMediaKit | null;
  locked: boolean;
}) {
  const [mediaKit, setMediaKit] = useState(initialMediaKit);
  const [externalMediaKitUrl, setExternalMediaKitUrl] = useState(initialMediaKit?.externalMediaKitUrl ?? "");
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMediaKit(initialMediaKit);
    setExternalMediaKitUrl(initialMediaKit?.externalMediaKitUrl ?? "");
  }, [initialMediaKit]);

  const status = circleCardMediaKitStatus(mediaKit);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveCircleCardMediaKitInlineAction(new FormData(event.currentTarget));
      if (result.ok) {
        setMediaKit(result.mediaKit);
        setExternalMediaKitUrl(result.mediaKit?.externalMediaKitUrl ?? "");
        setNotice(result.notice);
        setFormKey((current) => current + 1);
      } else {
        setNotice("");
        setError(result.message);
      }
    } catch {
      setError("The Media Kit could not be saved. Your current details are still shown.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="creator-media-kit" className="scroll-mt-24 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05]">
      <details data-circle-card-module-details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl font-semibold text-foreground">Live Media Kit</span>
              <Badge variant={locked ? "muted" : "premium"}>{locked ? "Locked" : "Creator Pro"}</Badge>
              {!locked ? <Badge variant="outline" className="border-cyan-300/24 text-cyan-100">{status}</Badge> : null}
            </span>
            <span className="mt-1 block text-sm text-muted">{locked ? "Unlock your professional creator profile" : status === "Not Started" ? "Set up Media Kit" : "Manage Media Kit"}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-silver transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-silver/12 p-3 sm:p-4">
          {locked ? (
            <div className="flex flex-col gap-3 rounded-xl border border-gold/22 bg-gold/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Lock size={15} />Live Media Kit is included with Creator Pro.</p>
                <p className="mt-1 text-sm text-muted">Your always up-to-date creator profile for brands, built into your Circle Card.</p>
              </div>
              <Link href="/circle-card/pro" className={`${buttonVariants({ variant: "outline" })} h-11 w-full sm:w-auto`}>Explore Creator Pro</Link>
            </div>
          ) : (
            <form key={formKey} onSubmit={save} className="space-y-5" noValidate>
              <input type="hidden" name="cardId" value={cardId} />
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-200">Creator profile: {cardName}</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">Your creator profile for brands</h3>
                <p className="mt-1 text-sm text-muted">Always up to date and built into your Circle Card. Only populated fields appear publicly.</p>
              </div>

              {notice ? <p role="status" className="rounded-xl border border-emerald-400/24 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{notice}</p> : null}
              {error ? <p role="alert" className="rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Creator Name" name="creatorName" defaultValue={mediaKit?.creatorName} />
                <Field label="Creator Tagline" name="creatorTagline" defaultValue={mediaKit?.creatorTagline} maxLength={240} />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="media-kit-what-i-create">What do you create?</Label>
                  <Textarea id="media-kit-what-i-create" name="whatICreate" defaultValue={mediaKit?.whatICreate.join(", ") ?? ""} rows={3} maxLength={600} placeholder="Tutorials, reviews, behind the scenes, short-form videos" />
                  <p className="text-xs text-muted">Tell brands and followers what type of content you are known for. Separate items with commas or new lines.</p>
                </div>
                <Field label="Primary Niche" name="primaryNiche" defaultValue={mediaKit?.primaryNiche} placeholder="Food, gaming, finance..." />
                <Field label="Secondary Niche" name="secondaryNiche" defaultValue={mediaKit?.secondaryNiche} />
                <Field label="Location" name="location" defaultValue={mediaKit?.location} />
                <Field label="Languages" name="languages" defaultValue={mediaKit?.languages.join(", ")} placeholder="English, Spanish" maxLength={300} />
                <Field label="Creator Email" name="creatorEmail" type="email" defaultValue={mediaKit?.creatorEmail} maxLength={254} />
                <Field label="Business Enquiries Email" name="businessEnquiriesEmail" type="email" defaultValue={mediaKit?.businessEnquiriesEmail} maxLength={254} />
                <Field label="Website" name="websiteUrl" type="url" defaultValue={mediaKit?.websiteUrl} placeholder="https://..." maxLength={2048} />
                <Field label="Community Link" name="communityUrl" type="url" defaultValue={mediaKit?.communityUrl} placeholder="https://..." maxLength={2048} />
                <Field label="Years Creating" name="yearsCreating" type="number" defaultValue={mediaKit?.yearsCreating} />
                <label className="flex min-h-20 items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground">
                  <input name="availableWorldwide" type="checkbox" value="on" defaultChecked={mediaKit?.availableWorldwide ?? false} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
                  <span>Available Worldwide<span className="mt-1 block text-xs text-muted">Open to collaborations beyond your home location.</span></span>
                </label>
              </div>

              <div className="rounded-xl border border-silver/14 bg-background/18 p-3 sm:p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles size={15} className="text-cyan-200" />Available for Collaborations</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {CIRCLE_CARD_MEDIA_KIT_WORK_TYPES.map((workType) => (
                    <label key={workType} className="flex min-h-11 items-center gap-2 rounded-xl border border-silver/12 bg-card/36 px-3 py-2 text-sm text-foreground">
                      <input name="availableFor" type="checkbox" value={workType} defaultChecked={mediaKit?.availableFor.includes(workType) ?? false} className="h-4 w-4 rounded border-border bg-background accent-primary" />
                      {collaborationLabel(workType)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-silver/14 bg-background/18 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-foreground">Audience Snapshot</h3>
                <p className="mt-1 text-xs text-muted">Enter only the audience figures you want brands to see. No platform APIs are connected.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <PlatformSelect label="Primary Platform" name="primaryPlatform" defaultValue={mediaKit?.primaryPlatform} />
                  <PlatformSelect label="Secondary Platform" name="secondaryPlatform" defaultValue={mediaKit?.secondaryPlatform} />
                  <Field label="Followers (optional)" name="followers" defaultValue={mediaKit?.followers} placeholder="125K" maxLength={40} />
                  <Field label="Subscribers (optional)" name="subscribers" defaultValue={mediaKit?.subscribers} placeholder="42K" maxLength={40} />
                  <Field label="Monthly Views (optional)" name="monthlyViews" defaultValue={mediaKit?.monthlyViews} placeholder="1.2M" maxLength={40} />
                  <Field label="Average Reach (optional)" name="averageReach" defaultValue={mediaKit?.averageReach} placeholder="85K" maxLength={40} />
                </div>
              </div>

              <div className="rounded-xl border border-silver/14 bg-background/18 p-3 sm:p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Download size={15} className="text-cyan-200" />Optional downloadable Media Kit</h3>
                <p className="mt-1 text-xs text-muted">Your live profile is the main Media Kit. You can also attach an existing PDF or safe external HTTPS version.</p>
                <div className="mt-3">
                  <CircleCardLinkFileUploadField
                    defaultFileUrl={mediaKit?.mediaKitFileUrl ?? ""}
                    defaultFileName={mediaKit?.mediaKitFileName ?? ""}
                    defaultFileMimeType={mediaKit?.mediaKitFileMimeType ?? ""}
                    label="Upload Media Kit PDF"
                    helperText="PDF only, up to 10MB"
                    uploadSuccessMessage="PDF uploaded. Save your Media Kit below."
                    documentOnly
                    onFileMetadataChange={(metadata) => {
                      if (metadata.fileUrl) setExternalMediaKitUrl("");
                      setError("");
                    }}
                  />
                </div>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="media-kit-external-url">Or External Media Kit URL</Label>
                  <Input id="media-kit-external-url" name="externalMediaKitUrl" type="url" value={externalMediaKitUrl} onChange={(event) => setExternalMediaKitUrl(event.target.value)} maxLength={2048} placeholder="https://..." />
                  <p className="text-xs text-muted">Clear the uploaded file before using an external URL.</p>
                </div>
              </div>

              <Button type="submit" className="h-11 w-full gap-2 sm:w-auto" disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? "Saving..." : "Save Live Media Kit"}
              </Button>
            </form>
          )}
        </div>
      </details>
    </section>
  );
}
