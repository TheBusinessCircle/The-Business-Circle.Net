import { describe, expect, it } from "vitest";
import { ResourceStatus, ResourceTier } from "@prisma/client";
import { RESOURCE_SCHEDULE_TIMEZONE, RESOURCE_TIER_SCHEDULES } from "@/config/resources";
import { buildPlannedResourceSeeds, getPlannedResourceSeedCounts } from "@/lib/resources/catalog";

const REFERENCE_DATE = new Date("2026-03-21T12:00:00.000Z");

function localWeekdayAndTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: RESOURCE_SCHEDULE_TIMEZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return {
    weekday,
    time: `${hour}:${minute}`
  };
}

describe("resource library planning", () => {
  it("builds the required counts by tier and status", () => {
    const counts = getPlannedResourceSeedCounts(REFERENCE_DATE);

    expect(counts.total).toBe(135);
    expect(counts.published).toBe(45);
    expect(counts.scheduled).toBe(90);
    expect(counts.byTier.FOUNDATION).toEqual({ total: 50, published: 20, scheduled: 30 });
    expect(counts.byTier.INNER).toEqual({ total: 45, published: 15, scheduled: 30 });
    expect(counts.byTier.CORE).toEqual({ total: 40, published: 10, scheduled: 30 });
  });

  it("keeps generated content within the required structure and word count", () => {
    const items = buildPlannedResourceSeeds(REFERENCE_DATE);

    items.forEach((item) => {
      expect(item.wordCount).toBeGreaterThanOrEqual(600);
      expect(item.wordCount).toBeLessThanOrEqual(1200);
      expect(item.content).toContain("## Reality");
      expect(item.content).toContain("## Breakdown");
      expect(item.content).toContain("## Shift");
      expect(item.content).toContain("## Next step");
      expect(item.content).not.toContain("—");
      expect(item.excerpt).not.toContain("—");
    });
  });

  it("assigns scheduled resources to the configured tier slots without minute collisions", () => {
    const items = buildPlannedResourceSeeds(REFERENCE_DATE);
    const scheduledItems = items.filter((item) => item.status === ResourceStatus.SCHEDULED);
    const scheduledTimestamps = scheduledItems
      .map((item) => item.scheduledFor?.toISOString())
      .filter((value): value is string => Boolean(value));

    expect(new Set(scheduledTimestamps).size).toBe(scheduledTimestamps.length);

    [ResourceTier.FOUNDATION, ResourceTier.INNER, ResourceTier.CORE].forEach((tier) => {
      const tierItems = scheduledItems.filter((item) => item.tier === tier);
      const allowedSlots = RESOURCE_TIER_SCHEDULES[tier].map((slot) => ({
        weekday: slot.dayLabel,
        time: slot.time
      }));

      expect(tierItems).toHaveLength(30);

      tierItems.forEach((item) => {
        const local = localWeekdayAndTime(item.scheduledFor as Date);
        expect(allowedSlots).toContainEqual({
          weekday: local.weekday,
          time: local.time
        });
      });
    });
  });
});
