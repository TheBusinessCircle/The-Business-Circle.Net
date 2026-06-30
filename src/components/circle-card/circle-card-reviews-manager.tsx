"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ChevronDown, Eye, EyeOff, Loader2, Save, Star, Trash2 } from "lucide-react";
import {
  deleteCircleCardReviewItemInlineAction,
  toggleCircleCardReviewItemInlineAction,
  upsertCircleCardReviewItemInlineAction
} from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_REVIEW_PRO_LIMIT,
  isValidCircleCardReviewItem,
  type CircleCardReviewItem
} from "@/lib/circle-card/content-blocks";

function ReviewFields({
  idPrefix,
  item
}: {
  idPrefix: string;
  item?: CircleCardReviewItem;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Reviewer name</Label>
        <Input
          id={`${idPrefix}-name`}
          name="reviewerName"
          defaultValue={item?.reviewerName ?? ""}
          maxLength={100}
          placeholder="Alex Morgan"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-role`}>Role or company (optional)</Label>
        <Input
          id={`${idPrefix}-role`}
          name="reviewerRoleOrCompany"
          defaultValue={item?.reviewerRoleOrCompany ?? ""}
          maxLength={120}
          placeholder="Founder, North Studio"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-text`}>Testimonial</Label>
        <Textarea
          id={`${idPrefix}-text`}
          name="reviewText"
          defaultValue={item?.reviewText ?? ""}
          rows={4}
          maxLength={1200}
          placeholder="Share what they said about working with you."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-rating`}>Rating (optional)</Label>
        <Select id={`${idPrefix}-rating`} name="rating" defaultValue={item?.rating?.toString() ?? ""}>
          <option value="">No rating</option>
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-source`}>Source label (optional)</Label>
        <Input
          id={`${idPrefix}-source`}
          name="source"
          defaultValue={item?.source ?? ""}
          maxLength={80}
          placeholder="Google Review"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-source-url`}>Source URL (optional)</Label>
        <Input
          id={`${idPrefix}-source-url`}
          name="sourceUrl"
          type="url"
          defaultValue={item?.sourceUrl ?? ""}
          placeholder="https://..."
        />
      </div>
      <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground sm:col-span-2">
        <input
          name="isActive"
          type="checkbox"
          value="on"
          defaultChecked={item?.isActive ?? true}
          className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary"
        />
        <span>Active on public Business Card</span>
      </label>
    </div>
  );
}

function ReviewForm({
  cardId,
  item,
  onSaved,
  onNotice
}: {
  cardId: string;
  item?: CircleCardReviewItem;
  onSaved: (item: CircleCardReviewItem) => void;
  onNotice: (message: string) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const idPrefix = item ? `review-${item.id}` : `review-new-${cardId}-${formKey}`;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    try {
      const result = await upsertCircleCardReviewItemInlineAction(new FormData(event.currentTarget));
      if (result.ok && result.item) {
        onSaved(result.item);
        onNotice(result.notice);
        if (!item) {
          formRef.current?.reset();
          setFormKey((current) => current + 1);
        }
      } else if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("The testimonial could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} ref={formRef} onSubmit={save} className="space-y-3" noValidate>
      <input type="hidden" name="cardId" value={cardId} />
      {item ? <input type="hidden" name="reviewItemId" value={item.id} /> : null}
      <ReviewFields idPrefix={idPrefix} item={item} />
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" className="h-9 gap-2" disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? "Saving..." : item ? "Save testimonial" : "Add testimonial"}
      </Button>
    </form>
  );
}

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return null;

  return (
    <span className="inline-flex text-gold" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: rating }, (_, index) => (
        <Star key={index} size={12} fill="currentColor" aria-hidden="true" />
      ))}
    </span>
  );
}

export function CircleCardReviewsManager({
  cardId,
  cardName,
  initialItems
}: {
  cardId: string;
  cardName: string;
  initialItems: CircleCardReviewItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingItemId, setPendingItemId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setItems(initialItems), [initialItems]);

  function saveItem(item: CircleCardReviewItem) {
    setItems((current) =>
      [...current.filter((candidate) => candidate.id !== item.id), item].sort(
        (left, right) => left.sortOrder - right.sortOrder
      )
    );
  }

  function showNotice(message: string) {
    setNotice(message);
    setError("");
  }

  async function toggleItem(item: CircleCardReviewItem) {
    setPendingItemId(item.id);
    try {
      const result = await toggleCircleCardReviewItemInlineAction({ cardId, reviewItemId: item.id });
      if (result.ok && result.item) {
        saveItem(result.item);
        showNotice(result.notice);
      } else if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("The testimonial visibility could not be changed.");
    } finally {
      setPendingItemId("");
    }
  }

  async function deleteItem(item: CircleCardReviewItem) {
    setPendingItemId(item.id);
    try {
      const result = await deleteCircleCardReviewItemInlineAction({ cardId, reviewItemId: item.id });
      if (result.ok) {
        setItems((current) => current.filter((candidate) => candidate.id !== item.id));
        showNotice(result.notice);
      } else {
        setError(result.message);
      }
    } catch {
      setError("The testimonial could not be deleted.");
    } finally {
      setPendingItemId("");
    }
  }

  const activeCount = items.filter((item) => item.isActive && isValidCircleCardReviewItem(item)).length;

  return (
    <section id="business-card-reviews" className="scroll-mt-24 rounded-2xl border border-gold/22 bg-gold/8 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-semibold text-foreground">Reviews / Testimonials</h3>
            <Badge variant="outline" className="border-gold/28 text-gold">Pro</Badge>
            <Badge variant="muted">{activeCount} active</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">Show proof that people trust your work.</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-gold">Card: {cardName}</p>
        </div>
      </div>

      {notice ? <p role="status" className="mt-3 text-sm text-emerald-200">{notice}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 grid gap-2">
        {items.map((item) => {
          const pending = pendingItemId === item.id;
          return (
            <details key={item.id} className="group rounded-xl border border-silver/14 bg-background/20">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{item.reviewerName || "Review needs attention"}</span>
                    <Badge variant={item.isActive ? "outline" : "muted"}>{item.isActive ? "Active" : "Hidden"}</Badge>
                    <RatingStars rating={item.rating} />
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted">
                    {item.reviewText || "Add the testimonial text before publishing."}
                  </span>
                </span>
                <ChevronDown size={15} className="mt-1 shrink-0 text-silver transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-silver/12 p-3">
                <ReviewForm cardId={cardId} item={item} onSaved={saveItem} onNotice={showNotice} />
                <div className="mt-3 grid gap-2 border-t border-silver/12 pt-3 sm:grid-cols-3">
                  <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => toggleItem(item)} className="gap-2">
                    {pending ? <Loader2 size={14} className="animate-spin" /> : item.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    {item.isActive ? "Hide" : "Show"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled className="gap-2">
                    <ArrowDown size={14} /> Reorder — Coming Soon
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => deleteItem(item)} className="gap-2 text-destructive">
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              </div>
            </details>
          );
        })}
        {!items.length ? (
          <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">
            Add your first testimonial.
          </p>
        ) : null}
      </div>

      <details data-circle-card-module-details className="group mt-3 rounded-xl border border-gold/20 bg-background/20" open={!items.length}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>Add testimonial</span>
          <span className="flex items-center gap-2 text-xs font-normal text-muted">
            {items.length}/{CIRCLE_CARD_REVIEW_PRO_LIMIT}
            <ChevronDown size={15} className="text-silver transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="border-t border-silver/12 p-3">
          <ReviewForm cardId={cardId} onSaved={saveItem} onNotice={showNotice} />
        </div>
      </details>
    </section>
  );
}
