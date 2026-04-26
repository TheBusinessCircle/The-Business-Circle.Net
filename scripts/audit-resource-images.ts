import { ResourceGenerationSource, ResourceStatus } from "@prisma/client";
import { loadLocalEnv } from "./load-env";

function imageAttentionScore(resource: {
  coverImage: string | null;
  generatedImageUrl: string | null;
  mediaUrl: string | null;
  imageDirection: string | null;
  imagePrompt: string | null;
  status: ResourceStatus;
}) {
  let score = 0;

  if (!resource.coverImage && !resource.generatedImageUrl && !resource.mediaUrl) {
    score += 6;
  }

  if (!resource.imageDirection) {
    score += 2;
  }

  if (!resource.imagePrompt) {
    score += 2;
  }

  if (resource.status === ResourceStatus.PUBLISHED) {
    score += 3;
  }

  return score;
}

async function main() {
  loadLocalEnv();
  const { db } = await import("@/lib/db");
  const [
    total,
    published,
    draftGenerated,
    manualCoverImage,
    generatedCoverImage,
    mediaImage,
    missingDirection,
    missingPrompt,
    resources
  ] = await Promise.all([
    db.resource.count(),
    db.resource.count({ where: { status: ResourceStatus.PUBLISHED } }),
    db.resource.count({
      where: {
        generationSource: ResourceGenerationSource.DAILY_AI,
        status: {
          in: [ResourceStatus.DRAFT, ResourceStatus.SCHEDULED]
        }
      }
    }),
    db.resource.count({
      where: {
        coverImage: {
          not: null
        },
        generatedImageUrl: null
      }
    }),
    db.resource.count({
      where: {
        generatedImageUrl: {
          not: null
        }
      }
    }),
    db.resource.count({
      where: {
        mediaType: "IMAGE",
        mediaUrl: {
          not: null
        }
      }
    }),
    db.resource.count({
      where: {
        imageDirection: null
      }
    }),
    db.resource.count({
      where: {
        imagePrompt: null
      }
    }),
    db.resource.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        tier: true,
        category: true,
        type: true,
        status: true,
        approvalStatus: true,
        imageStatus: true,
        coverImage: true,
        generatedImageUrl: true,
        mediaUrl: true,
        imageDirection: true,
        imagePrompt: true
      },
      take: 500,
      orderBy: [{ status: "desc" }, { updatedAt: "desc" }]
    })
  ]);

  const fallback = resources.filter(
    (resource) =>
      !resource.coverImage && !resource.generatedImageUrl && !resource.mediaUrl
  ).length;
  const needsAttention = resources
    .map((resource) => ({
      ...resource,
      attentionScore: imageAttentionScore(resource)
    }))
    .filter((resource) => resource.attentionScore > 0)
    .sort((left, right) => right.attentionScore - left.attentionScore)
    .slice(0, 12);

  console.log("Resource image audit");
  console.log("====================");
  console.log(`Total resources: ${total}`);
  console.log(`Published resources: ${published}`);
  console.log(`Draft or scheduled generated resources: ${draftGenerated}`);
  console.log(`Resources with manual coverImage: ${manualCoverImage}`);
  console.log(`Resources with generated cover image: ${generatedCoverImage}`);
  console.log(`Resources with media image: ${mediaImage}`);
  console.log(`Resources using fallback: ${fallback}`);
  console.log(`Resources missing image direction: ${missingDirection}`);
  console.log(`Resources missing image prompt: ${missingPrompt}`);
  console.log("");
  console.log("Top resources needing image attention");
  console.log("-------------------------------------");

  if (!needsAttention.length) {
    console.log("No obvious image issues found.");
    return;
  }

  needsAttention.forEach((resource, index) => {
    console.log(
      `${index + 1}. ${resource.title} (${resource.tier}, ${resource.category}, ${resource.type})`
    );
    console.log(
      `   /${resource.slug} | status=${resource.status} approval=${resource.approvalStatus} image=${resource.imageStatus} score=${resource.attentionScore}`
    );
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const { db } = await import("@/lib/db");
      await db.$disconnect();
    } catch {
      // The DB may not have initialised if environment validation failed.
    }
  });
