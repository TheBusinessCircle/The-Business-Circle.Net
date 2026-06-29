"use client";

import { useEffect, useState } from "react";
import { Images, X } from "lucide-react";
import {
  isValidCircleCardGalleryImageUrl,
  type CircleCardGalleryItem
} from "@/lib/circle-card/content-blocks";

type PublicCircleCardGalleryProps = {
  items: CircleCardGalleryItem[];
  id?: string;
};

export function PublicCircleCardGallery({
  items,
  id = "business-gallery"
}: PublicCircleCardGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<CircleCardGalleryItem | null>(null);
  const [failedItemIds, setFailedItemIds] = useState<Set<string>>(() => new Set());
  const [loadedItemIds, setLoadedItemIds] = useState<Set<string>>(() => new Set());
  const visibleItems = items.filter(
    (item) => isValidCircleCardGalleryImageUrl(item.imageUrl) && !failedItemIds.has(item.id)
  );

  function markFailed(itemId: string) {
    setFailedItemIds((current) => new Set(current).add(itemId));
    setSelectedItem((current) => (current?.id === itemId ? null : current));
  }

  function markLoaded(itemId: string) {
    setLoadedItemIds((current) => new Set(current).add(itemId));
  }

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedItem(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedItem]);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <>
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(12,25,32,0.88),rgba(4,10,24,0.96))] p-4 shadow-panel-soft sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold">Gallery / Portfolio</p>
            <h2 id={`${id}-title`} className="mt-1 font-display text-2xl text-foreground">
              Selected work
            </h2>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
            <Images size={18} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className={`min-w-0 overflow-hidden rounded-2xl border border-silver/14 bg-white/[0.04] transition-opacity ${loadedItemIds.has(item.id) ? "visible opacity-100" : "invisible opacity-0"}`}
            >
              <button
                type="button"
                className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                onClick={() => setSelectedItem(item)}
                aria-label={`Enlarge ${item.title}`}
              >
                <span className="block aspect-square overflow-hidden bg-background/40 sm:aspect-[4/3]">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    onLoad={() => markLoaded(item.id)}
                    onError={() => markFailed(item.id)}
                  />
                </span>
              </button>
              <div className="p-3 sm:p-4">
                {item.category ? (
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-gold sm:text-[11px]">
                    {item.category}
                  </p>
                ) : null}
                <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground sm:text-base">{item.title}</h3>
                {item.description ? (
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted sm:text-sm">{item.description}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-dialog-title`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedItem(null);
            }
          }}
        >
          <div className="relative max-h-[94vh] w-full max-w-5xl overflow-auto rounded-2xl border border-silver/20 bg-[#071018] shadow-2xl">
            <button
              type="button"
              autoFocus
              className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              onClick={() => setSelectedItem(null)}
              aria-label="Close enlarged gallery image"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <div className="flex min-h-0 items-center justify-center bg-black/30">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                loading="lazy"
                decoding="async"
                className="max-h-[75vh] w-full object-contain"
                onError={() => markFailed(selectedItem.id)}
              />
            </div>
            <div className="p-4 sm:p-5">
              {selectedItem.category ? (
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">{selectedItem.category}</p>
              ) : null}
              <h3 id={`${id}-dialog-title`} className="mt-1 font-display text-xl text-foreground sm:text-2xl">
                {selectedItem.title}
              </h3>
              {selectedItem.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{selectedItem.description}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
