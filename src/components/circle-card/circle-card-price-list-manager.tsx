"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ChevronDown, Eye, EyeOff, Loader2, Plus, Save, Star, Trash2 } from "lucide-react";
import {
  deleteCircleCardPriceListItemInlineAction,
  toggleCircleCardPriceListItemInlineAction,
  upsertCircleCardPriceListItemInlineAction
} from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CircleCardPriceListItem } from "@/lib/circle-card/content-blocks";

function PriceListForm({ cardId, item, onSaved, onNotice }: {
  cardId: string;
  item?: CircleCardPriceListItem;
  onSaved: (item: CircleCardPriceListItem) => void;
  onNotice: (message: string) => void;
}) {
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price ?? "");
  const [priceNote, setPriceNote] = useState(item?.priceNote ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [ctaLabel, setCtaLabel] = useState(item?.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(item?.ctaUrl ?? "");
  const [isFeatured, setIsFeatured] = useState(item?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const idPrefix = item ? `price-${item.id}` : `price-new-${cardId}-${formKey}`;

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setDescription(item.description ?? "");
    setPrice(item.price);
    setPriceNote(item.priceNote ?? "");
    setCategory(item.category ?? "");
    setCtaLabel(item.ctaLabel ?? "");
    setCtaUrl(item.ctaUrl ?? "");
    setIsFeatured(item.isFeatured);
    setIsActive(item.isActive);
  }, [item]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await upsertCircleCardPriceListItemInlineAction(new FormData(event.currentTarget));
      if (result.ok && result.item) {
        onSaved(result.item);
        onNotice(result.notice);
        if (!item) {
          setTitle(""); setDescription(""); setPrice(""); setPriceNote("");
          setCategory(""); setCtaLabel(""); setCtaUrl("");
          setIsFeatured(false); setIsActive(true); setFormKey((current) => current + 1);
        }
      } else if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("The price could not be saved. Your current price is still shown.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} onSubmit={save} className="space-y-3" noValidate>
      <input type="hidden" name="cardId" value={cardId} />
      {item ? <input type="hidden" name="priceListItemId" value={item.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor={`${idPrefix}-title`}>Title</Label><Input id={`${idPrefix}-title`} name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required /></div>
        <div className="space-y-2"><Label htmlFor={`${idPrefix}-category`}>Category (optional)</Label><Input id={`${idPrefix}-category`} name="category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={60} placeholder="Consultations" /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor={`${idPrefix}-description`}>Description (optional)</Label><Textarea id={`${idPrefix}-description`} name="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} /></div>
        <div className="space-y-2"><Label htmlFor={`${idPrefix}-price`}>Price</Label><Input id={`${idPrefix}-price`} name="price" value={price} onChange={(event) => setPrice(event.target.value)} maxLength={80} placeholder="From £99" required /></div>
        <div className="space-y-2"><Label htmlFor={`${idPrefix}-price-note`}>Price note (optional)</Label><Input id={`${idPrefix}-price-note`} name="priceNote" value={priceNote} onChange={(event) => setPriceNote(event.target.value)} maxLength={120} placeholder="Starting price" /></div>
        <div className="space-y-2"><Label htmlFor={`${idPrefix}-cta-label`}>CTA label (optional)</Label><Input id={`${idPrefix}-cta-label`} name="ctaLabel" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} maxLength={40} placeholder="Request Quote" /><p className="text-xs text-muted">Try Book Now, Request Quote, Enquire, View Details or Get Started.</p></div>
        <div className="space-y-2"><Label htmlFor={`${idPrefix}-cta-url`}>CTA URL (optional)</Label><Input id={`${idPrefix}-cta-url`} name="ctaUrl" type="url" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} maxLength={2048} placeholder="https://example.com/enquire" /><p className="text-xs text-muted">Safe external HTTP/HTTPS links only.</p></div>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground"><input name="isFeatured" type="checkbox" value="on" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" /><span>Featured<span className="mt-1 block text-xs text-muted">Featured prices appear first publicly.</span></span></label>
        <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground"><input name="isActive" type="checkbox" value="on" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" /><span>Visible<span className="mt-1 block text-xs text-muted">Hidden prices never render publicly.</span></span></label>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" className="h-9 gap-2" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin" /> : item ? <Save size={14} /> : <Plus size={14} />}{saving ? "Saving..." : item ? "Save price" : "Add price"}</Button>
    </form>
  );
}

export function CircleCardPriceListManager({ cardId, cardName, initialItems }: { cardId: string; cardName: string; initialItems: CircleCardPriceListItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [pendingItemId, setPendingItemId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setItems(initialItems), [initialItems]);

  function showNotice(message: string) { setNotice(message); setError(""); }
  function saveItem(item: CircleCardPriceListItem) {
    setItems((current) => [...current.filter((candidate) => candidate.id !== item.id), item].sort((a, b) => a.sortOrder - b.sortOrder));
  }
  async function toggleItem(item: CircleCardPriceListItem) {
    setPendingItemId(item.id);
    try {
      const result = await toggleCircleCardPriceListItemInlineAction({ cardId, priceListItemId: item.id });
      if (result.ok && result.item) { saveItem(result.item); showNotice(result.notice); }
      else if (!result.ok) { setError(result.message); setNotice(""); }
    } catch { setError("The price visibility could not be changed."); }
    finally { setPendingItemId(""); }
  }
  async function deleteItem(item: CircleCardPriceListItem) {
    setPendingItemId(item.id);
    try {
      const result = await deleteCircleCardPriceListItemInlineAction({ cardId, priceListItemId: item.id });
      if (result.ok) { setItems((current) => current.filter((candidate) => candidate.id !== item.id)); showNotice(result.notice); }
      else { setError(result.message); setNotice(""); }
    } catch { setError("The price could not be deleted."); }
    finally { setPendingItemId(""); }
  }
  const activeCount = items.filter((item) => item.isActive).length;

  return (
    <section id="business-card-price-list" className="scroll-mt-24 rounded-2xl border border-gold/22 bg-gold/8">
      <details data-circle-card-module-details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden"><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="font-display text-xl font-semibold text-foreground">Price List</span><Badge variant="outline" className="border-gold/28 text-gold">Pro</Badge><Badge variant="muted">{items.length ? `${activeCount} active` : "0 prices"}</Badge></span><span className="mt-1 block text-sm text-muted">{items.length ? "Manage Price List" : "Add first price"}</span></span><ChevronDown size={16} className="shrink-0 text-silver transition-transform group-open:rotate-180" /></summary>
        <div className="border-t border-silver/12 p-3 sm:p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Card: {cardName}</p>
          {notice ? <p role="status" className="mt-3 rounded-xl border border-emerald-400/24 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{notice}</p> : null}
          {error ? <p role="alert" className="mt-3 rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-4 grid gap-2">
            {items.map((item) => { const pending = pendingItemId === item.id; return (
              <details key={item.id} className="group/price rounded-xl border border-silver/14 bg-background/20">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden"><span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground"><span className="truncate">{item.title}</span>{item.category ? <Badge variant="muted">{item.category}</Badge> : null}{item.isFeatured ? <Badge variant="premium"><Star size={11} className="mr-1" />Featured</Badge> : null}<Badge variant={item.isActive ? "outline" : "muted"} className={item.isActive ? "border-emerald-400/26 text-emerald-200" : undefined}>{item.isActive ? "Visible" : "Hidden"}</Badge></span><span className="mt-1 block text-xs text-muted">{item.price}{item.priceNote ? ` · ${item.priceNote}` : ""}</span></span><span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-gold">Edit<ChevronDown size={15} className="text-silver transition-transform group-open/price:rotate-180" /></span></summary>
                <div className="border-t border-silver/12 p-3"><PriceListForm cardId={cardId} item={item} onSaved={saveItem} onNotice={showNotice} /><div className="mt-3 grid gap-2 border-t border-silver/12 pt-3 sm:grid-cols-3"><Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2" disabled={pending} onClick={() => toggleItem(item)}>{pending ? <Loader2 size={14} className="animate-spin" /> : item.isActive ? <EyeOff size={14} /> : <Eye size={14} />}{item.isActive ? "Hide" : "Show"}</Button><Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2" disabled><ArrowDown size={14} />Reorder — Coming Soon</Button><Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2 text-destructive" disabled={pending} onClick={() => deleteItem(item)}>{pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}Delete</Button></div></div>
              </details>
            ); })}
            {!items.length ? <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">No prices yet. Add the first price below.</p> : null}
          </div>
          <details className="group/add mt-3 rounded-xl border border-gold/20 bg-background/20"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden"><span>Add price</span><ChevronDown size={15} className="text-silver transition-transform group-open/add:rotate-180" /></summary><div className="border-t border-silver/12 p-3"><PriceListForm cardId={cardId} onSaved={saveItem} onNotice={showNotice} /></div></details>
        </div>
      </details>
    </section>
  );
}
