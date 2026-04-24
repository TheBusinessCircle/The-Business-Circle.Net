"use client";

import type { ReactNode } from "react";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";
import { PageHeroImage } from "@/components/visual-media/page-hero-image";

type PublicTopVisualTone = "cinematic" | "immersive" | "anchored";

type PublicTopVisualProps = {
  placement: VisualMediaRenderablePlacement | null | undefined;
  eyebrow?: string;
  title?: string;
  description?: string;
  tone?: PublicTopVisualTone;
  priority?: boolean;
  className?: string;
  contentClassName?: string;
  fallbackLabel?: string;
  children?: ReactNode;
};

export function PublicTopVisual({
  placement,
  eyebrow,
  title,
  description,
  tone = "cinematic",
  priority = true,
  className,
  contentClassName,
  fallbackLabel = "Visual ready when uploaded",
  children
}: PublicTopVisualProps) {
  const overlayContent = (
    <div
      className={cn(
        "relative z-[2] flex h-full flex-col justify-end gap-3 p-5 sm:p-7 lg:p-10",
        contentClassName
      )}
    >
      {eyebrow ? <p className="premium-kicker max-w-fit">{eyebrow}</p> : null}
      {title ? (
        <h2 className="max-w-3xl font-display text-2xl leading-tight text-foreground sm:text-3xl lg:text-[2.6rem]">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-silver sm:text-base">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );

  if (placement?.isActive && placement.imageUrl) {
    return (
      <section className={cn("w-full", className)}>
        <PageHeroImage
          placement={placement}
          priority={priority}
          tone={tone}
          sizes="100vw"
          className="min-h-[14rem] rounded-[2.15rem] sm:min-h-[18rem] lg:min-h-[23rem] 2xl:min-h-[26rem]"
          contentClassName="justify-end"
        >
          {overlayContent}
        </PageHeroImage>
      </section>
    );
  }

  return (
    <section className={cn("w-full", className)}>
      <div className="relative min-h-[14rem] overflow-hidden rounded-[2.15rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(82,146,255,0.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(214,180,103,0.16),transparent_28%),linear-gradient(180deg,rgba(12,19,36,0.94),rgba(5,10,24,0.98))] shadow-[0_26px_70px_rgba(2,6,23,0.24)] sm:min-h-[18rem] lg:min-h-[23rem] 2xl:min-h-[26rem]">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,20,0.02),rgba(3,8,20,0.18)_28%,rgba(3,8,20,0.5)_66%,rgba(3,8,20,0.82)_100%)]" />
        <div className="pointer-events-none absolute -left-10 top-8 h-40 w-40 rounded-full bg-silver/12 blur-[92px]" />
        <div className="pointer-events-none absolute -right-14 top-0 h-52 w-52 rounded-full bg-gold/18 blur-[120px]" />
        {overlayContent}
        <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-background/18 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-silver sm:right-6 sm:top-6">
          {fallbackLabel}
        </div>
      </div>
    </section>
  );
}
