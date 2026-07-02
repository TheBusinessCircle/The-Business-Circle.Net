"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  ShoppingBag,
  Star,
  Trash2
} from "lucide-react";
import {
  deleteCircleCardCreatorOfferInlineAction,
  toggleCircleCardCreatorOfferInlineAction,
  upsertCircleCardCreatorOfferInlineAction
} from "@/actions/circle-card.actions";
import { CircleCardImageUploadField } from "@/components/circle-card/circle-card-image-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_CREATOR_OFFER_TYPES,
  circleCardCreatorOfferStatus,
  type CircleCardCreatorOffer
} from "@/lib/circle-card/content-blocks";

const CTA_LABELS = [
  "View Offer",
  "Shop Now",
  "Join Community",
  "Download",
  "Get Template",
  "Support Me",
  "Start Course",
  "Learn More"
];

function CreatorOfferForm({
  cardId,
  item,
  onSaved,
  onNotice
}: {
  cardId: string;
  item?: CircleCardCreatorOffer;
  onSaved: (item: CircleCardCreatorOffer) => void;
  onNotice: (message: string) => void;
}) {
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState(item?.image ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [offerType, setOfferType] = useState(item?.offerType ?? "Affiliate");
  const [price, setPrice] = useState(item?.price ?? "");
  const [previousPrice, setPreviousPrice] = useState(item?.previousPrice ?? "");
  const [badge, setBadge] = useState(item?.badge ?? "");
  const [ctaLabel, setCtaLabel] = useState(item?.ctaLabel ?? "View Offer");
  const [ctaUrl, setCtaUrl] = useState(item?.ctaUrl ?? "");
  const [featured, setFeatured] = useState(item?.featured ?? false);
  const [active, setActive] = useState(item?.active ?? true);
  const [expiryDate, setExpiryDate] = useState(item?.expiryDate ?? "");
  const idPrefix = item ? `creator-offer-${item.id}` : `creator-offer-new-${cardId}-${formKey}`;

  useEffect(() => {
    if (!item) return;
    setImage(item.image);
    setTitle(item.title);
    setDescription(item.description);
    setOfferType(item.offerType);
    setPrice(item.price ?? "");
    setPreviousPrice(item.previousPrice ?? "");
    setBadge(item.badge ?? "");
    setCtaLabel(item.ctaLabel);
    setCtaUrl(item.ctaUrl);
    setFeatured(item.featured);
    setActive(item.active);
    setExpiryDate(item.expiryDate ?? "");
  }, [item]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await upsertCircleCardCreatorOfferInlineAction(new FormData(event.currentTarget));
      if (result.ok && result.item) {
        onSaved(result.item);
        onNotice(result.notice);
        if (!item) {
          setImage("");
          setTitle("");
          setDescription("");
          setOfferType("Affiliate");
          setPrice("");
          setPreviousPrice("");
          setBadge("");
          setCtaLabel("View Offer");
          setCtaUrl("");
          setFeatured(false);
          setActive(true);
          setExpiryDate("");
          setFormKey((current) => current + 1);
        }
      } else if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("The offer could not be saved. Your current details are still shown.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} onSubmit={save} className="space-y-3" noValidate>
      <input type="hidden" name="cardId" value={cardId} />
      {item ? <input type="hidden" name="creatorOfferId" value={item.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CircleCardImageUploadField
            id={`${idPrefix}-image`}
            name="image"
            label="Offer image"
            uploadKind="gallery-image"
            defaultValue={item?.image ?? ""}
            value={image}
            onValueChange={(value) => { setImage(value); setError(""); }}
            previewAlt={title || "Creator offer image preview"}
            helperText="Required. JPG, PNG or WebP, up to 5MB."
            saveReminder="Upload the image, then save this offer."
            uploadSuccessMessage="Offer image uploaded. Save this offer below."
            previewClassName="rounded-xl"
            showAdjustments={false}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input id={`${idPrefix}-title`} name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-type`}>Offer type</Label>
          <select id={`${idPrefix}-type`} name="offerType" value={offerType} onChange={(event) => setOfferType(event.target.value as typeof offerType)} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {CIRCLE_CARD_CREATOR_OFFER_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
          <Textarea id={`${idPrefix}-description`} name="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={700} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-price`}>Price (optional)</Label>
          <Input id={`${idPrefix}-price`} name="price" value={price} onChange={(event) => setPrice(event.target.value)} maxLength={60} placeholder="£29 or Free" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-previous-price`}>Previous price (optional)</Label>
          <Input id={`${idPrefix}-previous-price`} name="previousPrice" value={previousPrice} onChange={(event) => setPreviousPrice(event.target.value)} maxLength={60} placeholder="£49" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-badge`}>Badge (optional)</Label>
          <Input id={`${idPrefix}-badge`} name="badge" value={badge} onChange={(event) => setBadge(event.target.value)} maxLength={40} placeholder="Best Seller" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-expiry`}>Expiry date (optional)</Label>
          <Input id={`${idPrefix}-expiry`} name="expiryDate" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-cta-label`}>CTA label</Label>
          <Input id={`${idPrefix}-cta-label`} name="ctaLabel" list={`${idPrefix}-cta-labels`} value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} maxLength={40} required />
          <datalist id={`${idPrefix}-cta-labels`}>{CTA_LABELS.map((label) => <option key={label} value={label} />)}</datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-cta-url`}>CTA URL</Label>
          <Input id={`${idPrefix}-cta-url`} name="ctaUrl" type="url" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} maxLength={2048} placeholder="https://..." required />
          <p className="text-xs text-muted">Safe HTTPS links only. Credentials are rejected.</p>
        </div>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground">
          <input name="featured" type="checkbox" value="on" checked={featured} onChange={(event) => setFeatured(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
          <span>Featured<span className="mt-1 block text-xs text-muted">Pins this offer ahead of the rest.</span></span>
        </label>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground">
          <input name="active" type="checkbox" value="on" checked={active} onChange={(event) => setActive(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
          <span>Visible<span className="mt-1 block text-xs text-muted">Hidden offers never appear publicly.</span></span>
        </label>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" className="h-10 gap-2" disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : item ? <Save size={14} /> : <Plus size={14} />}
        {saving ? "Saving..." : item ? "Save offer" : "Add offer"}
      </Button>
    </form>
  );
}

export function CircleCardCreatorOffersManager({
  cardId,
  cardName,
  initialItems,
  itemLimit,
  hasProAccess
}: {
  cardId: string;
  cardName: string;
  initialItems: CircleCardCreatorOffer[];
  itemLimit: number;
  hasProAccess: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingItemId, setPendingItemId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setItems(initialItems), [initialItems]);

  function saveItem(item: CircleCardCreatorOffer) {
    setItems((current) => [...current.filter((candidate) => candidate.id !== item.id), item]
      .sort((left, right) => left.sortOrder - right.sortOrder));
  }
  function showNotice(message: string) { setNotice(message); setError(""); }
  async function toggleItem(item: CircleCardCreatorOffer) {
    setPendingItemId(item.id);
    try {
      const result = await toggleCircleCardCreatorOfferInlineAction({ cardId, creatorOfferId: item.id });
      if (result.ok && result.item) { saveItem(result.item); showNotice(result.notice); }
      else if (!result.ok) { setError(result.message); setNotice(""); }
    } catch { setError("The offer visibility could not be changed."); }
    finally { setPendingItemId(""); }
  }
  async function deleteItem(item: CircleCardCreatorOffer) {
    setPendingItemId(item.id);
    try {
      const result = await deleteCircleCardCreatorOfferInlineAction({ cardId, creatorOfferId: item.id });
      if (result.ok) { setItems((current) => current.filter((candidate) => candidate.id !== item.id)); showNotice(result.notice); }
      else { setError(result.message); setNotice(""); }
    } catch { setError("The offer could not be deleted."); }
    finally { setPendingItemId(""); }
  }

  const activeCount = items.filter((item) => item.active).length;
  const status = circleCardCreatorOfferStatus(items);
  const atLimit = items.length >= itemLimit;

  return (
    <section id="creator-offers" className="scroll-mt-24 rounded-2xl border border-gold/22 bg-gold/[0.045]">
      <details data-circle-card-module-details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl font-semibold text-foreground">Creator Offers</span>
              <Badge variant={hasProAccess ? "premium" : "outline"}>{hasProAccess ? "Creator Pro" : "Creator Free"}</Badge>
              <Badge variant={status === "Complete" ? "outline" : "muted"}>{status}</Badge>
            </span>
            <span className="mt-1 block text-sm text-muted">{items.length ? "Manage Creator Offers" : "Add your first offer"}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-silver transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-silver/12 p-3 sm:p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Creator shop: {cardName}</p>
          {!hasProAccess ? <p className="mt-3 rounded-xl border border-gold/22 bg-gold/8 px-3 py-2 text-sm text-foreground">Unlock unlimited Creator Offers with Creator Pro. Free includes up to 2 offers.</p> : null}
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
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground"><span className="max-w-full truncate">{item.title}</span><Badge variant="muted">{item.offerType}</Badge>{item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">{item.price ? <span>{item.price}</span> : null}{item.featured ? <span className="inline-flex items-center gap-1 text-gold"><Star size={11} />Featured</span> : null}<span>{item.active ? "Visible" : "Hidden"}</span></span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-cyan-100">Edit<ChevronDown size={15} className="transition-transform group-open/item:rotate-180" /></span>
                  </summary>
                  <div className="border-t border-silver/12 p-3">
                    <CreatorOfferForm cardId={cardId} item={item} onSaved={saveItem} onNotice={showNotice} />
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
            {!items.length ? <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">Promote affiliate links, merch, courses, communities or paid content.</p> : null}
          </div>
          <details className="group/add mt-3 rounded-xl border border-gold/20 bg-background/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden"><span className="inline-flex items-center gap-2"><ShoppingBag size={15} />{atLimit ? "Offer limit reached" : "Add offer"}</span><span className="flex items-center gap-2 text-xs font-normal text-muted">{activeCount} visible · {items.length}/{itemLimit}<ChevronDown size={15} className="transition-transform group-open/add:rotate-180" /></span></summary>
            <div className="border-t border-silver/12 p-3">{atLimit ? <p className="text-sm text-muted">{hasProAccess ? "You have reached the Creator Pro limit." : "Unlock unlimited Creator Offers with Creator Pro."}</p> : <CreatorOfferForm cardId={cardId} onSaved={saveItem} onNotice={showNotice} />}</div>
          </details>
        </div>
      </details>
    </section>
  );
}
