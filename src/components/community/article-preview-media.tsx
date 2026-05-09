"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, ImageOff } from "lucide-react";
import {
  parseCommunitySourceAttribution,
  resolveCommunitySourcePreview
} from "@/lib/community/source-preview";
import { cn } from "@/lib/utils";

type ArticlePreviewMediaProps = {
  title: string;
  sourceAttribution?: string | null;
  previewImageUrl?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null;
  sourceName?: string | null;
  category?: string | null;
  className?: string;
  imageClassName?: string;
  aspectClassName?: string;
  compact?: boolean;
  showUnavailableCopy?: boolean;
};

export function SourcePreviewCard({
  title,
  sourceName,
  sourceDomain,
  category,
  compact = false,
  showUnavailableCopy = false
}: {
  title: string;
  sourceName?: string | null;
  sourceDomain?: string | null;
  category?: string | null;
  compact?: boolean;
  showUnavailableCopy?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_84%_12%,rgba(93,142,197,0.32),transparent_34%),radial-gradient(circle_at_12%_92%,rgba(212,175,55,0.18),transparent_36%),linear-gradient(135deg,#06101f_0%,#0b1730_54%,#050b15_100%)]">
      <div className="absolute inset-4 rounded-[1.25rem] border border-white/10 bg-white/[0.025]" />
      <div className="relative z-[1] flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-sky-200/18 bg-sky-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-sky-100">
            {sourceDomain || "source reporting"}
          </span>
          {category ? (
            <span className="inline-flex rounded-full border border-gold/24 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
              {category}
            </span>
          ) : null}
        </div>

        <div className="max-w-3xl">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-silver">
            <ImageOff size={17} />
          </div>
          <p
            className={cn(
              "font-display font-semibold leading-tight text-foreground",
              compact ? "line-clamp-3 text-xl" : "line-clamp-4 text-2xl sm:text-3xl"
            )}
          >
            {title}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-silver">
            <span>{sourceName || "BCN Intelligence"}</span>
            {showUnavailableCopy ? (
              <span className="text-muted">Source preview unavailable</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function IntelligencePreviewImage({
  title,
  sourceAttribution,
  previewImageUrl,
  sourceUrl,
  sourceDomain,
  sourceName,
  category,
  className,
  imageClassName,
  aspectClassName = "aspect-[16/9]",
  compact = false,
  showUnavailableCopy = false
}: ArticlePreviewMediaProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const attribution = useMemo(
    () => parseCommunitySourceAttribution(sourceAttribution),
    [sourceAttribution]
  );
  const resolvedPreview = useMemo(
    () =>
      resolveCommunitySourcePreview({
        title,
        previewImageUrl,
        sourceUrl: sourceUrl ?? attribution.sourceUrl,
        sourceDomain: sourceDomain ?? attribution.sourceDomain,
        sourceName: sourceName ?? attribution.sourceName
      }),
    [
      attribution.sourceDomain,
      attribution.sourceName,
      attribution.sourceUrl,
      previewImageUrl,
      sourceDomain,
      sourceName,
      sourceUrl,
      title
    ]
  );

  const showImage = resolvedPreview.kind !== "placeholder" && !imageFailed;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.35rem] border border-silver/14 bg-[#06101f]",
        aspectClassName,
        className
      )}
    >
      {showImage ? (
        <>
          <img
            src={resolvedPreview.url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
            onError={() => setImageFailed(true)}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,20,0.02),rgba(3,8,20,0.08)_44%,rgba(3,8,20,0.36)_100%)]" />
        </>
      ) : (
        <SourcePreviewCard
          title={title}
          sourceName={resolvedPreview.sourceName}
          sourceDomain={resolvedPreview.sourceDomain}
          category={category}
          compact={compact}
          showUnavailableCopy={showUnavailableCopy || imageFailed}
        />
      )}
    </div>
  );
}

export function ArticlePreviewMedia({
  title,
  sourceAttribution,
  previewImageUrl,
  sourceUrl,
  sourceDomain,
  sourceName,
  category,
  className,
  imageClassName,
  aspectClassName = "aspect-[16/9]",
  compact = false,
  showUnavailableCopy = false
}: ArticlePreviewMediaProps) {
  const attribution = parseCommunitySourceAttribution(sourceAttribution);
  const resolvedSourceUrl = sourceUrl ?? attribution.sourceUrl;
  const resolvedSourceDomain = sourceDomain ?? attribution.sourceDomain;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.65rem] border border-silver/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_18px_46px_rgba(2,6,23,0.16)]",
        className
      )}
    >
      <IntelligencePreviewImage
        title={title}
        sourceAttribution={sourceAttribution}
        previewImageUrl={previewImageUrl}
        sourceUrl={sourceUrl}
        sourceDomain={sourceDomain}
        sourceName={sourceName}
        category={category}
        imageClassName={imageClassName}
        aspectClassName={aspectClassName}
        compact={compact}
        showUnavailableCopy={showUnavailableCopy}
      />
      <div className={cn("space-y-2 px-4", compact ? "py-3" : "py-4")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-gold/22 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
            Source preview
          </span>
          {resolvedSourceDomain ? <span className="text-xs text-muted">{resolvedSourceDomain}</span> : null}
        </div>
        {resolvedSourceUrl ? (
          <Link
            href={resolvedSourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-silver transition-colors hover:text-foreground"
          >
            Original source
            <ExternalLink size={13} />
          </Link>
        ) : (
          <p className="text-sm text-muted">Source context is attached to the BCN signal.</p>
        )}
      </div>
    </div>
  );
}

