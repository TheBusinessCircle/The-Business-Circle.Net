"use client";

import { ResourceMediaType, ResourceTier, ResourceType } from "@prisma/client";
import { resolveResourceImage } from "@/lib/resources/resource-media";
import { cn } from "@/lib/utils";

type ResourceCoverImageProps = {
  resource: {
    title: string;
    category: string;
    type: ResourceType;
    tier: ResourceTier;
    coverImage?: string | null;
    generatedImageUrl?: string | null;
    mediaType?: ResourceMediaType | null;
    mediaUrl?: string | null;
  };
  className?: string;
  imageClassName?: string;
  overlayClassName?: string;
  priority?: boolean;
};

export function ResourceCoverImage({
  resource,
  className,
  imageClassName,
  overlayClassName,
  priority = false
}: ResourceCoverImageProps) {
  const resolvedImage = resolveResourceImage(resource);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={resolvedImage.url}
        alt={resolvedImage.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,20,0.04),rgba(3,8,20,0.16)_48%,rgba(3,8,20,0.52)_100%)]",
          overlayClassName
        )}
      />
    </div>
  );
}
