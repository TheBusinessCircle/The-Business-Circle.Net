import {
  DailyResourceBatchStatus,
  ResourceApprovalStatus,
  ResourceStatus,
  ResourceTier
} from "@prisma/client";
import { db } from "@/lib/db";
import { generateFutureTierScheduleSlots } from "@/lib/resources";
import { RESOURCE_AUTOMATION_THROTTLE_MS } from "@/config/resources";

let lastResourcePublishingSweepAt = 0;

export type PublishDueResourcesResult = {
  publishedCount: number;
  publishedIds: string[];
};

export async function publishDueResources(now = new Date()): Promise<PublishDueResourcesResult> {
  const dueResources = await db.resource.findMany({
    where: {
      status: ResourceStatus.SCHEDULED,
      scheduledFor: {
        lte: now
      }
    },
    select: {
      id: true,
      scheduledFor: true,
      generationBatchId: true
    },
    orderBy: {
      scheduledFor: "asc"
    }
  });

  if (!dueResources.length) {
    return {
      publishedCount: 0,
      publishedIds: []
    };
  }

  await db.$transaction(
    dueResources.map((resource) =>
      db.resource.update({
        where: {
          id: resource.id
        },
        data: {
          status: ResourceStatus.PUBLISHED,
          approvalStatus: ResourceApprovalStatus.PUBLISHED,
          publishedAt: resource.scheduledFor ?? now,
          scheduledFor: null
        }
      })
    )
  );

  const batchIds = Array.from(
    new Set(
      dueResources
        .map((resource) => resource.generationBatchId)
        .filter((value): value is string => Boolean(value))
    )
  );

  for (const batchId of batchIds) {
    const batch = await db.dailyResourceBatch.findUnique({
      where: { id: batchId },
      select: {
        resources: {
          select: {
            status: true
          }
        }
      }
    });

    if (batch?.resources.length) {
      const publishedCount = batch.resources.filter(
        (resource) => resource.status === ResourceStatus.PUBLISHED
      ).length;

      await db.dailyResourceBatch.update({
        where: { id: batchId },
        data: {
          status:
            publishedCount === batch.resources.length
              ? DailyResourceBatchStatus.PUBLISHED
              : DailyResourceBatchStatus.PARTIALLY_PUBLISHED
        }
      });
    }
  }

  return {
    publishedCount: dueResources.length,
    publishedIds: dueResources.map((resource) => resource.id)
  };
}

export async function maybePublishDueResources(now = new Date()) {
  if (now.getTime() - lastResourcePublishingSweepAt < RESOURCE_AUTOMATION_THROTTLE_MS) {
    return {
      publishedCount: 0,
      publishedIds: [],
      throttled: true
    };
  }

  lastResourcePublishingSweepAt = now.getTime();
  const result = await publishDueResources(now);

  return {
    ...result,
    throttled: false
  };
}

export async function findNextAvailableResourceSlot(
  tier: ResourceTier,
  afterDate = new Date()
): Promise<Date> {
  let searchFrom = afterDate;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidates = generateFutureTierScheduleSlots(tier, 18, searchFrom);

    if (!candidates.length) {
      break;
    }

    const occupiedRows = await db.resource.findMany({
      where: {
        OR: [
          {
            scheduledFor: {
              in: candidates
            }
          },
          {
            publishedAt: {
              in: candidates
            }
          }
        ]
      },
      select: {
        scheduledFor: true,
        publishedAt: true
      }
    });

    const occupied = new Set<string>();
    occupiedRows.forEach((row) => {
      if (row.scheduledFor) {
        occupied.add(row.scheduledFor.toISOString());
      }

      if (row.publishedAt) {
        occupied.add(row.publishedAt.toISOString());
      }
    });

    const openCandidate = candidates.find(
      (candidate) => !occupied.has(candidate.toISOString())
    );

    if (openCandidate) {
      return openCandidate;
    }

    searchFrom = new Date(candidates[candidates.length - 1].getTime() + 60_000);
  }

  const fallback = generateFutureTierScheduleSlots(tier, 1, afterDate)[0];
  if (!fallback) {
    throw new Error(`Unable to generate a future publishing slot for ${tier}.`);
  }

  return fallback;
}
