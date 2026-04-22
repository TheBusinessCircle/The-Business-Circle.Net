"use client";

import { useEffect, useMemo, useState } from "react";
import type { VisualMediaVariant } from "@prisma/client";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { VisualMediaAdminPreviewFamily } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";

type ImageMeta = {
  width: number;
  height: number;
  ratio: number;
};

type DiagnosticItem = {
  tone: "warning" | "note";
  message: string;
};

type VisualMediaSlotDiagnosticsProps = {
  label: string;
  variant: VisualMediaVariant;
  family: VisualMediaAdminPreviewFamily;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  altText: string | null;
  objectPosition: string | null;
  supportsMobile: boolean;
  recommendedAspectRatio: string;
};

function parseRatio(input: string) {
  const parts = input.split(":").map((part) => Number.parseFloat(part.trim()));

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  return parts[0] / parts[1];
}

async function readImageMeta(url: string) {
  return new Promise<ImageMeta | null>((resolve) => {
    const image = new window.Image();

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        resolve(null);
        return;
      }

      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        ratio: image.naturalWidth / image.naturalHeight
      });
    };

    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function useImageMeta(url: string | null) {
  const [meta, setMeta] = useState<ImageMeta | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!url) {
      setMeta(null);
      return;
    }

    void readImageMeta(url).then((nextMeta) => {
      if (!cancelled) {
        setMeta(nextMeta);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return meta;
}

function aspectRatioWarningLabel(actual: number, recommended: number) {
  if (actual > recommended) {
    return "The crop is much wider than the recommended framing.";
  }

  return "The crop is much taller than the recommended framing.";
}

export function VisualMediaSlotDiagnostics({
  label,
  variant,
  family,
  imageUrl,
  mobileImageUrl,
  altText,
  objectPosition,
  supportsMobile,
  recommendedAspectRatio
}: VisualMediaSlotDiagnosticsProps) {
  const desktopMeta = useImageMeta(imageUrl);
  const mobileMeta = useImageMeta(mobileImageUrl);
  const recommendedRatio = parseRatio(recommendedAspectRatio);

  const diagnostics = useMemo<DiagnosticItem[]>(() => {
    const next: DiagnosticItem[] = [];
    const trimmedAltText = altText?.trim() ?? "";
    const trimmedObjectPosition = objectPosition?.trim() ?? "";

    if (!imageUrl) {
      next.push({
        tone: "note",
        message: `${label} does not have a desktop image yet. The live layout will fall back cleanly until one is assigned.`
      });
      return next;
    }

    if (!trimmedAltText) {
      next.push({
        tone: "warning",
        message: "Add alt text so the image stays accessible and easier to audit later."
      });
    }

    if (variant === "HERO" && supportsMobile && !mobileImageUrl) {
      next.push({
        tone: "note",
        message: "No mobile-specific image is set. Review the desktop crop carefully on narrow screens."
      });
    }

    if ((variant === "HERO" || family === "human") && !trimmedObjectPosition) {
      next.push({
        tone: "note",
        message: "Object position is blank. Set it if the focal subject needs protecting in tighter crops."
      });
    }

    if (desktopMeta) {
      const minimumDesktopWidth = variant === "HERO" ? 1600 : family === "editorial" ? 1400 : 1200;

      if (desktopMeta.width < minimumDesktopWidth) {
        next.push({
          tone: "warning",
          message: `Desktop image is only ${desktopMeta.width}px wide. Aim for at least ${minimumDesktopWidth}px for a sharper premium render.`
        });
      }

      if (recommendedRatio && Math.abs(desktopMeta.ratio - recommendedRatio) / recommendedRatio > 0.42) {
        next.push({
          tone: "note",
          message: `${aspectRatioWarningLabel(desktopMeta.ratio, recommendedRatio)} Recommended ratio is ${recommendedAspectRatio}.`
        });
      }

      if (variant === "HERO" && desktopMeta.ratio > 2.15 && !mobileImageUrl) {
        next.push({
          tone: "warning",
          message: "This hero is very wide without a mobile variant, so headline crops may feel risky on phones."
        });
      }
    }

    if (mobileImageUrl && mobileMeta) {
      if (mobileMeta.width < 750) {
        next.push({
          tone: "warning",
          message: `Mobile image is only ${mobileMeta.width}px wide. A slightly larger file will hold detail more cleanly on modern phones.`
        });
      }

      if (mobileMeta.ratio > 1.35 && variant === "HERO") {
        next.push({
          tone: "note",
          message: "The mobile image is still quite wide for a hero crop. Double-check text readability and focal placement on phones."
        });
      }
    }

    return next;
  }, [
    altText,
    desktopMeta,
    family,
    imageUrl,
    label,
    mobileImageUrl,
    mobileMeta,
    objectPosition,
    recommendedAspectRatio,
    recommendedRatio,
    supportsMobile,
    variant
  ]);

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-background/16 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-gold" />
        <p className="text-sm font-medium text-foreground">Soft checks</p>
      </div>

      {diagnostics.length ? (
        <div className="mt-4 space-y-3">
          {diagnostics.map((item) => (
            <div
              key={item.message}
              className={cn(
                "rounded-2xl border px-3 py-3 text-sm",
                item.tone === "warning"
                  ? "border-gold/24 bg-gold/10 text-foreground/88"
                  : "border-silver/16 bg-background/20 text-muted"
              )}
            >
              <div className="flex items-start gap-2">
                {item.tone === "warning" ? (
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-gold" />
                ) : (
                  <Info size={14} className="mt-0.5 shrink-0 text-silver" />
                )}
                <p className="leading-6">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-400/18 bg-emerald-400/8 px-3 py-3 text-sm text-foreground/88">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
            <p className="leading-6">
              No immediate fit warnings flagged here. The image still deserves a final visual check in context before you leave it live.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
