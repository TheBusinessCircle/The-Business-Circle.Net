"use client";

import { ArticlePreviewMedia } from "@/components/community/article-preview-media";

type CommunitySourcePreviewProps = {
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
};

export function CommunitySourcePreview({
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
  compact = false
}: CommunitySourcePreviewProps) {
  return (
    <ArticlePreviewMedia
      title={title}
      sourceAttribution={sourceAttribution}
      previewImageUrl={previewImageUrl}
      sourceUrl={sourceUrl}
      sourceDomain={sourceDomain}
      sourceName={sourceName}
      category={category}
      className={className}
      imageClassName={imageClassName}
      aspectClassName={aspectClassName}
      compact={compact}
    />
  );
}
