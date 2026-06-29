"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  Camera,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Trash2
} from "lucide-react";
import {
  deleteCircleCardGalleryItemInlineAction,
  toggleCircleCardGalleryItemInlineAction,
  upsertCircleCardGalleryItemInlineAction
} from "@/actions/circle-card.actions";
import { CircleCardImageUploadField } from "@/components/circle-card/circle-card-image-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_GALLERY_PRO_LIMIT,
  isValidCircleCardGalleryImageUrl,
  type CircleCardGalleryItem
} from "@/lib/circle-card/content-blocks";

type GalleryItemFormProps = {
  cardId: string;
  item?: CircleCardGalleryItem;
  onSaved: (item: CircleCardGalleryItem, created: boolean) => void;
  onNotice: (message: string) => void;
};

function GalleryItemForm({ cardId, item, onSaved, onNotice }: GalleryItemFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [imageReady, setImageReady] = useState(false);
  const idPrefix = item ? `gallery-${item.id}` : `gallery-new-${cardId}-${formKey}`;

  useEffect(() => {
    setImageReady(false);
    if (!isValidCircleCardGalleryImageUrl(imageUrl)) {
      return;
    }

    let active = true;
    const image = new Image();
    const markReady = () => {
      if (active) {
        setImageReady(true);
      }
    };
    const markBroken = () => {
      if (active) {
        setImageReady(false);
      }
    };

    image.onload = markReady;
    image.onerror = markBroken;
    image.src = imageUrl;
    if (image.complete && image.naturalWidth > 0) {
      markReady();
    }

    return () => {
      active = false;
    };
  }, [imageUrl]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }

    if (!imageReady) {
      setError("Upload a valid gallery image before saving.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const result = await upsertCircleCardGalleryItemInlineAction(new FormData(event.currentTarget));

      if (result.ok && result.item) {
        onSaved(result.item, !item);
        onNotice(result.notice);
        if (!item) {
          formRef.current?.reset();
          setImageUrl("");
          setImageReady(false);
          setFormKey((current) => current + 1);
        }
      } else if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("The gallery image could not be saved. Your current image is still shown.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} ref={formRef} onSubmit={save} className="space-y-3" noValidate>
      <input type="hidden" name="cardId" value={cardId} />
      {item ? <input type="hidden" name="galleryItemId" value={item.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CircleCardImageUploadField
            id={`${idPrefix}-image`}
            name="imageUrl"
            label="Gallery image"
            uploadKind="gallery-image"
            defaultValue={item?.imageUrl ?? ""}
            value={imageUrl}
            onValueChange={(nextValue) => {
              setImageUrl(nextValue);
              setError("");
            }}
            previewAlt={item?.title ?? "Gallery image preview"}
            helperText="JPG, PNG or WebP, up to 5MB. Uploading stays in this Gallery workspace."
            saveReminder="Upload the image, then save this gallery item."
            uploadSuccessMessage="Image uploaded. Save this gallery item below."
            previewClassName="rounded-xl"
            showAdjustments={false}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input
            id={`${idPrefix}-title`}
            name="title"
            defaultValue={item?.title ?? ""}
            maxLength={100}
            placeholder="Completed brand identity"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-category`}>Category (optional)</Label>
          <Input
            id={`${idPrefix}-category`}
            name="category"
            defaultValue={item?.category ?? ""}
            maxLength={60}
            placeholder="Branding"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-description`}>Description (optional)</Label>
          <Textarea
            id={`${idPrefix}-description`}
            name="description"
            defaultValue={item?.description ?? ""}
            rows={3}
            maxLength={500}
            placeholder="A short note about the work, result or project."
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
          <span>
            Active on public Business Card
            <span className="mt-1 block text-xs text-muted">Hidden images remain editable and are never loaded publicly.</span>
          </span>
        </label>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!imageReady ? (
        <p className="text-xs font-medium text-amber-200">
          A successfully loaded gallery image is required before this item can be saved.
        </p>
      ) : null}

      <Button type="submit" size="sm" className="h-9 gap-2" disabled={saving || !imageReady}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : item ? <Save size={14} /> : <Camera size={14} />}
        {saving ? "Saving..." : item ? "Save item" : "Add gallery item"}
      </Button>
    </form>
  );
}

function GalleryThumbnail({ item }: { item: CircleCardGalleryItem }) {
  const [broken, setBroken] = useState(!isValidCircleCardGalleryImageUrl(item.imageUrl));

  useEffect(() => {
    setBroken(!isValidCircleCardGalleryImageUrl(item.imageUrl));
  }, [item.imageUrl]);

  if (broken) {
    return (
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-amber-300/28 bg-amber-300/10 p-1.5 text-center text-[9px] font-semibold leading-tight text-amber-100">
        Image missing - edit or remove
      </span>
    );
  }

  return (
    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-silver/14 bg-background/40">
      <img
        src={item.imageUrl}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    </span>
  );
}

export function CircleCardGalleryManager({
  cardId,
  cardName,
  initialItems
}: {
  cardId: string;
  cardName: string;
  initialItems: CircleCardGalleryItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingItemId, setPendingItemId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function showNotice(message: string) {
    setNotice(message);
    setError("");
  }

  function saveItem(item: CircleCardGalleryItem) {
    setItems((current) =>
      [...current.filter((candidate) => candidate.id !== item.id), item].sort(
        (left, right) => left.sortOrder - right.sortOrder
      )
    );
  }

  async function toggleItem(item: CircleCardGalleryItem) {
    setPendingItemId(item.id);
    try {
      const result = await toggleCircleCardGalleryItemInlineAction({ cardId, galleryItemId: item.id });
      if (result.ok && result.item) {
        saveItem(result.item);
        showNotice(result.notice);
      } else if (!result.ok) {
        setError(result.message);
        setNotice("");
      }
    } catch {
      setError("The gallery image visibility could not be changed.");
      setNotice("");
    } finally {
      setPendingItemId("");
    }
  }

  async function deleteItem(item: CircleCardGalleryItem) {
    setPendingItemId(item.id);
    try {
      const result = await deleteCircleCardGalleryItemInlineAction({ cardId, galleryItemId: item.id });
      if (result.ok) {
        setItems((current) => current.filter((candidate) => candidate.id !== item.id));
        showNotice(result.notice);
      } else {
        setError(result.message);
        setNotice("");
      }
    } catch {
      setError("The gallery image could not be deleted.");
      setNotice("");
    } finally {
      setPendingItemId("");
    }
  }

  const activeCount = items.filter(
    (item) => item.isActive && isValidCircleCardGalleryImageUrl(item.imageUrl)
  ).length;

  return (
    <section id="business-card-gallery" className="scroll-mt-24 rounded-2xl border border-gold/22 bg-gold/8 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-semibold text-foreground">Gallery / Portfolio</h3>
            <Badge variant="outline" className="border-gold/28 text-gold">Pro</Badge>
            <Badge variant="muted">{activeCount} active</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">Show people your best work.</p>
          <p className="mt-1 text-xs text-silver">Uploads and saves stay inside this Gallery workspace.</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-gold">Card: {cardName}</p>
        </div>
      </div>

      {notice ? (
        <p role="status" className="mt-3 rounded-xl border border-emerald-400/24 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        {items.map((item) => {
          const pending = pendingItemId === item.id;
          return (
            <details key={item.id} className="group rounded-xl border border-silver/14 bg-background/20">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <GalleryThumbnail item={item} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="truncate">{item.title}</span>
                      <Badge variant={item.isActive ? "outline" : "muted"} className={item.isActive ? "border-emerald-400/26 text-emerald-200" : undefined}>
                        {item.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </span>
                    {item.description ? <span className="mt-1 block line-clamp-2 text-xs text-muted">{item.description}</span> : null}
                  </span>
                </span>
                <ChevronDown size={15} className="shrink-0 text-silver transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-silver/12 p-3">
                <GalleryItemForm cardId={cardId} item={item} onSaved={(saved) => saveItem(saved)} onNotice={showNotice} />
                <div className="mt-3 grid gap-2 border-t border-silver/12 pt-3 sm:grid-cols-3">
                  <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2" disabled={pending} onClick={() => toggleItem(item)}>
                    {pending ? <Loader2 size={14} className="animate-spin" /> : item.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    {item.isActive ? "Hide" : "Show"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2" disabled>
                    <ArrowDown size={14} /> Reorder — Coming Soon
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2 text-destructive" disabled={pending} onClick={() => deleteItem(item)}>
                    {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                  </Button>
                </div>
              </div>
            </details>
          );
        })}
        {!items.length ? (
          <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">
            No portfolio images yet. Add your first image below.
          </p>
        ) : null}
      </div>

      <details className="group mt-3 rounded-xl border border-gold/20 bg-background/20" open={!items.length}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>Add gallery item</span>
          <span className="flex items-center gap-2 text-xs font-normal text-muted">
            {items.length}/{CIRCLE_CARD_GALLERY_PRO_LIMIT}
            <ChevronDown size={15} className="text-silver transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="border-t border-silver/12 p-3">
          <GalleryItemForm
            cardId={cardId}
            onSaved={(saved) => saveItem(saved)}
            onNotice={showNotice}
          />
        </div>
      </details>
    </section>
  );
}
