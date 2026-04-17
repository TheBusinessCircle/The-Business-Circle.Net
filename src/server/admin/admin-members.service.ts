import {
  PendingRegistrationStatus,
  type Prisma
} from "@prisma/client";
import { fromPendingRegistrationBillingInterval } from "@/lib/auth/register";
import { db } from "@/lib/db";
import type {
  AdminMemberDetails,
  AdminMembersListResult,
  AdminMembersQueryInput,
  AdminPendingRegistrationsOverview
} from "@/types";
import {
  getCommunityRecognitionForUser,
  getInviteDashboardForUser
} from "@/server/community-recognition";

function normalizePage(input: number): number {
  if (!Number.isFinite(input) || input < 1) {
    return 1;
  }

  return Math.floor(input);
}

function normalizePageSize(input: number): number {
  if (!Number.isFinite(input) || input < 1) {
    return 20;
  }

  return Math.min(Math.floor(input), 100);
}

function buildWhereClause(filters: AdminMembersQueryInput): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  const query = filters.query.trim();
  if (query.length) {
    where.OR = [
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
            business: {
              is: {
                companyName: {
                  contains: query,
                  mode: "insensitive"
                }
              }
            }
          }
        }
      }
    ];
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.membershipTier) {
    where.membershipTier = filters.membershipTier;
  }

  if (filters.subscriptionStatus === "NONE") {
    where.subscription = {
      is: null
    };
  } else if (filters.subscriptionStatus !== "ANY") {
    where.subscription = {
      is: {
        status: filters.subscriptionStatus
      }
    };
  }

  if (filters.suspension === "ACTIVE") {
    where.suspended = false;
  } else if (filters.suspension === "SUSPENDED") {
    where.suspended = true;
  }

  return where;
}

export async function listAdminMembers(filters: AdminMembersQueryInput): Promise<AdminMembersListResult> {
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const where = buildWhereClause({ ...filters, page, pageSize });
  const total = await db.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const skip = (normalizedPage - 1) * pageSize;
  const users = await db.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take: pageSize,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      membershipTier: true,
      foundingTier: true,
      createdAt: true,
      suspended: true,
      subscription: {
        select: {
          status: true,
          billingInterval: true,
          billingVariant: true
        }
      },
      profile: {
        select: {
          business: {
            select: {
              companyName: true
            }
          }
        }
      }
    }
  });

  return {
    items: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      membershipTier: user.membershipTier,
      foundingTier: user.foundingTier,
      subscriptionStatus: user.subscription?.status ?? "NONE",
      subscriptionBillingInterval: user.subscription?.billingInterval ?? null,
      subscriptionBillingVariant: user.subscription?.billingVariant ?? null,
      createdAt: user.createdAt,
      suspended: user.suspended,
      companyName: user.profile?.business?.companyName ?? null
    })),
    total,
    page: normalizedPage,
    pageSize,
    totalPages,
    hasPreviousPage: normalizedPage > 1,
    hasNextPage: normalizedPage < totalPages
  };
}

export async function getAdminMemberDetails(memberId: string): Promise<AdminMemberDetails | null> {
  const [user, recognition, inviteDashboard] = await Promise.all([
    db.user.findUnique({
      where: {
        id: memberId
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        membershipTier: true,
        foundingTier: true,
        suspended: true,
        suspendedAt: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            status: true,
            billingInterval: true,
            billingVariant: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true
          }
        },
        profile: {
          select: {
            location: true,
            business: {
              select: {
                companyName: true,
                industry: true
              }
            }
          }
        },
        inviteReferralReceived: {
          select: {
            joinedAt: true,
            subscriptionTier: true,
            inviterUser: {
              select: {
                id: true,
                name: true,
                email: true,
                memberInvite: {
                  select: {
                    inviteCode: true
                  }
                }
              }
            }
          }
        }
      }
    }),
    getCommunityRecognitionForUser(memberId),
    getInviteDashboardForUser(memberId)
  ]);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    membershipTier: user.membershipTier,
    foundingTier: user.foundingTier,
    suspended: user.suspended,
    suspendedAt: user.suspendedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    subscriptionStatus: user.subscription?.status ?? "NONE",
    subscriptionBillingInterval: user.subscription?.billingInterval ?? null,
    subscriptionBillingVariant: user.subscription?.billingVariant ?? null,
    subscriptionCurrentPeriodEnd: user.subscription?.currentPeriodEnd ?? null,
    subscriptionCancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd ?? false,
    companyName: user.profile?.business?.companyName ?? null,
    businessIndustry: user.profile?.business?.industry ?? null,
    location: user.profile?.location ?? null,
    recognition,
    inviteDashboard,
    invitedBy: user.inviteReferralReceived
      ? {
          id: user.inviteReferralReceived.inviterUser.id,
          name: user.inviteReferralReceived.inviterUser.name,
          email: user.inviteReferralReceived.inviterUser.email,
          inviteCode: user.inviteReferralReceived.inviterUser.memberInvite?.inviteCode ?? null,
          joinedAt: user.inviteReferralReceived.joinedAt,
          subscriptionTier: user.inviteReferralReceived.subscriptionTier
        }
      : null
  };
}

export async function getAdminPendingRegistrationsOverview(
  limit = 8
): Promise<AdminPendingRegistrationsOverview> {
  const items = await db.pendingRegistration.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: Math.max(1, Math.min(limit, 20)),
    select: {
      id: true,
      email: true,
      fullName: true,
      selectedTier: true,
      billingInterval: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      completedUserId: true,
      stripeCheckoutSessionId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true
    }
  });

  const statuses = Object.values(PendingRegistrationStatus);
  const counts = await Promise.all(
    statuses.map((status) =>
      db.pendingRegistration.count({
        where: {
          status
        }
      })
    )
  );

  return {
    summary: Object.fromEntries(
      statuses.map((status, index) => [status, counts[index] ?? 0])
    ) as Record<PendingRegistrationStatus, number>,
    items: items.map((item) => ({
      ...item,
      billingInterval: fromPendingRegistrationBillingInterval(item.billingInterval)
    }))
  };
}
