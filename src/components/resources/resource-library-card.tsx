import Link from "next/link";
import { Lock, MoveUpRight, Tags } from "lucide-react";
import { ResourceMediaType, ResourceTier, ResourceType } from "@prisma/client";
import { ResourceCoverImage } from "@/components/resources/resource-cover-image";
import { ResourceTierBadge } from "@/components/resources/resource-tier-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { getResourceTypeLabel } from "@/config/resources";
import { getTierButtonVariant, getTierCardClassName } from "@/lib/tier-styles";
import { formatDate } from "@/lib/utils";

type ResourceLibraryCardProps = {
  resource: {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    type: ResourceType;
    tier: ResourceTier;
    coverImage?: string | null;
    mediaType?: ResourceMediaType;
    mediaUrl?: string | null;
    publishedAt: Date | null;
    isRead?: boolean;
  };
  isLocked?: boolean;
};

export function ResourceLibraryCard({
  resource,
  isLocked = false
}: ResourceLibraryCardProps) {
  const tierCardClassName = getTierCardClassName(resource.tier);
  const tierButtonVariant = getTierButtonVariant(resource.tier);

  return (
    <Card className={`interactive-card group h-full overflow-hidden ${tierCardClassName}`}>
      <ResourceCoverImage
        resource={{
          title: resource.title,
          category: resource.category,
          type: resource.type,
          tier: resource.tier,
          coverImage: resource.coverImage,
          mediaType: resource.mediaType,
          mediaUrl: resource.mediaUrl
        }}
        className="aspect-[16/10] border-b border-silver/12"
        imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted">
            <Tags size={11} className="mr-1" />
            {resource.category}
          </Badge>
          <ResourceTierBadge tier={resource.tier} />
          <Badge variant="outline" className="border-silver/14 normal-case tracking-normal text-silver">
            {getResourceTypeLabel(resource.type)}
          </Badge>
          {isLocked ? (
            <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
              <Lock size={11} className="mr-1" />
              Preview
            </Badge>
          ) : resource.isRead ? (
            <Badge variant="outline" className="border-silver/18 bg-silver/10 text-silver">
              Read
            </Badge>
          ) : null}
        </div>

        <div className="space-y-2">
          <CardTitle className="line-clamp-2 text-2xl">{resource.title}</CardTitle>
          <CardDescription className="line-clamp-4 text-sm leading-relaxed">
            {resource.excerpt}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-xs uppercase tracking-[0.08em] text-silver">
          {resource.publishedAt ? `Published ${formatDate(resource.publishedAt)}` : "Awaiting publication"}
        </p>
      </CardContent>

      <CardFooter>
        <Link href={`/dashboard/resources/${resource.slug}`} className="w-full">
          <Button
            variant={isLocked ? "outline" : tierButtonVariant}
            className="w-full justify-center gap-1"
          >
            {isLocked ? "Preview Resource" : "Read Resource"}
            <MoveUpRight size={14} />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
