import { ResourceStatus, ResourceTier, ResourceType } from "@prisma/client";

export interface ResourceCardModel {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: ResourceStatus;
  tier: ResourceTier;
  type: ResourceType;
  category: string;
}

export interface ResourceDetailModel extends ResourceCardModel {
  content: string;
  publishedAt: Date | null;
  updatedAt: Date;
}
