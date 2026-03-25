type DateInput = Date | string;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function resolveTimezone(timezone?: string | null): string {
  return timezone?.trim() || "UTC";
}

function formatWithOptions(
  value: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    ...options
  }).format(value);
}

function getTimezoneLabel(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).formatToParts(value);

  return parts.find((part) => part.type === "timeZoneName")?.value ?? timezone;
}

function isSameCalendarDate(left: Date, right: Date, timezone: string): boolean {
  const leftLabel = formatWithOptions(left, timezone, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const rightLabel = formatWithOptions(right, timezone, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  return leftLabel === rightLabel;
}

export function formatEventDateTime(value: DateInput, timezone?: string | null): string {
  const date = toDate(value);
  if (!isValidDate(date)) {
    return "Date unavailable";
  }

  return formatWithOptions(date, resolveTimezone(timezone), {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  });
}

export function formatEventScheduleWindow(input: {
  startAt: DateInput;
  endAt?: DateInput | null;
  timezone?: string | null;
}): string {
  const timezone = resolveTimezone(input.timezone);
  const start = toDate(input.startAt);

  if (!isValidDate(start)) {
    return "Date unavailable";
  }

  if (!input.endAt) {
    return formatEventDateTime(start, timezone);
  }

  const end = toDate(input.endAt);
  if (!isValidDate(end)) {
    return formatEventDateTime(start, timezone);
  }

  if (isSameCalendarDate(start, end, timezone)) {
    const dateLabel = formatWithOptions(start, timezone, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const startTime = formatWithOptions(start, timezone, {
      hour: "2-digit",
      minute: "2-digit"
    });
    const endTime = formatWithOptions(end, timezone, {
      hour: "2-digit",
      minute: "2-digit"
    });
    const timezoneLabel = getTimezoneLabel(start, timezone);

    return `${dateLabel}, ${startTime} - ${endTime} ${timezoneLabel}`;
  }

  return `${formatEventDateTime(start, timezone)} to ${formatEventDateTime(end, timezone)}`;
}
