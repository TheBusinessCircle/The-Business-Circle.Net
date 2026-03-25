"use server";

import { MembershipTier, Prisma, Role, SubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import {
  assignBadgeToUser,
  grantReputationToUser,
  resetReputationForUser
} from "@/server/community-recognition";

const updateMemberBasicsSchema = z.object({
  memberId: z.string().cuid(),
  returnPath: z.string().optional(),
  name: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email().max(254),
  role: z.nativeEnum(Role)
});

const updateMembershipTierSchema = z.object({
  memberId: z.string().cuid(),
  returnPath: z.string().optional(),
  membershipTier: z.nativeEnum(MembershipTier)
});

const memberSuspendSchema = z.object({
  memberId: z.string().cuid(),
  returnPath: z.string().optional()
});

const grantReputationSchema = z.object({
  memberId: z.string().cuid(),
  returnPath: z.string().optional(),
  points: z.coerce.number().int().min(1).max(1000)
});

const assignBadgeSchema = z.object({
  memberId: z.string().cuid(),
  returnPath: z.string().optional(),
  badgeSlug: z.string().trim().min(1).max(120)
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(candidate: string | undefined, fallback = "/admin/members"): string {
  return safeRedirectPath(candidate, fallback);
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

function forceTierFromRole(role: Role, fallback: MembershipTier): MembershipTier {
  if (role === Role.ADMIN) {
    return MembershipTier.CORE;
  }

  if (role === Role.INNER_CIRCLE && fallback === MembershipTier.FOUNDATION) {
    return MembershipTier.INNER_CIRCLE;
  }

  return fallback;
}

function revalidateMemberManagerPaths(memberId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/dashboard");
  revalidatePath("/directory");
  revalidatePath("/community");
  revalidatePath("/inner-circle");
  revalidatePath(`/members/${memberId}`);
}

async function ensureMemberExists(memberId: string) {
  return db.user.findUnique({
    where: {
      id: memberId
    },
    select: {
      id: true
    }
  });
}

async function ensureAdminDemotionAllowed(memberId: string) {
  const activeAdmins = await db.user.count({
    where: {
      role: Role.ADMIN,
      suspended: false
    }
  });

  const target = await db.user.findUnique({
    where: {
      id: memberId
    },
    select: {
      role: true,
      suspended: true
    }
  });

  if (!target) {
    return;
  }

  if (target.role === Role.ADMIN && !target.suspended && activeAdmins <= 1) {
    throw new Error("last-active-admin");
  }
}

export async function updateMemberBasicsAction(formData: FormData) {
  const session = await requireAdmin();
  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string" ? String(formData.get("returnPath")) : undefined
  );

  const parsed = updateMemberBasicsSchema.safeParse({
    memberId: formData.get("memberId"),
    returnPath: formData.get("returnPath"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const { memberId, role } = parsed.data;
  const returnPath = resolveReturnPath(parsed.data.returnPath, fallbackReturnPath);
  const normalizedName = parsed.data.name?.trim() || null;
  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const target = await db.user.findUnique({
    where: {
      id: memberId
    },
    select: {
      id: true,
      email: true,
      role: true,
      membershipTier: true
    }
  });

  if (!target) {
    redirectWithError(returnPath, "not-found");
  }

  if (target.id === session.user.id && role !== Role.ADMIN) {
    redirectWithError(returnPath, "self-role");
  }

  if (target.role === Role.ADMIN && role !== Role.ADMIN) {
    try {
      await ensureAdminDemotionAllowed(memberId);
    } catch {
      redirectWithError(returnPath, "last-admin");
    }
  }

  const resolvedTier = forceTierFromRole(role, target.membershipTier);
  const updateData: Prisma.UserUpdateInput = {
    name: normalizedName,
    email: normalizedEmail,
    role,
    membershipTier: resolvedTier
  };

  if (normalizedEmail !== target.email.toLowerCase()) {
    updateData.emailVerified = null;
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: memberId
        },
        data: updateData
      });

      await tx.subscription.upsert({
        where: {
          userId: memberId
        },
        update: {
          tier: resolvedTier
        },
        create: {
          userId: memberId,
          tier: resolvedTier,
          status: SubscriptionStatus.INCOMPLETE
        }
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        redirectWithError(returnPath, "email-exists");
      }

      if (error.code === "P2025") {
        redirectWithError(returnPath, "not-found");
      }
    }

    throw error;
  }

  revalidateMemberManagerPaths(memberId);
  redirectWithNotice(returnPath, "member-updated");
}

export async function updateMemberTierAction(formData: FormData) {
  await requireAdmin();

  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string" ? String(formData.get("returnPath")) : undefined
  );

  const parsed = updateMembershipTierSchema.safeParse({
    memberId: formData.get("memberId"),
    returnPath: formData.get("returnPath"),
    membershipTier: formData.get("membershipTier")
  });

  if (!parsed.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const { memberId } = parsed.data;
  const returnPath = resolveReturnPath(parsed.data.returnPath, fallbackReturnPath);

  const target = await db.user.findUnique({
    where: {
      id: memberId
    },
    select: {
      role: true
    }
  });

  if (!target) {
    redirectWithError(returnPath, "not-found");
  }

  const resolvedTier = forceTierFromRole(target.role, parsed.data.membershipTier);

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: memberId
        },
        data: {
          membershipTier: resolvedTier
        }
      });

      await tx.subscription.upsert({
        where: {
          userId: memberId
        },
        update: {
          tier: resolvedTier
        },
        create: {
          userId: memberId,
          tier: resolvedTier,
          status: SubscriptionStatus.INCOMPLETE
        }
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirectWithError(returnPath, "not-found");
    }

    throw error;
  }

  revalidateMemberManagerPaths(memberId);
  redirectWithNotice(returnPath, "tier-updated");
}

export async function suspendMemberAction(formData: FormData) {
  const session = await requireAdmin();

  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string" ? String(formData.get("returnPath")) : undefined
  );

  const parsed = memberSuspendSchema.safeParse({
    memberId: formData.get("memberId"),
    returnPath: formData.get("returnPath")
  });

  if (!parsed.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const { memberId } = parsed.data;
  const returnPath = resolveReturnPath(parsed.data.returnPath, fallbackReturnPath);

  if (memberId === session.user.id) {
    redirectWithError(returnPath, "self-suspend");
  }

  try {
    await ensureAdminDemotionAllowed(memberId);
  } catch {
    redirectWithError(returnPath, "last-admin");
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: memberId
        },
        data: {
          suspended: true,
          suspendedAt: new Date()
        }
      });

      await tx.session.deleteMany({
        where: {
          userId: memberId
        }
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirectWithError(returnPath, "not-found");
    }

    throw error;
  }

  revalidateMemberManagerPaths(memberId);
  redirectWithNotice(returnPath, "member-suspended");
}

export async function unsuspendMemberAction(formData: FormData) {
  await requireAdmin();

  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string" ? String(formData.get("returnPath")) : undefined
  );

  const parsed = memberSuspendSchema.safeParse({
    memberId: formData.get("memberId"),
    returnPath: formData.get("returnPath")
  });

  if (!parsed.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const { memberId } = parsed.data;
  const returnPath = resolveReturnPath(parsed.data.returnPath, fallbackReturnPath);

  try {
    await db.user.update({
      where: {
        id: memberId
      },
      data: {
        suspended: false,
        suspendedAt: null
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirectWithError(returnPath, "not-found");
    }

    throw error;
  }

  revalidateMemberManagerPaths(memberId);
  redirectWithNotice(returnPath, "member-unsuspended");
}

export async function grantMemberReputationAction(formData: FormData) {
  await requireAdmin();

  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string" ? String(formData.get("returnPath")) : undefined
  );

  const parsed = grantReputationSchema.safeParse({
    memberId: formData.get("memberId"),
    returnPath: formData.get("returnPath"),
    points: formData.get("points")
  });

  if (!parsed.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const { memberId, points } = parsed.data;
  const returnPath = resolveReturnPath(parsed.data.returnPath, fallbackReturnPath);
  const member = await ensureMemberExists(memberId);

  if (!member) {
    redirectWithError(returnPath, "not-found");
  }

  await grantReputationToUser({
    userId: memberId,
    points
  });

  revalidateMemberManagerPaths(memberId);
  redirectWithNotice(returnPath, "reputation-granted");
}

export async function resetMemberReputationAction(formData: FormData) {
  await requireAdmin();

  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string" ? String(formData.get("returnPath")) : undefined
  );

  const parsed = memberSuspendSchema.safeParse({
    memberId: formData.get("memberId"),
    returnPath: formData.get("returnPath")
  });

  if (!parsed.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const { memberId } = parsed.data;
  const returnPath = resolveReturnPath(parsed.data.returnPath, fallbackReturnPath);
  const member = await ensureMemberExists(memberId);

  if (!member) {
    redirectWithError(returnPath, "not-found");
  }

  await resetReputationForUser(memberId);

  revalidateMemberManagerPaths(memberId);
  redirectWithNotice(returnPath, "reputation-reset");
}

export async function assignMemberBadgeAction(formData: FormData) {
  await requireAdmin();

  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string" ? String(formData.get("returnPath")) : undefined
  );

  const parsed = assignBadgeSchema.safeParse({
    memberId: formData.get("memberId"),
    returnPath: formData.get("returnPath"),
    badgeSlug: formData.get("badgeSlug")
  });

  if (!parsed.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const { memberId, badgeSlug } = parsed.data;
  const returnPath = resolveReturnPath(parsed.data.returnPath, fallbackReturnPath);
  const member = await ensureMemberExists(memberId);

  if (!member) {
    redirectWithError(returnPath, "not-found");
  }

  try {
    await assignBadgeToUser({
      userId: memberId,
      badgeSlug
    });
  } catch (error) {
    if (error instanceof Error && error.message === "badge-not-found") {
      redirectWithError(returnPath, "badge-not-found");
    }

    throw error;
  }

  revalidateMemberManagerPaths(memberId);
  redirectWithNotice(returnPath, "badge-assigned");
}
