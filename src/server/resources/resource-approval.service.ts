import {
  DailyResourceBatchStatus,
  ResourceApprovalStatus,
  ResourceStatus
} from "@prisma/client";
import { db } from "@/lib/db";
import { scheduleApprovedDailyBatch } from "@/server/resources/resource-scheduling.service";
import {
  ResourceGenerationError,
  validateResourceForApproval
} from "@/server/resources/resource-generation-guards";

function deriveBatchStatus(resources: Array<{
  status: ResourceStatus;
  approvalStatus: ResourceApprovalStatus;
}>) {
  if (!resources.length) {
    return DailyResourceBatchStatus.DRAFT;
  }

  const everyRejected = resources.every(
    (resource) => resource.approvalStatus === ResourceApprovalStatus.REJECTED
  );
  if (everyRejected) {
    return DailyResourceBatchStatus.REJECTED;
  }

  const published = resources.filter((resource) => resource.status === ResourceStatus.PUBLISHED);
  if (published.length === resources.length) {
    return DailyResourceBatchStatus.PUBLISHED;
  }
  if (published.length > 0) {
    return DailyResourceBatchStatus.PARTIALLY_PUBLISHED;
  }

  const scheduled = resources.filter((resource) => resource.status === ResourceStatus.SCHEDULED);
  if (scheduled.length === resources.length) {
    return DailyResourceBatchStatus.SCHEDULED;
  }

  const approvedStatuses = new Set<ResourceApprovalStatus>([
    ResourceApprovalStatus.APPROVED,
    ResourceApprovalStatus.SCHEDULED,
    ResourceApprovalStatus.PUBLISHED
  ]);
  const approved = resources.filter((resource) =>
    approvedStatuses.has(resource.approvalStatus)
  );

  if (approved.length === resources.length) {
    return DailyResourceBatchStatus.APPROVED;
  }

  if (approved.length > 0) {
    return DailyResourceBatchStatus.PARTIALLY_APPROVED;
  }

  return DailyResourceBatchStatus.PENDING_APPROVAL;
}

export async function refreshDailyResourceBatchStatus(batchId: string) {
  const batch = await db.dailyResourceBatch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      resources: {
        select: {
          status: true,
          approvalStatus: true
        }
      }
    }
  });

  if (!batch) {
    return null;
  }

  const status = deriveBatchStatus(batch.resources);

  return db.dailyResourceBatch.update({
    where: { id: batchId },
    data: { status },
    select: {
      id: true,
      status: true
    }
  });
}

export async function approveGeneratedResource(input: {
  resourceId: string;
  adminUserId: string;
}) {
  const resource = await db.resource.findUnique({
    where: { id: input.resourceId },
    select: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      tier: true,
      category: true,
      type: true,
      imagePrompt: true,
      imageStatus: true,
      approvalStatus: true,
      generationBatchId: true
    }
  });

  if (!resource) {
    throw new ResourceGenerationError("Resource not found.", "resource-not-found");
  }

  validateResourceForApproval(resource);

  await db.resource.update({
    where: { id: resource.id },
    data: {
      approvalStatus: ResourceApprovalStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: input.adminUserId,
      rejectedAt: null,
      rejectedById: null
    }
  });

  if (resource.generationBatchId) {
    await refreshDailyResourceBatchStatus(resource.generationBatchId);
  }

  return { resourceId: resource.id };
}

export async function rejectGeneratedResource(input: {
  resourceId: string;
  adminUserId: string;
}) {
  const resource = await db.resource.findUnique({
    where: { id: input.resourceId },
    select: {
      id: true,
      generationBatchId: true
    }
  });

  if (!resource) {
    throw new ResourceGenerationError("Resource not found.", "resource-not-found");
  }

  await db.resource.update({
    where: { id: resource.id },
    data: {
      approvalStatus: ResourceApprovalStatus.REJECTED,
      rejectedAt: new Date(),
      rejectedById: input.adminUserId
    }
  });

  if (resource.generationBatchId) {
    await refreshDailyResourceBatchStatus(resource.generationBatchId);
  }

  return { resourceId: resource.id };
}

export async function requestResourceRegeneration(resourceId: string) {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      lockedAt: true,
      generationBatchId: true
    }
  });

  if (!resource) {
    throw new ResourceGenerationError("Resource not found.", "resource-not-found");
  }

  if (resource.lockedAt) {
    throw new ResourceGenerationError(
      "This resource is locked and cannot be regenerated.",
      "resource-locked"
    );
  }

  await db.resource.update({
    where: { id: resource.id },
    data: {
      approvalStatus: ResourceApprovalStatus.REGENERATE_REQUESTED
    }
  });

  if (resource.generationBatchId) {
    await refreshDailyResourceBatchStatus(resource.generationBatchId);
  }

  return { resourceId: resource.id };
}

export async function toggleGeneratedResourceLock(input: {
  resourceId: string;
  adminUserId: string;
}) {
  const resource = await db.resource.findUnique({
    where: { id: input.resourceId },
    select: {
      id: true,
      lockedAt: true,
      generationBatchId: true
    }
  });

  if (!resource) {
    throw new ResourceGenerationError("Resource not found.", "resource-not-found");
  }

  await db.resource.update({
    where: { id: resource.id },
    data: resource.lockedAt
      ? {
          lockedAt: null,
          lockedById: null
        }
      : {
          lockedAt: new Date(),
          lockedById: input.adminUserId
        }
  });

  return { resourceId: resource.id, locked: !resource.lockedAt };
}

export async function approveDailyResourceBatch(input: {
  batchId: string;
  adminUserId: string;
}) {
  const batch = await db.dailyResourceBatch.findUnique({
    where: { id: input.batchId },
    select: {
      id: true,
      resources: {
        select: {
          id: true,
          title: true,
          excerpt: true,
          content: true,
          tier: true,
          category: true,
          type: true,
          imagePrompt: true,
          imageStatus: true,
          approvalStatus: true
        }
      }
    }
  });

  if (!batch) {
    throw new ResourceGenerationError("Daily resource batch not found.", "batch-not-found");
  }

  if (batch.resources.length !== 3) {
    throw new ResourceGenerationError(
      "Approval failed because this daily set is incomplete.",
      "batch-size-invalid",
      { count: batch.resources.length }
    );
  }

  batch.resources.forEach((resource) => validateResourceForApproval(resource));

  await db.$transaction([
    ...batch.resources.map((resource) =>
      db.resource.update({
        where: { id: resource.id },
        data: {
          approvalStatus: ResourceApprovalStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: input.adminUserId,
          rejectedAt: null,
          rejectedById: null
        }
      })
    ),
    db.dailyResourceBatch.update({
      where: { id: batch.id },
      data: {
        status: DailyResourceBatchStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: input.adminUserId
      }
    })
  ]);

  return { batchId: batch.id };
}

export async function approveAndScheduleDailyResourceBatch(input: {
  batchId: string;
  adminUserId: string;
}) {
  await approveDailyResourceBatch(input);
  return scheduleApprovedDailyBatch(input);
}
