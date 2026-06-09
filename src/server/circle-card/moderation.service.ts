import "server-only";

import {
  ModerationActionType,
  ModerationEntityType,
  Prisma
} from "@prisma/client";
import type { CircleCardReportStatusValue } from "@/lib/circle-card/reports";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type CircleCardModerationIntent = "notes" | "review" | "resolve" | "dismiss";

const CIRCLE_CARD_MODERATION_LIMIT = 120;
const OPEN_REPORT_STATUSES: CircleCardReportStatusValue[] = ["OPEN", "REVIEWING"];

function compactPreview(value: string | null | undefined, maxLength = 240) {
  const compacted = (value ?? "").replace(/\s+/g, " ").trim();
  if (!compacted) {
    return null;
  }

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trim()}...`;
}

function auditNotes(input: Record<string, unknown>) {
  return JSON.stringify(input);
}

function actionForIntent(intent: CircleCardModerationIntent) {
  if (intent === "resolve") {
    return ModerationActionType.RESOLVE_REPORT;
  }

  if (intent === "dismiss") {
    return ModerationActionType.DISMISS_REPORT;
  }

  return ModerationActionType.REVIEW_REPORT;
}

function statusForIntent(
  intent: CircleCardModerationIntent,
  currentStatus: CircleCardReportStatusValue
): CircleCardReportStatusValue {
  if (intent === "review") {
    return "REVIEWING";
  }

  if (intent === "resolve") {
    return "RESOLVED";
  }

  if (intent === "dismiss") {
    return "DISMISSED";
  }

  return currentStatus;
}

export async function listCircleCardReportsForAdmin(input: {
  status?: CircleCardReportStatusValue | "ALL";
  limit?: number;
} = {}) {
  await requireAdmin();

  const limit = Math.min(input.limit ?? CIRCLE_CARD_MODERATION_LIMIT, CIRCLE_CARD_MODERATION_LIMIT);
  const where: Prisma.CircleCardReportWhereInput =
    input.status && input.status !== "ALL"
      ? { status: input.status }
      : input.status === "ALL"
        ? {}
        : {
            status: {
              in: OPEN_REPORT_STATUSES
            }
          };

  const [reports, total, openCount] = await Promise.all([
    db.circleCardReport.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
      take: limit,
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        updatedAt: true,
        reviewedAt: true,
        card: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true,
            role: true,
            customLinks: {
              where: {
                OR: [
                  { fileUrl: { not: null } },
                  { fileName: { not: null } },
                  { fileMimeType: { not: null } }
                ]
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              select: {
                id: true,
                label: true,
                type: true,
                fileUrl: true,
                fileName: true,
                fileMimeType: true
              }
            }
          }
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reporterUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    db.circleCardReport.count({ where }),
    db.circleCardReport.count({
      where: {
        status: {
          in: OPEN_REPORT_STATUSES
        }
      }
    })
  ]);

  return {
    items: reports.map((report) => ({
      ...report,
      detailsPreview: compactPreview(report.details),
      adminNotesPreview: compactPreview(report.adminNotes)
    })),
    total,
    openCount,
    limit
  };
}

export async function updateCircleCardReportForAdmin(input: {
  adminUserId: string;
  reportId: string;
  intent: CircleCardModerationIntent;
  adminNotes?: string | null;
}) {
  const now = new Date();
  const nextAdminNotes = input.adminNotes?.trim() || null;

  return db.$transaction(async (tx) => {
    const report = await tx.circleCardReport.findUnique({
      where: {
        id: input.reportId
      },
      select: {
        id: true,
        cardId: true,
        reportedUserId: true,
        reporterUserId: true,
        reason: true,
        status: true
      }
    });

    if (!report) {
      throw new Error("circle-card-report-not-found");
    }

    const previousStatus = report.status as CircleCardReportStatusValue;
    const nextStatus = statusForIntent(input.intent, previousStatus);

    const updated = await tx.circleCardReport.update({
      where: {
        id: report.id
      },
      data: {
        status: nextStatus,
        adminNotes: nextAdminNotes,
        ...(input.intent === "notes"
          ? {}
          : {
              reviewedAt: now,
              reviewedById: input.adminUserId
            })
      },
      select: {
        id: true,
        status: true
      }
    });

    await tx.moderationAuditLog.create({
      data: {
        adminUserId: input.adminUserId,
        entityType: ModerationEntityType.CIRCLE_CARD_REPORT,
        entityId: report.id,
        action: actionForIntent(input.intent),
        notes: auditNotes({
          cardId: report.cardId,
          reportedUserId: report.reportedUserId,
          reporterUserId: report.reporterUserId,
          reason: report.reason,
          previousStatus,
          nextStatus: updated.status,
          notesUpdated: Boolean(nextAdminNotes)
        })
      }
    });

    return updated;
  });
}
