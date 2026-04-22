"use client";

import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";
import { VisualPlacement } from "@/components/visual-media/visual-placement";

type VisualPlacementBackgroundTone = "structured" | "immersive" | "editorial" | "anchored";

const BACKGROUND_TREATMENTS: Record<
  VisualPlacementBackgroundTone,
  {
    imageClassName: string;
    overlayClassName: string;
  }
> = {
  structured: {
    imageClassName: "scale-[1.02] saturate-[0.92] contrast-[1.03]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(4,10,23,0.12),rgba(4,10,23,0.2)_24%,rgba(4,10,23,0.42)_60%,rgba(4,10,23,0.78)_100%)]"
  },
  immersive: {
    imageClassName: "scale-[1.04] saturate-[0.94] contrast-[1.04]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(4,10,23,0.14),rgba(4,10,23,0.24)_20%,rgba(4,10,23,0.5)_58%,rgba(4,10,23,0.82)_100%)]"
  },
  editorial: {
    imageClassName: "scale-[1.01] saturate-[0.96] contrast-[1.05]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(4,10,23,0.08),rgba(4,10,23,0.14)_28%,rgba(4,10,23,0.28)_62%,rgba(4,10,23,0.62)_100%)]"
  },
  anchored: {
    imageClassName: "scale-[1.01] saturate-[0.9] contrast-[1.02]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(4,10,23,0.1),rgba(4,10,23,0.18)_28%,rgba(4,10,23,0.34)_60%,rgba(4,10,23,0.72)_100%)]"
  }
};

type VisualPlacementBackgroundProps = {
  placement: VisualMediaRenderablePlacement | null | undefined;
  className?: string;
  priority?: boolean;
  sizes?: string;
  tone?: VisualPlacementBackgroundTone;
};

export function VisualPlacementBackground({
  placement,
  className,
  priority = true,
  sizes = "100vw",
  tone = "structured"
}: VisualPlacementBackgroundProps) {
  const treatment = BACKGROUND_TREATMENTS[tone];

  return (
    <VisualPlacement
      placement={placement}
      priority={priority}
      decorative
      sizes={sizes}
      className={cn("absolute inset-0", className)}
      imageClassName={treatment.imageClassName}
      overlayClassName={treatment.overlayClassName}
    />
  );
}
