import { ResourceApprovalStatus, ResourceStatus, ResourceTier } from "@prisma/client";
import { RESOURCE_DAILY_PUBLISH_TIMES, RESOURCE_SCHEDULE_TIMEZONE } from "@/config/resources";
import { db } from "@/lib/db";
import {
  parseScheduleTime,
  zonedDateTimeToUtc
} from "@/lib/resources";
import { findNextAvailableResourceSlot } from "@/server/resources/resource-publishing.service";
import {
  ResourceGenerationError,
  formatGenerationDateKey
} from "@/server/resources/resource-generation-guards";

function calendarDateFromGenerationDate(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

async function isSlotOccupied(slot: Date, excludeResourceId?: string) {
  const occupied = await db.resource.findFirst({
    where: {
      id: excludeResourceId ? { not: excludeResourceId } : undefined,
      OR: [
        {
          scheduledFor: slot
        },
        {
          publishedAt: slot
        }
      ]
    },
    select: {
      id: true
    }
  });

  return Boolean(occupied);
}

export async function findDailyResourceSlot(input: {
  tier: ResourceTier;
  generationDate: Date;
  resourceId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const configuredTime = RESOURCE_DAILY_PUBLISH_TIMES[input.tier];
  const parsed = parseScheduleTime(configuredTime);
  const candidate = zonedDateTimeToUtc(
    {
      ...calendarDateFromGenerationDate(input.generationDate),
      hour: parsed.hour,
      minute: parsed.minute
    },
    RESOURCE_SCHEDULE_TIMEZONE
  );

  if (
    candidate.getTime() > now.getTime() &&
    !(await isSlotOccupied(candidate, input.resourceId))
  ) {
    return candidate;
  }

  return findNextAvailableResourceSlot(input.tier, now);
}

export async function scheduleApprovedDailyBatch(input: {
  batchId: string;
  adminUserId: string;
  now?: Date;
}) {
  const batch = await db.dailyResourceBatch.findUnique({
    where: { id: input.batchId },
    select: {
      id: true,
      generationDate: true,
      resources: {
        select: {
          id: true,
          tier: true,
          title: true,
          approvalStatus: true,
          status: true,
          scheduledFor: true
        }
      }
    }
  });

  if (!batch) {
    throw new ResourceGenerationError("Daily resource batch not found.", "batch-not-found");
  }

  if (batch.resources.length !== 3) {
    throw new ResourceGenerationError(
      "Schedule failed because the daily set does not contain three resources.",
      "batch-size-invalid",
      { count: batch.resources.length }
    );
  }

  const notApproved = batch.resources.filter(
    (resource) =>
      resource.approvalStatus !== ResourceApprovalStatus.APPROVED &&
      resource.approvalStatus !== ResourceApprovalStatus.SCHEDULED &&
      resource.approvalStatus !== ResourceApprovalStatus.PUBLISHED
  );

  if (notApproved.length) {
    throw new ResourceGenerationError(
      "Schedule failed because not every resource is approved.",
      "batch-not-approved",
      { resourceIds: notApproved.map((resource) => resource.id) }
    );
  }

  const slots = await Promise.all(
    batch.resources.map(async (resource) => ({
      resourceId: resource.id,
      slot: await findDailyResourceSlot({
        tier: resource.tier,
        generationDate: batch.generationDate,
        resourceId: resource.id,
        now: input.now
      })
    }))
  );

  await db.$transaction([
    ...slots.map((item) =>
      db.resource.update({
        where: { id: item.resourceId },
        data: {
          status: ResourceStatus.SCHEDULED,
          approvalStatus: ResourceApprovalStatus.SCHEDULED,
          scheduledFor: item.slot,
          publishedAt: null,
          approvedAt: new Date(),
          approvedById: input.adminUserId
        }
      })
    ),
    db.dailyResourceBatch.update({
      where: { id: batch.id },
      data: {
        status: "SCHEDULED",
        scheduledAt: new Date(),
        metadata: {
          scheduledById: input.adminUserId,
          scheduledForDate: formatGenerationDateKey(batch.generationDate),
          slots: slots.map((item) => ({
            resourceId: item.resourceId,
            scheduledFor: item.slot.toISOString()
          }))
        }
      }
    })
  ]);

  return {
    batchId: batch.id,
    slots
  };
}
