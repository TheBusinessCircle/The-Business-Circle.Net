"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ChevronDown, Copy, Eye, EyeOff, Loader2, Plus, Save, Star, Trash2 } from "lucide-react";
import {
  deleteCircleCardBrandPartnershipInlineAction,
  toggleCircleCardBrandPartnershipInlineAction,
  upsertCircleCardBrandPartnershipInlineAction
} from "@/actions/circle-card.actions";
import { CircleCardImageUploadField } from "@/components/circle-card/circle-card-image-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_BRAND_PARTNERSHIP_TYPES,
  circleCardBrandPartnershipStatus,
  type CircleCardBrandPartnership
} from "@/lib/circle-card/content-blocks";

function BrandMark({ item }: { item: CircleCardBrandPartnership }) {
  return item.brandLogo ? (
    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-silver/14 bg-white p-1.5">
      <img src={item.brandLogo} alt="" loading="lazy" className="h-full w-full object-contain" />
    </span>
  ) : (
    <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-cyan-300/18 bg-cyan-400/[0.07] font-display text-xl text-cyan-100">
      {item.brandName.slice(0, 2).toUpperCase()}
    </span>
  );
}

function PartnershipForm({ cardId, item, onSaved, onNotice }: {
  cardId: string;
  item?: CircleCardBrandPartnership;
  onSaved: (item: CircleCardBrandPartnership) => void;
  onNotice: (message: string) => void;
}) {
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [brandLogo, setBrandLogo] = useState(item?.brandLogo ?? "");
  const [brandName, setBrandName] = useState(item?.brandName ?? "");
  const [campaignTitle, setCampaignTitle] = useState(item?.campaignTitle ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [partnershipType, setPartnershipType] = useState(item?.partnershipType ?? "Sponsored Content");
  const [campaignDate, setCampaignDate] = useState(item?.campaignDate ?? "");
  const [campaignUrl, setCampaignUrl] = useState(item?.campaignUrl ?? "");
  const [testimonial, setTestimonial] = useState(item?.testimonial ?? "");
  const [isFeatured, setIsFeatured] = useState(item?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const idPrefix = item ? `brand-partnership-${item.id}` : `brand-partnership-new-${cardId}-${formKey}`;

  useEffect(() => {
    if (!item) return;
    setBrandLogo(item.brandLogo ?? "");
    setBrandName(item.brandName);
    setCampaignTitle(item.campaignTitle);
    setDescription(item.description);
    setPartnershipType(item.partnershipType);
    setCampaignDate(item.campaignDate);
    setCampaignUrl(item.campaignUrl ?? "");
    setTestimonial(item.testimonial ?? "");
    setIsFeatured(item.isFeatured);
    setIsActive(item.isActive);
  }, [item]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await upsertCircleCardBrandPartnershipInlineAction(new FormData(event.currentTarget));
      if (result.ok && result.item) {
        onSaved(result.item);
        onNotice(result.notice);
        if (!item) {
          setBrandLogo(""); setBrandName(""); setCampaignTitle(""); setDescription("");
          setPartnershipType("Sponsored Content"); setCampaignDate(""); setCampaignUrl("");
          setTestimonial(""); setIsFeatured(false); setIsActive(true);
          setFormKey((current) => current + 1);
        }
      } else if (!result.ok) setError(result.message);
    } catch {
      setError("The partnership could not be saved. Your current details are still shown.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} onSubmit={save} className="space-y-3" noValidate>
      <input type="hidden" name="cardId" value={cardId} />
      {item ? <input type="hidden" name="partnershipId" value={item.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CircleCardImageUploadField
            id={`${idPrefix}-logo`}
            name="brandLogo"
            label="Brand Logo (optional)"
            uploadKind="gallery-image"
            defaultValue={item?.brandLogo ?? ""}
            value={brandLogo}
            onValueChange={(value) => { setBrandLogo(value); setError(""); }}
            previewAlt={brandName ? `${brandName} logo preview` : "Brand logo preview"}
            helperText="JPG, PNG or WebP, up to 5MB. Use a clean square or landscape logo where possible."
            saveReminder="Upload the logo, then save this partnership."
            uploadSuccessMessage="Brand logo uploaded. Save this partnership below."
            previewClassName="rounded-xl bg-white object-contain p-2"
            showAdjustments={false}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-brand`}>Brand Name</Label>
          <Input id={`${idPrefix}-brand`} name="brandName" value={brandName} onChange={(event) => setBrandName(event.target.value)} maxLength={120} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-campaign`}>Campaign Title</Label>
          <Input id={`${idPrefix}-campaign`} name="campaignTitle" value={campaignTitle} onChange={(event) => setCampaignTitle(event.target.value)} maxLength={140} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
          <Textarea id={`${idPrefix}-description`} name="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={700} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-type`}>Partnership Type</Label>
          <select id={`${idPrefix}-type`} name="partnershipType" value={partnershipType} onChange={(event) => setPartnershipType(event.target.value as typeof partnershipType)} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {CIRCLE_CARD_BRAND_PARTNERSHIP_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-date`}>Campaign Date</Label>
          <Input id={`${idPrefix}-date`} name="campaignDate" type="date" value={campaignDate} onChange={(event) => setCampaignDate(event.target.value)} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-url`}>Campaign URL (optional)</Label>
          <Input id={`${idPrefix}-url`} name="campaignUrl" type="url" value={campaignUrl} onChange={(event) => setCampaignUrl(event.target.value)} maxLength={2048} placeholder="https://..." />
          <p className="text-xs text-muted">Safe HTTPS links only. Credentials are rejected.</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-testimonial`}>Brand Testimonial (optional)</Label>
          <Textarea id={`${idPrefix}-testimonial`} name="testimonial" value={testimonial} onChange={(event) => setTestimonial(event.target.value)} rows={3} maxLength={700} placeholder="A short approved quote from the brand." />
        </div>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground">
          <input name="isFeatured" type="checkbox" value="on" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
          <span>Featured<span className="mt-1 block text-xs text-muted">Featured campaigns appear first publicly.</span></span>
        </label>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground">
          <input name="isActive" type="checkbox" value="on" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
          <span>Visible<span className="mt-1 block text-xs text-muted">Hidden partnerships never appear publicly.</span></span>
        </label>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" className="h-10 gap-2" disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : item ? <Save size={14} /> : <Plus size={14} />}
        {saving ? "Saving..." : item ? "Save partnership" : "Add partnership"}
      </Button>
    </form>
  );
}

export function CircleCardBrandPartnershipsManager({ cardId, cardName, initialItems, itemLimit, hasProAccess }: {
  cardId: string;
  cardName: string;
  initialItems: CircleCardBrandPartnership[];
  itemLimit: number;
  hasProAccess: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingItemId, setPendingItemId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setItems(initialItems), [initialItems]);

  function saveItem(item: CircleCardBrandPartnership) {
    setItems((current) => [...current.filter((candidate) => candidate.id !== item.id), item]
      .sort((left, right) => left.sortOrder - right.sortOrder));
  }
  function showNotice(message: string) { setNotice(message); setError(""); }
  async function toggleItem(item: CircleCardBrandPartnership) {
    setPendingItemId(item.id);
    try {
      const result = await toggleCircleCardBrandPartnershipInlineAction({ cardId, partnershipId: item.id });
      if (result.ok && result.item) { saveItem(result.item); showNotice(result.notice); }
      else if (!result.ok) { setError(result.message); setNotice(""); }
    } catch { setError("The partnership visibility could not be changed."); }
    finally { setPendingItemId(""); }
  }
  async function deleteItem(item: CircleCardBrandPartnership) {
    setPendingItemId(item.id);
    try {
      const result = await deleteCircleCardBrandPartnershipInlineAction({ cardId, partnershipId: item.id });
      if (result.ok) { setItems((current) => current.filter((candidate) => candidate.id !== item.id)); showNotice(result.notice); }
      else { setError(result.message); setNotice(""); }
    } catch { setError("The partnership could not be deleted."); }
    finally { setPendingItemId(""); }
  }

  const activeCount = items.filter((item) => item.isActive).length;
  const status = circleCardBrandPartnershipStatus(items);
  const atLimit = items.length >= itemLimit;

  return (
    <section id="creator-brand-partnerships" className="scroll-mt-24 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05]">
      <details data-circle-card-module-details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl font-semibold text-foreground">Brand Partnerships</span>
              <Badge variant={hasProAccess ? "premium" : "outline"}>{hasProAccess ? "Creator Pro" : "Creator Free"}</Badge>
              <Badge variant="muted">{status}</Badge>
              {items.length ? <Badge variant="muted">{activeCount} Active</Badge> : null}
            </span>
            <span className="mt-1 block text-sm text-muted">{items.length ? "Manage Brand Partnerships" : "Add your first collaboration"}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-silver transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-silver/12 p-3 sm:p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-200">Partnership portfolio: {cardName}</p>
          {!hasProAccess ? <p className="mt-3 rounded-xl border border-gold/22 bg-gold/8 px-3 py-2 text-sm text-foreground">Unlock unlimited Brand Partnerships with Creator Pro. Free includes up to 2 partnerships.</p> : null}
          {notice ? <p role="status" className="mt-3 rounded-xl border border-emerald-400/24 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{notice}</p> : null}
          {error ? <p role="alert" className="mt-3 rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-4 grid gap-2">
            {items.map((item) => {
              const pending = pendingItemId === item.id;
              return (
                <details key={item.id} className="group/item rounded-xl border border-silver/14 bg-background/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-3">
                      <BrandMark item={item} />
                      <span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground"><span className="truncate">{item.brandName}</span><Badge variant="muted">{item.partnershipType}</Badge>{item.isFeatured ? <Badge variant="premium"><Star size={11} className="mr-1" />Featured</Badge> : null}<Badge variant={item.isActive ? "outline" : "muted"}>{item.isActive ? "Visible" : "Hidden"}</Badge></span><span className="mt-1 block truncate text-xs text-muted">{item.campaignTitle}</span></span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-cyan-100">Edit<ChevronDown size={15} className="transition-transform group-open/item:rotate-180" /></span>
                  </summary>
                  <div className="border-t border-silver/12 p-3">
                    <PartnershipForm cardId={cardId} item={item} onSaved={saveItem} onNotice={showNotice} />
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
            {!items.length ? <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">Show previous collaborations, or highlight what brands you want to work with.</p> : null}
          </div>
          <details className="group/add mt-3 rounded-xl border border-cyan-300/18 bg-background/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden"><span>{atLimit ? "Partnership limit reached" : "Add partnership"}</span><span className="flex items-center gap-2 text-xs font-normal text-muted">{items.length}/{itemLimit}<ChevronDown size={15} className="transition-transform group-open/add:rotate-180" /></span></summary>
            <div className="border-t border-silver/12 p-3">{atLimit ? <p className="text-sm text-muted">{hasProAccess ? "You have reached the Creator Pro limit." : "Unlock unlimited Brand Partnerships with Creator Pro."}</p> : <PartnershipForm cardId={cardId} onSaved={saveItem} onNotice={showNotice} />}</div>
          </details>
        </div>
      </details>
    </section>
  );
}
