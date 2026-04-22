"use client";

import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";
import { VisualPlacement } from "@/components/visual-media/visual-placement";

type VisualPlacementBackgroundProps = {
  placement: VisualMediaRenderablePlacement | null | undefined;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function VisualPlacementBackground({
  placement,
  className,
  priority = true,
  sizes = "100vw"
}: VisualPlacementBackgroundProps) {
  return (
    <VisualPlacement
      placement={placement}
      priority={priority}
      decorative
      sizes={sizes}
      className={cn("absolute inset-0", className)}
      imageClassName="scale-[1.02]"
      overlayClassName="bg-[linear-gradient(180deg,rgba(4,10,23,0.14),rgba(4,10,23,0.24)_24%,rgba(4,10,23,0.48)_60%,rgba(4,10,23,0.82)_100%)]"
    />
  );
}
