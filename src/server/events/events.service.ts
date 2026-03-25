import { EventAccessLevel, type MembershipTier, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { PlatformEventModel } from "@/types";

const eventSelect = {
  id: true,
  title: true,
  description: true,
  hostName: true,
  startAt: true,
  endAt: true,
  timezone: true,
  meetingLink: true,
  replayUrl: true,
  accessTier: true,
  accessLevel: true,
  location: true,
  isCancelled: true
} satisfies Prisma.EventSelect;

type EventRecord = Prisma.EventGetPayload<{
  select: typeof eventSelect;
}>;

type ListEventsOptions = {
  take?: number;
};

function resolveAccessibleEventLevels(tiers: MembershipTier[]): EventAccessLevel[] {
  if (tiers.includes("INNER_CIRCLE")) {
    return [
      EventAccessLevel.PUBLIC,
      EventAccessLevel.MEMBERS,
      EventAccessLevel.INNER_CIRCLE
    ];
  }

  return [EventAccessLevel.PUBLIC, EventAccessLevel.MEMBERS];
}

function mapEventRecord(event: EventRecord): PlatformEventModel {
  return {
    ...event,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null
  };
}

export async function listUpcomingEventsForTiers(
  tiers: MembershipTier[],
  options: ListEventsOptions = {}
): Promise<PlatformEventModel[]> {
  const accessLevels = resolveAccessibleEventLevels(tiers);

  const events = await db.event.findMany({
    where: {
      accessTier: {
        in: tiers
      },
      accessLevel: {
        in: accessLevels
      },
      startAt: {
        gte: new Date()
      },
      isCancelled: false
    },
    orderBy: {
      startAt: "asc"
    },
    take: options.take,
    select: eventSelect
  });

  return events.map(mapEventRecord);
}

export async function listRecentEventsForTiers(
  tiers: MembershipTier[],
  options: ListEventsOptions = {}
): Promise<PlatformEventModel[]> {
  const accessLevels = resolveAccessibleEventLevels(tiers);

  const events = await db.event.findMany({
    where: {
      accessTier: {
        in: tiers
      },
      accessLevel: {
        in: accessLevels
      },
      startAt: {
        lt: new Date()
      },
      isCancelled: false
    },
    orderBy: {
      startAt: "desc"
    },
    take: options.take,
    select: eventSelect
  });

  return events.map(mapEventRecord);
}
