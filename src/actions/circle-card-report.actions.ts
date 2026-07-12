"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import { circleCardReportSubmitSchema } from "@/lib/circle-card/reports";
import type { CircleCardReportActionState } from "@/lib/circle-card/report-action-state";
import { prisma } from "@/lib/prisma";
import {
  clientIpFromHeaders,
  consumeRateLimit
} from "@/lib/security/rate-limit";

function reportState(
  status: CircleCardReportActionState["status"],
  message: string
): CircleCardReportActionState {
  return {
    status,
    message
  };
}

export async function submitCircleCardReportAction(
  _previousState: CircleCardReportActionState,
  formData: FormData
): Promise<CircleCardReportActionState> {
  const parsed = circleCardReportSubmitSchema.safeParse({
    cardId: formData.get("cardId"),
    reason: formData.get("reason"),
    details: formData.get("details")
  });

  if (!parsed.success) {
    return reportState("error", "Check the report reason and optional details.");
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: parsed.data.cardId,
      isPublished: true,
      user: {
        suspended: false
      }
    },
    select: {
      id: true,
      userId: true
    }
  });

  if (!card) {
    return reportState("error", "This Circle Card could not be found.");
  }

  const [session, requestHeaders] = await Promise.all([auth(), headers()]);
  const reporterUserId = session?.user?.id ?? null;
  const reporterKey = reporterUserId
    ? `user:${reporterUserId}`
    : `ip:${clientIpFromHeaders(requestHeaders)}`;
  const rateLimit = await consumeRateLimit({
    key: `circle-card-report:${reporterKey}:${card.id}`,
    limit: 6,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return reportState(
      "error",
      "You've submitted several reports recently. Please try again later."
    );
  }

  await prisma.circleCardReport.create({
    data: {
      cardId: card.id,
      reportedUserId: card.userId,
      reporterUserId,
      reason: parsed.data.reason,
      details: parsed.data.details || null
    },
    select: {
      id: true
    }
  });

  return reportState(
    "success",
    "Thanks. This report is now in the moderation queue for human review."
  );
}
