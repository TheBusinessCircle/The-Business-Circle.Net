import { ResourceStatus, ResourceTier } from "@prisma/client";
import { db } from "@/lib/db";

const TIMEZONE = "Europe/London";

function slotInfo(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${weekday} ${hour}:${minute}`;
}

async function main() {
  const total = await db.resource.count();
  const grouped = await db.resource.groupBy({
    by: ["tier", "status"],
    _count: {
      _all: true
    }
  });
  const scheduled = await db.resource.findMany({
    where: {
      status: ResourceStatus.SCHEDULED
    },
    orderBy: [{ tier: "asc" }, { scheduledFor: "asc" }],
    select: {
      tier: true,
      scheduledFor: true
    }
  });
  const published = await db.resource.count({
    where: {
      status: ResourceStatus.PUBLISHED
    }
  });

  const overlaps = new Set<string>();
  const seen = new Set<string>();

  scheduled.forEach((item) => {
    if (!item.scheduledFor) {
      return;
    }

    const key = item.scheduledFor.toISOString();
    if (seen.has(key)) {
      overlaps.add(key);
    }

    seen.add(key);
  });

  const report = {
    total,
    published,
    scheduled: scheduled.length,
    grouped,
    overlaps: Array.from(overlaps),
    samples: {
      FOUNDATION: scheduled
        .filter((item) => item.tier === ResourceTier.FOUNDATION)
        .slice(0, 3)
        .map((item) => slotInfo(item.scheduledFor as Date)),
      INNER: scheduled
        .filter((item) => item.tier === ResourceTier.INNER)
        .slice(0, 3)
        .map((item) => slotInfo(item.scheduledFor as Date)),
      CORE: scheduled
        .filter((item) => item.tier === ResourceTier.CORE)
        .slice(0, 3)
        .map((item) => slotInfo(item.scheduledFor as Date))
    }
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
