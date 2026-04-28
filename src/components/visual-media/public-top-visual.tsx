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
  children
}: PublicTopVisualProps) {
  const overlayContent = (
    <div
      className={cn(
        "relative z-[2] flex h-full flex-col justify-center gap-5 px-6 py-28 sm:px-8 lg:px-10 lg:py-36",
        contentClassName
      )}
    >
      {eyebrow ? <p className="premium-kicker max-w-fit">{eyebrow}</p> : null}
      {title ? (
        <h2 className="max-w-4xl font-display text-4xl leading-[0.98] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="max-w-3xl text-lg leading-relaxed text-white/80">
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
          className="min-h-[28rem] rounded-[2.15rem] sm:min-h-[32rem] lg:min-h-[36rem] 2xl:min-h-[38rem]"
          contentClassName="justify-center"
        >
          {overlayContent}
        </PageHeroImage>
      </section>
    );
  }

  return (
    <section className={cn("w-full", className)}>
      <div className="hero-visual-shell relative min-h-[28rem] overflow-hidden rounded-[2.15rem] border border-border/70 bg-[radial-gradient(circle_at_top,rgba(82,146,255,0.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(214,180,103,0.16),transparent_28%),linear-gradient(180deg,rgba(12,19,36,0.94),rgba(5,10,24,0.98))] shadow-[0_34px_100px_rgba(2,6,23,0.34)] sm:min-h-[32rem] lg:min-h-[36rem] 2xl:min-h-[38rem]">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_34%,rgba(0,0,0,0.58)_100%),linear-gradient(180deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.72)_44%,rgba(0,0,0,0.85)_100%)]" />
        {overlayContent}
      </div>
    </section>
  );
}
