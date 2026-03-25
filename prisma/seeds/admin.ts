import { BusinessStage, MembershipTier, PrismaClient, Role, SubscriptionStatus } from "@prisma/client";
import { hash } from "bcryptjs";

export async function seedAdminAccount(prisma: PrismaClient): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail) {
    console.info("[seed] ADMIN_EMAIL not set. Skipping admin account seed.");
    return;
  }

  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hash(password, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Platform Admin",
      passwordHash,
      role: Role.ADMIN,
      membershipTier: MembershipTier.INNER_CIRCLE,
      suspended: false,
      suspendedAt: null
    },
    create: {
      email: adminEmail,
      name: "Platform Admin",
      passwordHash,
      role: Role.ADMIN,
      membershipTier: MembershipTier.INNER_CIRCLE,
      suspended: false
    }
  });

  const profile = await prisma.profile.upsert({
    where: { userId: adminUser.id },
    update: {
      headline: "Platform Administrator",
      bio: "System administration and community operations.",
      location: "United Kingdom",
      experience: "10+ years in business systems",
      collaborationTags: ["operations", "strategy"],
      isPublic: false
    },
    create: {
      userId: adminUser.id,
      headline: "Platform Administrator",
      bio: "System administration and community operations.",
      location: "United Kingdom",
      experience: "10+ years in business systems",
      collaborationTags: ["operations", "strategy"],
      isPublic: false
    }
  });

  await prisma.business.upsert({
    where: { profileId: profile.id },
    update: {
      companyName: "The Business Circle Network",
      description: "Community-first growth ecosystem",
      industry: "Community",
      services: "Platform management",
      stage: BusinessStage.ESTABLISHED,
      isPublic: false
    },
    create: {
      profileId: profile.id,
      companyName: "The Business Circle Network",
      description: "Community-first growth ecosystem",
      industry: "Community",
      services: "Platform management",
      stage: BusinessStage.ESTABLISHED,
      isPublic: false
    }
  });

  await prisma.subscription.upsert({
    where: { userId: adminUser.id },
    update: {
      tier: MembershipTier.INNER_CIRCLE,
      status: SubscriptionStatus.ACTIVE
    },
    create: {
      userId: adminUser.id,
      tier: MembershipTier.INNER_CIRCLE,
      status: SubscriptionStatus.ACTIVE
    }
  });

  console.info(`[seed] Admin ready: ${adminUser.email}`);
}