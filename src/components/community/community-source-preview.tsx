"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  parseCommunitySourceAttribution,
  resolveCommunitySourcePreview
} from "@/lib/community/source-preview";
import { cn } from "@/lib/utils";

type CommunitySourcePreviewProps = {
  title: string;
  sourceAttribution?: string | null;
  previewImageUrl?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null;
  className?: string;
  imageClassName?: string;
  aspectClassName?: string;
  compact?: boolean;
};

export function CommunitySourcePreview({
  title,
  sourceAttribution,
  previewImageUrl,
  sourceUrl,
  sourceDomain,
  className,
  imageClassName,
  aspectClassName = "aspect-[16/9]",
  compact = false
}: CommunitySourcePreviewProps) {
  const attribution = parseCommunitySourceAttribution(sourceAttribution);
  const resolvedPreview = resolveCommunitySourcePreview({
    title,
    previewImageUrl,
    sourceUrl: sourceUrl ?? attribution.sourceUrl,
    sourceDomain: sourceDomain ?? attribution.sourceDomain,
    sourceName: attribution.sourceName
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.85rem] border border-silver/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_18px_46px_rgba(2,6,23,0.16)]",
        className
      )}
    >
      <div className={cn("relative", aspectClassName)}>
        <img
          src={resolvedPreview.url}
          alt={resolvedPreview.alt}
          loading="lazy"
          className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,20,0.02),rgba(3,8,20,0.08)_44%,rgba(3,8,20,0.34)_100%)]" />
      </div>
      <div className={cn("space-y-2 px-4 py-4", compact ? "py-3" : "py-4")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-gold/22 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
            Source preview
          </span>
          {resolvedPreview.sourceDomain ? (
            <span className="text-xs text-muted">{resolvedPreview.sourceDomain}</span>
          ) : null}
        </div>
        {resolvedPreview.sourceUrl ? (
          <Link
            href={resolvedPreview.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-silver transition-colors hover:text-foreground"
          >
            Open original source
            <ExternalLink size={13} />
          </Link>
        ) : (
          <p className="text-sm text-muted">
            Source-led visual fallback for this BCN Intelligence signal.
          </p>
        )}
      </div>
    </div>
  );
}
