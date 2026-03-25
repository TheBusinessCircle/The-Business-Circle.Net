import { db } from "@/lib/db";

function laterDate(left: Date | null | undefined, right: Date | null | undefined) {
  if (!left) {
    return right ?? null;
  }

  if (!right) {
    return left;
  }

  return left.getTime() >= right.getTime() ? left : right;
}

export async function getRecentActivityByUserIds(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const activityByUserId = new Map<string, Date | null>();

  if (!uniqueUserIds.length) {
    return activityByUserId;
  }

  const [postActivity, commentActivity, messageActivity] = await Promise.all([
    db.communityPost.groupBy({
      by: ["userId"],
      where: {
        userId: {
          in: uniqueUserIds
        },
        deletedAt: null
      },
      _max: {
        createdAt: true
      }
    }),
    db.communityComment.groupBy({
      by: ["userId"],
      where: {
        userId: {
          in: uniqueUserIds
        },
        deletedAt: null
      },
      _max: {
        createdAt: true
      }
    }),
    db.message.groupBy({
      by: ["userId"],
      where: {
        userId: {
          in: uniqueUserIds
        },
        deletedAt: null
      },
      _max: {
        createdAt: true
      }
    })
  ]);

  for (const record of postActivity) {
    activityByUserId.set(record.userId, record._max.createdAt ?? null);
  }

  for (const record of commentActivity) {
    activityByUserId.set(
      record.userId,
      laterDate(activityByUserId.get(record.userId), record._max.createdAt ?? null)
    );
  }

  for (const record of messageActivity) {
    activityByUserId.set(
      record.userId,
      laterDate(activityByUserId.get(record.userId), record._max.createdAt ?? null)
    );
  }

  for (const userId of uniqueUserIds) {
    if (!activityByUserId.has(userId)) {
      activityByUserId.set(userId, null);
    }
  }

  return activityByUserId;
}
