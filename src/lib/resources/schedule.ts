import { ResourceTier } from "@prisma/client";
import { RESOURCE_SCHEDULE_TIMEZONE, RESOURCE_TIER_SCHEDULES } from "@/config/resources";

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

type ZonedDateTimeInput = CalendarDate & {
  hour: number;
  minute: number;
};

const DATE_PARTS_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const OFFSET_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getDatePartsFormatter(timeZone: string) {
  const cached = DATE_PARTS_FORMATTER_CACHE.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  DATE_PARTS_FORMATTER_CACHE.set(timeZone, formatter);
  return formatter;
}

function getOffsetFormatter(timeZone: string) {
  const cached = OFFSET_FORMATTER_CACHE.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  OFFSET_FORMATTER_CACHE.set(timeZone, formatter);
  return formatter;
}

function parseOffsetMinutes(value: string): number {
  if (value === "GMT" || value === "UTC") {
    return 0;
  }

  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3] || "0", 10);
  return sign * (hours * 60 + minutes);
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const parts = getOffsetFormatter(timeZone).formatToParts(date);
  const value = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return parseOffsetMinutes(value);
}

export function getLocalCalendarDate(date: Date, timeZone = RESOURCE_SCHEDULE_TIMEZONE): CalendarDate {
  const parts = getDatePartsFormatter(timeZone).formatToParts(date);
  const getPart = (type: "year" | "month" | "day") =>
    Number.parseInt(parts.find((part) => part.type === type)?.value || "0", 10);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day")
  };
}

export function addDaysToCalendarDate(date: CalendarDate, days: number): CalendarDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate()
  };
}

export function getWeekdayForCalendarDate(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

export function parseScheduleTime(value: string): { hour: number; minute: number } {
  const [hourText = "0", minuteText = "0"] = value.split(":");
  return {
    hour: Number.parseInt(hourText, 10),
    minute: Number.parseInt(minuteText, 10)
  };
}

export function zonedDateTimeToUtc(
  input: ZonedDateTimeInput,
  timeZone = RESOURCE_SCHEDULE_TIMEZONE
): Date {
  const baseUtc = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute);
  let candidate = new Date(baseUtc);

  for (let index = 0; index < 3; index += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, candidate);
    const adjusted = new Date(baseUtc - offsetMinutes * 60_000);

    if (adjusted.getTime() === candidate.getTime()) {
      return adjusted;
    }

    candidate = adjusted;
  }

  return candidate;
}

type GenerateTierSlotsInput = {
  tier: ResourceTier;
  count: number;
  referenceDate: Date;
  direction: "future" | "past";
  timeZone?: string;
};

export function generateTierScheduleSlots(input: GenerateTierSlotsInput): Date[] {
  const timeZone = input.timeZone || RESOURCE_SCHEDULE_TIMEZONE;
  const schedule = RESOURCE_TIER_SCHEDULES[input.tier];
  const startingDate = getLocalCalendarDate(input.referenceDate, timeZone);
  const results: Date[] = [];
  let dayOffset = 0;

  while (results.length < input.count && dayOffset < input.count * 14) {
    const calendarDate = addDaysToCalendarDate(
      startingDate,
      input.direction === "future" ? dayOffset : -dayOffset
    );
    const weekday = getWeekdayForCalendarDate(calendarDate);
    const slot = schedule.find((entry) => entry.weekday === weekday);

    if (slot) {
      const parsedTime = parseScheduleTime(slot.time);
      const candidate = zonedDateTimeToUtc(
        {
          ...calendarDate,
          hour: parsedTime.hour,
          minute: parsedTime.minute
        },
        timeZone
      );

      const shouldInclude =
        input.direction === "future"
          ? candidate.getTime() > input.referenceDate.getTime()
          : candidate.getTime() < input.referenceDate.getTime();

      if (shouldInclude) {
        results.push(candidate);
      }
    }

    dayOffset += 1;
  }

  return results.sort((left, right) => left.getTime() - right.getTime());
}

export function generateFutureTierScheduleSlots(
  tier: ResourceTier,
  count: number,
  referenceDate: Date,
  timeZone = RESOURCE_SCHEDULE_TIMEZONE
) {
  return generateTierScheduleSlots({
    tier,
    count,
    referenceDate,
    direction: "future",
    timeZone
  });
}

export function generatePastTierScheduleSlots(
  tier: ResourceTier,
  count: number,
  referenceDate: Date,
  timeZone = RESOURCE_SCHEDULE_TIMEZONE
) {
  return generateTierScheduleSlots({
    tier,
    count,
    referenceDate,
    direction: "past",
    timeZone
  });
}
