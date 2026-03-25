import { PrismaClient } from "@prisma/client";
import { buildPlannedResourceSeeds } from "../../src/lib/resources/catalog";
import { membershipTierForResourceTier } from "../../src/lib/db/access";

type SeedResourceLibraryOptions = {
  pruneExisting?: boolean;
};

export async function seedResourceLibrary(
  prisma: PrismaClient,
  options: SeedResourceLibraryOptions = {}
): Promise<void> {
  const plannedResources = buildPlannedResourceSeeds(new Date());
  const plannedSlugs = plannedResources.map((resource) => resource.slug);
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@businesscircle.local").trim().toLowerCase();
  const author = await prisma.user.findUnique({
    where: {
      email: adminEmail
    },
    select: {
      id: true
    }
  });

  if (options.pruneExisting) {
    await prisma.resource.deleteMany({
      where: {
        slug: {
          notIn: plannedSlugs
        }
      }
    });
  }

  for (const resource of plannedResources) {
    await prisma.resource.upsert({
      where: {
        slug: resource.slug
      },
      update: {
        title: resource.title,
        content: resource.content,
        excerpt: resource.excerpt,
        summary: resource.summary,
        tier: resource.tier,
        accessTier: membershipTierForResourceTier(resource.tier),
        category: resource.category,
        type: resource.type,
        status: resource.status,
        scheduledFor: resource.scheduledFor,
        publishedAt: resource.publishedAt,
        estimatedReadMinutes: resource.estimatedReadMinutes,
        authorId: author?.id ?? undefined
      },
      create: {
        title: resource.title,
        slug: resource.slug,
        content: resource.content,
        excerpt: resource.excerpt,
        summary: resource.summary,
        tier: resource.tier,
        accessTier: membershipTierForResourceTier(resource.tier),
        category: resource.category,
        type: resource.type,
        status: resource.status,
        scheduledFor: resource.scheduledFor,
        publishedAt: resource.publishedAt,
        estimatedReadMinutes: resource.estimatedReadMinutes,
        authorId: author?.id ?? undefined
      }
    });
  }

  console.info(
    `[seed] Resource library ready: ${plannedResources.length} resources (${plannedResources.filter((item) => item.status === "PUBLISHED").length} published, ${plannedResources.filter((item) => item.status === "SCHEDULED").length} scheduled).`
  );
}
