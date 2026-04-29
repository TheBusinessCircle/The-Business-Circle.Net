"use client";

import type { ReactNode } from "react";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";
import { VisualPlacement } from "@/components/visual-media/visual-placement";

type PageHeroImageTone = "cinematic" | "immersive" | "anchored";

const PAGE_HERO_TREATMENTS: Record<
  PageHeroImageTone,
  {
    containerClassName: string;
    imageClassName: string;
    overlayClassName: string;
  }
> = {
  cinematic: {
    containerClassName:
      "border-border/70 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.1),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_34px_100px_rgba(2,6,23,0.34)]",
    imageClassName: "scale-[1.03] saturate-[0.94] contrast-[1.04]",
    overlayClassName:
      "bg-[radial-gradient(ellipse_at_center,transparent_34%,rgba(0,0,0,0.58)_100%),linear-gradient(180deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.72)_44%,rgba(0,0,0,0.85)_100%)]"
  },
  immersive: {
    containerClassName:
      "border-gold/18 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_36px_110px_rgba(2,6,23,0.36)]",
    imageClassName: "scale-[1.05] saturate-[0.95] contrast-[1.05]",
    overlayClassName:
      "bg-[radial-gradient(ellipse_at_center,transparent_32%,rgba(0,0,0,0.6)_100%),linear-gradient(180deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.72)_44%,rgba(0,0,0,0.85)_100%)]"
  },
  anchored: {
    containerClassName:
      "border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_28px_82px_rgba(2,6,23,0.28)]",
    imageClassName: "scale-[1.02] saturate-[0.92] contrast-[1.02]",
    overlayClassName:
      "bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.54)_100%),linear-gradient(180deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.7)_46%,rgba(0,0,0,0.84)_100%)]"
  }
};

type PageHeroImageProps = {
  placement: VisualMediaRenderablePlacement | null | undefined;
  className?: string;
  contentClassName?: string;
  priority?: boolean;
  sizes?: string;
  tone?: PageHeroImageTone;
  children?: ReactNode;
};

export function PageHeroImage({
  placement,
  className,
  contentClassName,
  priority = true,
  sizes = "(min-width: 1280px) 40vw, (min-width: 1024px) 44vw, 100vw",
  tone = "cinematic",
  children
}: PageHeroImageProps) {
  const treatment = PAGE_HERO_TREATMENTS[tone];

  return (
    <VisualPlacement
      placement={placement}
      priority={priority}
      sizes={sizes}
      className={cn(
        "hero-visual-shell public-visual-frame border bg-background/18 shadow-panel",
        "before:pointer-events-none before:absolute before:inset-[1px] before:z-[1] before:rounded-[1.55rem] before:border before:border-border/60 before:content-[''] sm:before:rounded-[1.75rem] lg:before:rounded-[1.9rem]",
        treatment.containerClassName,
        className
      )}
      imageClassName={treatment.imageClassName}
      overlayClassName={treatment.overlayClassName}
      contentClassName={cn("flex h-full flex-col justify-end", contentClassName)}
    >
      {children}
    </VisualPlacement>
  );
}
