"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDown,
  Award,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2
} from "lucide-react";
import {
  deleteCircleCardPressProofItemInlineAction,
  toggleCircleCardPressProofItemInlineAction,
  upsertCircleCardPressProofItemInlineAction
} from "@/actions/circle-card.actions";
import { CircleCardImageUploadField } from "@/components/circle-card/circle-card-image-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_PRESS_PROOF_TYPES,
  circleCardPressProofStatus,
  type CircleCardPressProofItem
} from "@/lib/circle-card/content-blocks";

function PressProofForm({
  cardId,
  item,
  onSaved,
  onNotice
}: {
  cardId: string;
  item?: CircleCardPressProofItem;
  onSaved: (item: CircleCardPressProofItem) => void;
  onNotice: (message: string) => void;
}) {
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState(item?.image ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [proofType, setProofType] = useState(item?.proofType ?? "Press Mention");
  const [sourceName, setSourceName] = useState(item?.sourceName ?? "");
  const [sourceUrl, setSourceUrl] = useState(item?.sourceUrl ?? "");
  const [date, setDate] = useState(item?.date ?? "");
  const [badge, setBadge] = useState(item?.badge ?? "");
  const [featured, setFeatured] = useState(item?.featured ?? false);
  const [active, setActive] = useState(item?.active ?? true);
  const idPrefix = item ? `press-proof-${item.id}` : `press-proof-new-${cardId}-${formKey}`;

  useEffect(() => {
    if (!item) return;
    setImage(item.image);
    setTitle(item.title);
    setDescription(item.description);
    setProofType(item.proofType);
    setSourceName(item.sourceName ?? "");
    setSourceUrl(item.sourceUrl ?? "");
    setDate(item.date ?? "");
    setBadge(item.badge ?? "");
    setFeatured(item.featured);
    setActive(item.active);
  }, [item]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await upsertCircleCardPressProofItemInlineAction(new FormData(event.currentTarget));
      if (result.ok && result.item) {
        onSaved(result.item);
        onNotice(result.notice);
        if (!item) {
          setImage("");
          setTitle("");
          setDescription("");
          setProofType("Press Mention");
          setSourceName("");
          setSourceUrl("");
          setDate("");
          setBadge("");
          setFeatured(false);
          setActive(true);
          setFormKey((current) => current + 1);
        }
      } else if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("The proof item could not be saved. Your current details are still shown.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} onSubmit={save} className="space-y-3" noValidate>
      <input type="hidden" name="cardId" value={cardId} />
      {item ? <input type="hidden" name="pressProofItemId" value={item.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CircleCardImageUploadField
            id={`${idPrefix}-image`}
            name="image"
            label="Proof image"
            uploadKind="gallery-image"
            defaultValue={item?.image ?? ""}
            value={image}
            onValueChange={(value) => { setImage(value); setError(""); }}
            previewAlt={title || "Press and proof image preview"}
            helperText="Required. Upload a JPG, PNG or WebP screenshot, cover or proof image up to 5MB."
            saveReminder="Upload the image, then save this proof item."
            uploadSuccessMessage="Proof image uploaded. Save this proof item below."
            previewClassName="rounded-xl"
            showAdjustments={false}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input id={`${idPrefix}-title`} name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-type`}>Proof type</Label>
          <select id={`${idPrefix}-type`} name="proofType" value={proofType} onChange={(event) => setProofType(event.target.value as typeof proofType)} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {CIRCLE_CARD_PRESS_PROOF_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
          <Textarea id={`${idPrefix}-description`} name="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={700} required />
          <p className="text-xs text-muted">Show brands why they can trust you.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-source-name`}>Source name (optional)</Label>
          <Input id={`${idPrefix}-source-name`} name="sourceName" value={sourceName} onChange={(event) => setSourceName(event.target.value)} maxLength={120} placeholder="Publication, podcast or brand" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-date`}>Date (optional)</Label>
          <Input id={`${idPrefix}-date`} name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-source-url`}>Source URL (optional)</Label>
          <Input id={`${idPrefix}-source-url`} name="sourceUrl" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} maxLength={2048} placeholder="https://..." />
          <p className="text-xs text-muted">Safe HTTPS links only. Credentials are rejected.</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-badge`}>Badge (optional)</Label>
          <Input id={`${idPrefix}-badge`} name="badge" value={badge} onChange={(event) => setBadge(event.target.value)} maxLength={40} placeholder="Featured In, Award Winner, 1M Views" />
        </div>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground">
          <input name="featured" type="checkbox" value="on" checked={featured} onChange={(event) => setFeatured(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
          <span>Featured<span className="mt-1 block text-xs text-muted">Pins this proof ahead of the rest.</span></span>
        </label>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground">
          <input name="active" type="checkbox" value="on" checked={active} onChange={(event) => setActive(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
          <span>Visible<span className="mt-1 block text-xs text-muted">Hidden proof never appears publicly.</span></span>
        </label>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" className="h-10 gap-2" disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : item ? <Save size={14} /> : <Plus size={14} />}
        {saving ? "Saving..." : item ? "Save proof" : "Add proof"}
      </Button>
    </form>
  );
}

export function CircleCardPressProofManager({
  cardId,
  cardName,
  initialItems,
  itemLimit,
  hasProAccess
}: {
  cardId: string;
  cardName: string;
  initialItems: CircleCardPressProofItem[];
  itemLimit: number;
  hasProAccess: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingItemId, setPendingItemId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setItems(initialItems), [initialItems]);

  function saveItem(item: CircleCardPressProofItem) {
    setItems((current) => [...current.filter((candidate) => candidate.id !== item.id), item]
      .sort((left, right) => left.sortOrder - right.sortOrder));
  }
  function showNotice(message: string) { setNotice(message); setError(""); }
  async function toggleItem(item: CircleCardPressProofItem) {
    setPendingItemId(item.id);
    try {
      const result = await toggleCircleCardPressProofItemInlineAction({ cardId, pressProofItemId: item.id });
      if (result.ok && result.item) { saveItem(result.item); showNotice(result.notice); }
      else if (!result.ok) { setError(result.message); setNotice(""); }
    } catch { setError("The proof visibility could not be changed."); }
    finally { setPendingItemId(""); }
  }
  async function deleteItem(item: CircleCardPressProofItem) {
    setPendingItemId(item.id);
    try {
      const result = await deleteCircleCardPressProofItemInlineAction({ cardId, pressProofItemId: item.id });
      if (result.ok) { setItems((current) => current.filter((candidate) => candidate.id !== item.id)); showNotice(result.notice); }
      else { setError(result.message); setNotice(""); }
    } catch { setError("The proof item could not be deleted."); }
    finally { setPendingItemId(""); }
  }

  const activeCount = items.filter((item) => item.active).length;
  const status = circleCardPressProofStatus(items);
  const atLimit = items.length >= itemLimit;

  return (
    <section id="creator-press-proof" className="scroll-mt-24 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.045]">
      <details data-circle-card-module-details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl font-semibold text-foreground">Press &amp; Proof</span>
              <Badge variant={hasProAccess ? "premium" : "outline"}>{hasProAccess ? "Creator Pro" : "Creator Free"}</Badge>
              <Badge variant={status === "Complete" ? "outline" : "muted"}>{status}</Badge>
            </span>
            <span className="mt-1 block text-sm text-muted">{items.length ? "Manage Press & Proof" : "Add your first proof of work"}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-silver transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-silver/12 p-3 sm:p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-200">Credibility Builder: {cardName}</p>
          {!hasProAccess ? <p className="mt-3 rounded-xl border border-gold/22 bg-gold/8 px-3 py-2 text-sm text-foreground">Unlock unlimited Press & Proof with Creator Pro. Free includes up to 2 proof items.</p> : null}
          {notice ? <p role="status" className="mt-3 rounded-xl border border-emerald-400/24 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{notice}</p> : null}
          {error ? <p role="alert" className="mt-3 rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-4 grid gap-2">
            {items.map((item) => {
              const pending = pendingItemId === item.id;
              return (
                <details key={item.id} className="group/item min-w-0 overflow-hidden rounded-xl border border-silver/14 bg-background/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-silver/14 bg-background/40"><img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" /></span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground"><span className="max-w-full truncate">{item.title}</span><Badge variant="muted">{item.proofType}</Badge>{item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">{item.sourceName ? <span>{item.sourceName}</span> : null}{item.featured ? <span className="inline-flex items-center gap-1 text-gold"><Star size={11} />Featured</span> : null}<span>{item.active ? "Visible" : "Hidden"}</span></span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-cyan-100">Edit<ChevronDown size={15} className="transition-transform group-open/item:rotate-180" /></span>
                  </summary>
                  <div className="border-t border-silver/12 p-3">
                    <PressProofForm cardId={cardId} item={item} onSaved={saveItem} onNotice={showNotice} />
                    <div className="mt-3 grid gap-2 border-t border-silver/12 pt-3 sm:grid-cols-2 xl:grid-cols-4">
                      <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2" disabled={pending} onClick={() => toggleItem(item)}>{pending ? <Loader2 size={14} className="animate-spin" /> : item.active ? <EyeOff size={14} /> : <Eye size={14} />}{item.active ? "Hide" : "Show"}</Button>
                      <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2" disabled><Copy size={14} />Duplicate — Coming Soon</Button>
                      <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2" disabled><ArrowDown size={14} />Reorder — Coming Soon</Button>
                      <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2 text-destructive" disabled={pending} onClick={() => deleteItem(item)}>{pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}Delete</Button>
                    </div>
                  </div>
                </details>
              );
            })}
            {!items.length ? <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">Add press mentions, milestones and proof of results that help brands understand your credibility.</p> : null}
          </div>
          <details className="group/add mt-3 rounded-xl border border-cyan-300/18 bg-background/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden"><span className="inline-flex items-center gap-2"><Award size={15} />{atLimit ? "Proof limit reached" : "Add proof"}</span><span className="flex items-center gap-2 text-xs font-normal text-muted">{activeCount} visible · {items.length}/{itemLimit}<ChevronDown size={15} className="transition-transform group-open/add:rotate-180" /></span></summary>
            <div className="border-t border-silver/12 p-3">{atLimit ? <p className="text-sm text-muted">{hasProAccess ? "You have reached the Creator Pro limit." : "Unlock unlimited Press & Proof with Creator Pro."}</p> : <PressProofForm cardId={cardId} onSaved={saveItem} onNotice={showNotice} />}</div>
          </details>
        </div>
      </details>
    </section>
  );
}
