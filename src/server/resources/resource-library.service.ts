import {
  MembershipTier,
  Prisma,
  ResourceMediaType,
  ResourceTier,
  ResourceType
} from "@prisma/client";
import {
  RESOURCE_CATEGORY_OPTIONS,
  RESOURCE_TIER_LABELS,
  RESOURCE_TIER_ORDER,
  RESOURCE_TYPE_OPTIONS
} from "@/config/resources";
import { db } from "@/lib/db";
import { getAccessibleResourceTiers } from "@/server/resources/resource-policy";
import { buildResourceReadFilter, type ResourceLibraryView } from "@/server/resources/resource-read.service";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 24;

export type ResourceLibraryFilters = {
  query?: string;
  tier?: ResourceTier | string | "";
  category?: string;
  type?: ResourceType | string | "";
  view?: ResourceLibraryView;
  userId?: string;
  page?: number;
  pageSize?: number;
};

export type ResourceLibraryCardItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  coverImage: string | null;
  mediaType: ResourceMediaType;
  mediaUrl: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  isRead: boolean;
};

export type ResourceLibraryResult = {
  items: ResourceLibraryCardItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  tierOptions: Array<{ value: ResourceTier; label: string }>;
  categoryOptions: Array<{ value: string; label: string; tier: ResourceTier }>;
  typeOptions: Array<{ value: ResourceType; label: string }>;
};

function normalizeString(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizePage(value: number | undefined) {
  if (!value || Number.isNaN(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function normalizePageSize(value: number | undefined) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(value)));
}

function normalizeTier(value: string | undefined): ResourceTier | undefined {
  if (!value) {
    return undefined;
  }

  const upper = value.toUpperCase();
  return RESOURCE_TIER_ORDER.find((tier) => tier === upper) ?? undefined;
}

function normalizeType(value: string | undefined): ResourceType | undefined {
  if (!value) {
    return undefined;
  }

  const upper = value.toUpperCase();
  return RESOURCE_TYPE_OPTIONS.find((option) => option.value === upper)?.value;
}

function normalizeCategory(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return RESOURCE_CATEGORY_OPTIONS.find((option) => option.value === value)?.value;
}

export async function searchResourceLibrary(
  filters: ResourceLibraryFilters,
  membershipTier: MembershipTier
): Promise<ResourceLibraryResult> {
  const visibleTiers = getAccessibleResourceTiers(membershipTier);
  const query = normalizeString(filters.query);
  const requestedTier = normalizeTier(filters.tier);
  const tier = requestedTier && visibleTiers.includes(requestedTier) ? requestedTier : undefined;
  const type = normalizeType(filters.type);
  const category = normalizeCategory(filters.category);
  const view = filters.view ?? "unread";
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);

  const where: Prisma.ResourceWhereInput = {
    status: "PUBLISHED",
    ...(tier ? { tier } : { tier: { in: visibleTiers } }),
    ...(type ? { type } : {}),
    ...(category ? { category } : {}),
    ...(filters.userId ? buildResourceReadFilter(filters.userId, view) : {})
  };

  if (query) {
    where.AND = [
      {
        OR: [
          {
            title: {
              contains: query,
              mode: "insensitive"
            }
          },
          {
            excerpt: {
              contains: query,
              mode: "insensitive"
            }
          },
          {
            category: {
              contains: query,
              mode: "insensitive"
            }
          },
          {
            content: {
              contains: query,
              mode: "insensitive"
            }
          }
        ]
      }
    ];
  }

  const total = await db.resource.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const resources = await db.resource.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    skip,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      tier: true,
      category: true,
      type: true,
      coverImage: true,
      mediaType: true,
      mediaUrl: true,
      publishedAt: true,
      updatedAt: true,
      ...(filters.userId
        ? {
            readStates: {
              where: {
                userId: filters.userId
              },
              select: {
                id: true
              },
              take: 1
            }
          }
        : {})
    }
  });

  return {
    items: resources.map((resource) => ({
      id: resource.id,
      slug: resource.slug,
      title: resource.title,
      excerpt: resource.excerpt,
      tier: resource.tier,
      category: resource.category,
      type: resource.type,
      coverImage: resource.coverImage,
      mediaType: resource.mediaType,
      mediaUrl: resource.mediaUrl,
      publishedAt: resource.publishedAt,
      updatedAt: resource.updatedAt,
      isRead: "readStates" in resource ? resource.readStates.length > 0 : false
    })),
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
    tierOptions: RESOURCE_TIER_ORDER.filter((item) => visibleTiers.includes(item)).map((item) => ({
      value: item,
      label: RESOURCE_TIER_LABELS[item]
    })),
    categoryOptions: RESOURCE_CATEGORY_OPTIONS.filter((option) => visibleTiers.includes(option.tier)),
    typeOptions: RESOURCE_TYPE_OPTIONS
  };
}
