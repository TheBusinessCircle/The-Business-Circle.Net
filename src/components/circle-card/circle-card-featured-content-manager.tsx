"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Play,
  Plus,
  Radio,
  Save,
  Star,
  Trash2
} from "lucide-react";
import {
  deleteCircleCardFeaturedContentItemInlineAction,
  toggleCircleCardFeaturedContentItemInlineAction,
  upsertCircleCardFeaturedContentItemInlineAction
} from "@/actions/circle-card.actions";
import { CircleCardImageUploadField } from "@/components/circle-card/circle-card-image-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS,
  type CircleCardFeaturedContentItem
} from "@/lib/circle-card/content-blocks";

function PlatformMark({ platform, className = "h-10 w-10" }: { platform: string; className?: string }) {
  const Icon = ["YouTube", "TikTok", "Twitch", "Kick"].includes(platform)
    ? Play
    : ["Spotify", "Apple Podcasts", "Podcast RSS"].includes(platform)
      ? Radio
      : Globe2;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-cyan-300/18 bg-cyan-400/[0.07] text-cyan-100 ${className}`}>
      <Icon size={18} aria-hidden="true" />
      <span className="sr-only">{platform}</span>
    </span>
  );
}

function FeaturedContentForm({
  cardId,
  item,
  onSaved,
  onNotice
}: {
  cardId: string;
  item?: CircleCardFeaturedContentItem;
  onSaved: (item: CircleCardFeaturedContentItem) => void;
  onNotice: (message: string) => void;
}) {
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(item?.thumbnailUrl ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [platform, setPlatform] = useState(item?.platform ?? "YouTube");
  const [url, setUrl] = useState(item?.url ?? "");
  const [publishedDate, setPublishedDate] = useState(item?.publishedDate ?? "");
  const [isFeatured, setIsFeatured] = useState(item?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const idPrefix = item ? `featured-content-${item.id}` : `featured-content-new-${cardId}-${formKey}`;

  useEffect(() => {
    if (!item) return;
    setThumbnailUrl(item.thumbnailUrl ?? "");
    setTitle(item.title);
    setDescription(item.description);
    setPlatform(item.platform);
    setUrl(item.url);
    setPublishedDate(item.publishedDate ?? "");
    setIsFeatured(item.isFeatured);
    setIsActive(item.isActive);
  }, [item]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await upsertCircleCardFeaturedContentItemInlineAction(new FormData(event.currentTarget));
      if (result.ok && result.item) {
        onSaved(result.item);
        onNotice(result.notice);
        if (!item) {
          setThumbnailUrl(""); setTitle(""); setDescription(""); setPlatform("YouTube");
          setUrl(""); setPublishedDate(""); setIsFeatured(false); setIsActive(true);
          setFormKey((current) => current + 1);
        }
      } else if (!result.ok) setError(result.message);
    } catch {
      setError("The content item could not be saved. Your current item is still shown.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} onSubmit={save} className="space-y-3" noValidate>
      <input type="hidden" name="cardId" value={cardId} />
      {item ? <input type="hidden" name="featuredContentItemId" value={item.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CircleCardImageUploadField
            id={`${idPrefix}-thumbnail`}
            name="thumbnailUrl"
            label="Thumbnail (optional)"
            uploadKind="gallery-image"
            defaultValue={item?.thumbnailUrl ?? ""}
            value={thumbnailUrl}
            onValueChange={(value) => { setThumbnailUrl(value); setError(""); }}
            previewAlt={title || "Featured content thumbnail preview"}
            helperText="JPG, PNG or WebP, up to 5MB. YouTube can use its existing preview when no thumbnail is supplied."
            saveReminder="Upload the thumbnail, then save this content item."
            uploadSuccessMessage="Thumbnail uploaded. Save this content item below."
            previewClassName="rounded-xl"
            showAdjustments={false}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input id={`${idPrefix}-title`} name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-platform`}>Platform</Label>
          <select id={`${idPrefix}-platform`} name="platform" value={platform} onChange={(event) => setPlatform(event.target.value as typeof platform)} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
          <Textarea id={`${idPrefix}-description`} name="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={600} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-url`}>Content URL</Label>
          <Input id={`${idPrefix}-url`} name="url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} maxLength={2048} placeholder="https://..." required />
          <p className="text-xs text-muted">Safe HTTPS links only. Credentials are rejected.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-published-date`}>Published date (optional)</Label>
          <Input id={`${idPrefix}-published-date`} name="publishedDate" type="date" value={publishedDate} onChange={(event) => setPublishedDate(event.target.value)} />
        </div>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground">
          <input name="isFeatured" type="checkbox" value="on" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
          <span>Featured<span className="mt-1 block text-xs text-muted">Pins this content ahead of the rest.</span></span>
        </label>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground">
          <input name="isActive" type="checkbox" value="on" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
          <span>Visible<span className="mt-1 block text-xs text-muted">Hidden content never appears publicly.</span></span>
        </label>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" className="h-10 gap-2" disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : item ? <Save size={14} /> : <Plus size={14} />}
        {saving ? "Saving..." : item ? "Save content" : "Add content"}
      </Button>
    </form>
  );
}

export function CircleCardFeaturedContentManager({
  cardId,
  cardName,
  initialItems,
  itemLimit,
  hasProAccess
}: {
  cardId: string;
  cardName: string;
  initialItems: CircleCardFeaturedContentItem[];
  itemLimit: number;
  hasProAccess: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingItemId, setPendingItemId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setItems(initialItems), [initialItems]);

  function saveItem(item: CircleCardFeaturedContentItem) {
    setItems((current) => [...current.filter((candidate) => candidate.id !== item.id), item]
      .sort((left, right) => left.sortOrder - right.sortOrder));
  }
  function showNotice(message: string) { setNotice(message); setError(""); }
  async function toggleItem(item: CircleCardFeaturedContentItem) {
    setPendingItemId(item.id);
    try {
      const result = await toggleCircleCardFeaturedContentItemInlineAction({ cardId, featuredContentItemId: item.id });
      if (result.ok && result.item) { saveItem(result.item); showNotice(result.notice); }
      else if (!result.ok) { setError(result.message); setNotice(""); }
    } catch { setError("The content visibility could not be changed."); }
    finally { setPendingItemId(""); }
  }
  async function deleteItem(item: CircleCardFeaturedContentItem) {
    setPendingItemId(item.id);
    try {
      const result = await deleteCircleCardFeaturedContentItemInlineAction({ cardId, featuredContentItemId: item.id });
      if (result.ok) { setItems((current) => current.filter((candidate) => candidate.id !== item.id)); showNotice(result.notice); }
      else { setError(result.message); setNotice(""); }
    } catch { setError("The content item could not be deleted."); }
    finally { setPendingItemId(""); }
  }

  const activeCount = items.filter((item) => item.isActive).length;
  const atLimit = items.length >= itemLimit;

  return (
    <section id="creator-featured-content" className="scroll-mt-24 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05]">
      <details data-circle-card-module-details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl font-semibold text-foreground">Featured Content</span>
              <Badge variant={hasProAccess ? "premium" : "outline"}>{hasProAccess ? "Creator Pro" : "Creator Free"}</Badge>
              <Badge variant="muted">{items.length ? `${activeCount} Active` : "0 Items"}</Badge>
            </span>
            <span className="mt-1 block text-sm text-muted">{items.length ? "Manage Featured Content" : "Add first content"}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-silver transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-silver/12 p-3 sm:p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-200">Creator portfolio: {cardName}</p>
          {!hasProAccess ? <p className="mt-3 rounded-xl border border-gold/22 bg-gold/8 px-3 py-2 text-sm text-foreground">Unlock unlimited Featured Content with Creator Pro. Free includes up to 3 items.</p> : null}
          {notice ? <p role="status" className="mt-3 rounded-xl border border-emerald-400/24 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{notice}</p> : null}
          {error ? <p role="alert" className="mt-3 rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-4 grid gap-2">
            {items.map((item) => {
              const pending = pendingItemId === item.id;
              return (
                <details key={item.id} className="group/item rounded-xl border border-silver/14 bg-background/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-3">
                      {item.thumbnailUrl ? <span className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-silver/14"><img src={item.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" /></span> : <PlatformMark platform={item.platform} className="h-16 w-16" />}
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground"><span className="truncate">{item.title}</span><Badge variant="muted">{item.platform}</Badge>{item.isFeatured ? <Badge variant="premium"><Star size={11} className="mr-1" />Featured</Badge> : null}<Badge variant={item.isActive ? "outline" : "muted"}>{item.isActive ? "Visible" : "Hidden"}</Badge></span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-cyan-100">Edit<ChevronDown size={15} className="transition-transform group-open/item:rotate-180" /></span>
                  </summary>
                  <div className="border-t border-silver/12 p-3">
                    <FeaturedContentForm cardId={cardId} item={item} onSaved={saveItem} onNotice={showNotice} />
                    <div className="mt-3 grid gap-2 border-t border-silver/12 pt-3 sm:grid-cols-2 xl:grid-cols-4">
                      <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2" disabled={pending} onClick={() => toggleItem(item)}>{pending ? <Loader2 size={14} className="animate-spin" /> : item.isActive ? <EyeOff size={14} /> : <Eye size={14} />}{item.isActive ? "Hide" : "Show"}</Button>
                      <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2" disabled><Copy size={14} />Duplicate — Coming Soon</Button>
                      <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2" disabled><ArrowDown size={14} />Reorder — Coming Soon</Button>
                      <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2 text-destructive" disabled={pending} onClick={() => deleteItem(item)}>{pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}Delete</Button>
                    </div>
                  </div>
                </details>
              );
            })}
            {!items.length ? <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">Add your best video, post or episode so visitors instantly understand your content.</p> : null}
          </div>
          <details className="group/add mt-3 rounded-xl border border-cyan-300/18 bg-background/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden"><span>{atLimit ? "Content limit reached" : "Add content"}</span><span className="flex items-center gap-2 text-xs font-normal text-muted">{items.length}/{itemLimit}<ChevronDown size={15} className="transition-transform group-open/add:rotate-180" /></span></summary>
            <div className="border-t border-silver/12 p-3">{atLimit ? <p className="text-sm text-muted">{hasProAccess ? "You have reached the Creator Pro limit." : "Unlock unlimited Featured Content with Creator Pro."}</p> : <FeaturedContentForm cardId={cardId} onSaved={saveItem} onNotice={showNotice} />}</div>
          </details>
        </div>
      </details>
    </section>
  );
}
