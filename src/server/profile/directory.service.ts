import { BusinessStage, MemberRoleTag, MembershipTier, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getRecentActivityByUserIds } from "@/server/community/member-activity.service";
import { getCommunityRecognitionForUsers } from "@/server/community-recognition";
import type { CommunityRecognitionSummary, DirectoryCommunityFilter } from "@/types";

const DIRECTORY_DEFAULT_PAGE_SIZE = 12;
const DIRECTORY_MAX_PAGE_SIZE = 24;
const STAGE_OPTIONS = Object.values(BusinessStage) as BusinessStage[];
const TIER_OPTIONS = Object.values(MembershipTier) as MembershipTier[];
const COMMUNITY_FILTERS: DirectoryCommunityFilter[] = [
  "ALL",
  "INNER_CIRCLE",
  "FOUNDING_MEMBERS",
  "TOP_CONTRIBUTORS",
  "MOST_INVITES",
  "NEWEST_MEMBERS"
];

export type MemberDirectoryFilters = {
  query?: string;
  industry?: string;
  stage?: BusinessStage | "";
  location?: string;
  interest?: string;
  tier?: MembershipTier | "";
  communityFilter?: DirectoryCommunityFilter;
  page?: number;
  pageSize?: number;
  excludeUserId?: string;
};

export interface DirectoryMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  membershipTier: MembershipTier;
  memberRoleTag: MemberRoleTag;
  foundingTier: MembershipTier | null;
  createdAt: Date;
  profile: {
    bio: string | null;
    experience: string | null;
    location: string | null;
    collaborationTags: string[];
    business: {
      companyName: string | null;
      location: string | null;
      industry: string | null;
      stage: BusinessStage | null;
      description: string | null;
    } | null;
  } | null;
  recognition: CommunityRecognitionSummary;
  lastActiveAt: Date | null;
}

export type DirectorySearchResult = {
  members: DirectoryMember[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizeTermList(value: string): string[] {
  if (!value.length) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/[,\s]+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function toPage(value: number | undefined): number {
  if (!value || Number.isNaN(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function toPageSize(value: number | undefined): number {
  if (!value || Number.isNaN(value)) {
    return DIRECTORY_DEFAULT_PAGE_SIZE;
  }

  return Math.max(1, Math.min(DIRECTORY_MAX_PAGE_SIZE, Math.floor(value)));
}

function normalizeCommunityFilter(
  value: DirectoryCommunityFilter | undefined
): DirectoryCommunityFilter {
  if (value && COMMUNITY_FILTERS.includes(value)) {
    return value;
  }

  return "ALL";
}

function buildProfileFilters(filters: {
  industry: string;
  stage: BusinessStage | undefined;
  location: string;
  interest: string;
  interestTerms: string[];
}): Prisma.ProfileWhereInput {
  const clauses: Prisma.ProfileWhereInput[] = [];

  if (filters.industry) {
    clauses.push({
      business: {
        is: {
          industry: {
            contains: filters.industry,
            mode: "insensitive"
          }
        }
      }
    });
  }

  if (filters.stage) {
    clauses.push({
      business: {
        is: {
          stage: filters.stage
        }
      }
    });
  }

  if (filters.location) {
    clauses.push({
      OR: [
        {
          location: {
            contains: filters.location,
            mode: "insensitive"
          }
        },
        {
          business: {
            is: {
              location: {
                contains: filters.location,
                mode: "insensitive"
              }
            }
          }
        }
      ]
    });
  }

  if (filters.interest) {
    const interestClauses: Prisma.ProfileWhereInput[] = [
      {
        collaborationNeeds: {
          contains: filters.interest,
          mode: "insensitive"
        }
      },
      {
        collaborationOffers: {
          contains: filters.interest,
          mode: "insensitive"
        }
      },
      {
        partnershipInterests: {
          contains: filters.interest,
          mode: "insensitive"
        }
      }
    ];

    if (filters.interestTerms.length) {
      interestClauses.push({
        collaborationTags: {
          hasSome: filters.interestTerms
        }
      });
    }

    clauses.push({
      OR: interestClauses
    });
  }

  return {
    isPublic: true,
    ...(clauses.length ? { AND: clauses } : {})
  };
}

function buildSearchClause(query: string, queryTerms: string[]): Prisma.UserWhereInput | null {
  if (!query) {
    return null;
  }

  const profileSearchClauses: Prisma.ProfileWhereInput[] = [
    {
      headline: {
        contains: query,
        mode: "insensitive"
      }
    },
    {
      bio: {
        contains: query,
        mode: "insensitive"
      }
    },
    {
      collaborationNeeds: {
        contains: query,
        mode: "insensitive"
      }
    },
    {
      collaborationOffers: {
        contains: query,
        mode: "insensitive"
      }
    },
    {
      partnershipInterests: {
        contains: query,
        mode: "insensitive"
      }
    },
    {
      business: {
        is: {
          OR: [
            {
              companyName: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              description: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              industry: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              services: {
                contains: query,
                mode: "insensitive"
              }
            }
          ]
        }
      }
    }
  ];

  if (queryTerms.length) {
    profileSearchClauses.push({
      collaborationTags: {
        hasSome: queryTerms
      }
    });
  }

  return {
    OR: [
      {
        name: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        email: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        profile: {
          is: {
            isPublic: true,
            OR: profileSearchClauses
          }
        }
      }
    ]
  };
}

function applyCommunityFilter(
  where: Prisma.UserWhereInput,
  communityFilter: DirectoryCommunityFilter
) {
  if (communityFilter === "INNER_CIRCLE") {
    where.membershipTier = {
      in: [MembershipTier.INNER_CIRCLE, MembershipTier.CORE]
    };
  }

  if (communityFilter === "FOUNDING_MEMBERS") {
    where.foundingMember = true;
  }
}

function buildOrderBy(
  communityFilter: DirectoryCommunityFilter
): Prisma.UserOrderByWithRelationInput[] {
  if (communityFilter === "TOP_CONTRIBUTORS") {
    return [
      {
        reputationScore: {
          score: "desc"
        }
      },
      {
        membershipTier: "desc"
      },
      {
        createdAt: "desc"
      }
    ];
  }

  if (communityFilter === "MOST_INVITES") {
    return [
      {
        inviteReferralsSent: {
          _count: "desc"
        }
      },
      {
        membershipTier: "desc"
      },
      {
        createdAt: "desc"
      }
    ];
  }

  if (communityFilter === "NEWEST_MEMBERS") {
    return [{ createdAt: "desc" }];
  }

  return [{ membershipTier: "desc" }, { createdAt: "desc" }];
}

export async function searchDirectoryMembers(
  filters: MemberDirectoryFilters
): Promise<DirectorySearchResult> {
  const query = normalizeText(filters.query);
  const industry = normalizeText(filters.industry);
  const location = normalizeText(filters.location);
  const interest = normalizeText(filters.interest);
  const queryTerms = normalizeTermList(query);
  const interestTerms = normalizeTermList(interest);
  const page = toPage(filters.page);
  const pageSize = toPageSize(filters.pageSize);
  const communityFilter = normalizeCommunityFilter(filters.communityFilter);
  const stage =
    filters.stage && STAGE_OPTIONS.includes(filters.stage as BusinessStage)
      ? (filters.stage as BusinessStage)
      : undefined;
  const tier =
    filters.tier && TIER_OPTIONS.includes(filters.tier as MembershipTier)
      ? (filters.tier as MembershipTier)
      : undefined;

  const profileFilter = buildProfileFilters({
    industry,
    stage,
    location,
    interest,
    interestTerms
  });

  const where: Prisma.UserWhereInput = {
    suspended: false,
    ...(filters.excludeUserId
      ? {
          id: {
            not: filters.excludeUserId
          }
        }
      : {}),
    ...(tier
      ? {
          membershipTier: tier
        }
      : {}),
    profile: {
      is: profileFilter
    }
  };

  applyCommunityFilter(where, communityFilter);

  const searchClause = buildSearchClause(query, queryTerms);

  if (searchClause) {
    where.AND = [searchClause];
  }

  const total = await db.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      membershipTier: true,
      memberRoleTag: true,
      foundingTier: true,
      createdAt: true,
      profile: {
        select: {
          bio: true,
          experience: true,
          location: true,
          collaborationTags: true,
          business: {
            select: {
              companyName: true,
              location: true,
              industry: true,
              stage: true,
              description: true
            }
          }
        }
      }
    },
    orderBy: buildOrderBy(communityFilter),
    skip,
    take: pageSize
  });

  const [recognitionByUserId, activityByUserId] = await Promise.all([
    getCommunityRecognitionForUsers(users.map((user) => user.id)),
    getRecentActivityByUserIds(users.map((user) => user.id))
  ]);

  const members: DirectoryMember[] = users.map((user) => ({
    ...user,
    lastActiveAt: activityByUserId.get(user.id) ?? null,
    recognition:
      recognitionByUserId.get(user.id) ?? {
        score: 0,
        statusLevel: "Member",
        badges: [],
        primaryBadge: null,
        referralCount: 0,
        memberReferralCount: 0,
        innerCircleReferralCount: 0
      }
  }));

  return {
    members,
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages
  };
}
