export type DailyOwnerSignalStatus = "SCHEDULED" | "PUBLISHED";

export type DailyOwnerSignalBackgroundKey =
  | "midnight-boardroom"
  | "golden-ledger"
  | "quiet-harbour"
  | "blueprint-shadow"
  | "ember-focus"
  | "rain-glass"
  | "deep-library";

export type DailyOwnerSignal = {
  id: string;
  date: string;
  title: string;
  bodyText: string;
  footerMessage: string;
  backgroundKey: DailyOwnerSignalBackgroundKey;
  publishedAt: string;
  status: DailyOwnerSignalStatus;
  seasonalTheme?: string;
  accentVariant?: "gold" | "blue" | "silver" | "ember";
  animationVariant?: "still" | "slow-drift" | "soft-pulse" | "low-glow";
};

export type DailyOwnerSignalExperience = {
  todayKey: string;
  today: DailyOwnerSignal;
  visibleSignals: DailyOwnerSignal[];
  scheduledBank: DailyOwnerSignal[];
  archiveWindowDays: number;
  generatedThrough: string;
};

const MS_PER_DAY = 86_400_000;
const ARCHIVE_WINDOW_DAYS = 60;
const SCHEDULED_BANK_DAYS = 183;

const BACKGROUND_KEYS: DailyOwnerSignalBackgroundKey[] = [
  "midnight-boardroom",
  "golden-ledger",
  "quiet-harbour",
  "blueprint-shadow",
  "ember-focus",
  "rain-glass",
  "deep-library"
];

const ACCENT_VARIANTS: NonNullable<DailyOwnerSignal["accentVariant"]>[] = [
  "gold",
  "blue",
  "silver",
  "gold",
  "ember",
  "blue",
  "silver"
];

const ANIMATION_VARIANTS: NonNullable<DailyOwnerSignal["animationVariant"]>[] = [
  "slow-drift",
  "low-glow",
  "still",
  "soft-pulse",
  "slow-drift",
  "still",
  "low-glow"
];

const SIGNAL_LINES = [
  {
    title: "Check the Real Load",
    bodyText:
      "Before adding more work, look at what is already carrying weight. Not every task deserves the same attention. Choose the one pressure point that would make the rest of the day easier to manage.",
    footerMessage: "One clear constraint is enough to start."
  },
  {
    title: "Protect the Decision",
    bodyText:
      "The business does not need every answer today. It needs one decision made with enough calm to stand behind it. Delay the rest if the extra thinking is only disguising uncertainty.",
    footerMessage: "A settled decision gives the day shape."
  },
  {
    title: "Return to the Customer",
    bodyText:
      "When the internal list starts to dominate, come back to the person you serve. Their next useful outcome is a better anchor than your busiest admin thread. Let that decide what deserves attention.",
    footerMessage: "The customer problem is the cleanest reference point."
  },
  {
    title: "Name the Drag",
    bodyText:
      "Some friction is not failure. It is information arriving before the numbers catch up. Name what feels heavy, then separate the structural issue from the emotional residue around it.",
    footerMessage: "Pressure is easier to use once it is specific."
  },
  {
    title: "Keep the Standard",
    bodyText:
      "Some compromises make today easier and tomorrow noisier. Hold the line where it protects trust, quality, or delivery. Loosen it where the standard is only protecting your own tension.",
    footerMessage: "Standards work best when they are precise."
  },
  {
    title: "Use the Quiet Hour",
    bodyText:
      "There is usually one part of the day where your thinking is cleaner than the rest. Guard it from low-value reaction. Put the work that needs judgement there, not the work that only needs hands.",
    footerMessage: "Put judgement where your attention is strongest."
  },
  {
    title: "Let the Business Breathe",
    bodyText:
      "Not every gap is a problem to fill. Space helps you see what the pace has been hiding. Give the business enough room today to show you what is working, what is tired, and what needs a cleaner rhythm.",
    footerMessage: "A little space can make the operating picture clearer."
  },
  {
    title: "Look for the Repeated Signal",
    bodyText:
      "The first complaint may be noise. The third version is probably a pattern. Look for what keeps returning in customers, energy, team rhythm, or cash flow, then respond to the pattern rather than the mood.",
    footerMessage: "Repeated signals deserve a measured response."
  },
  {
    title: "Choose the Visible Move",
    bodyText:
      "A founder can do plenty of invisible work and still leave the business feeling stuck. Pick one move today that creates visible progress for a customer, partner, member, or team.",
    footerMessage: "Useful progress should be observable."
  },
  {
    title: "Tidy the Mental Ledger",
    bodyText:
      "Unfinished decisions take up more space than unfinished tasks. Write down what is open, what is waiting, and what is already decided. Your mind should not be the only place the business is organised.",
    footerMessage: "Make the load visible before you carry it further."
  },
  {
    title: "Respect the Energy Curve",
    bodyText:
      "Founders often plan as if energy is flat. It is not. Put judgement, sales, and strategic tension where your energy is strongest, then let lower-friction work take the softer parts of the day.",
    footerMessage: "Plan around the real capacity you have."
  },
  {
    title: "Reduce the Second Guessing",
    bodyText:
      "A decision does not become wiser because you keep reopening it. If the information has not changed, protect the choice and move. If the information has changed, update cleanly without punishing yourself.",
    footerMessage: "Reopen decisions only when the facts have moved."
  },
  {
    title: "Find the Hidden Cost",
    bodyText:
      "Some cheap choices are expensive because they drain attention, trust, or pace. Look at one recurring shortcut today and ask what it is really costing. The answer may be more useful than another new tool.",
    footerMessage: "Cost includes attention, trust, and pace."
  },
  {
    title: "Close the Loop",
    bodyText:
      "Open loops make a business feel heavier than it is. Send the update, confirm the date, ask the question, or end the thread. One closed loop can return more calm than another hour of planning.",
    footerMessage: "Close one open thread cleanly."
  }
];

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function toDailyOwnerSignalDateKey(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(startOfUtcDay(date).getTime() + days * MS_PER_DAY);
}

function daysBetween(start: Date, end: Date) {
  return Math.round((startOfUtcDay(end).getTime() - startOfUtcDay(start).getTime()) / MS_PER_DAY);
}

function seasonalThemeForDate(date: Date) {
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (month === 0) {
    return "reset and realistic momentum";
  }

  if (month >= 5 && month <= 7) {
    return "energy management and sustainable pace";
  }

  if (month >= 8 && month <= 10) {
    return day === 31 && month === 9
      ? "hidden problems and honest attention"
      : "focus, pressure, and acceleration";
  }

  if (month === 11) {
    return day >= 20 ? "reflection, gratitude, and recovery" : "completion and measured close";
  }

  return "steady founder clarity";
}

export function getDailyOwnerSignalBackgroundKey(date: Date) {
  return BACKGROUND_KEYS[startOfUtcDay(date).getUTCDay()];
}

function signalForDate(date: Date, today: Date): DailyOwnerSignal {
  const dayIndex = daysBetween(new Date(Date.UTC(2026, 0, 1)), date);
  const line = SIGNAL_LINES[((dayIndex % SIGNAL_LINES.length) + SIGNAL_LINES.length) % SIGNAL_LINES.length];
  const weekday = startOfUtcDay(date).getUTCDay();
  const dateKey = toDailyOwnerSignalDateKey(date);
  const publishedAt = new Date(`${dateKey}T06:00:00.000Z`);

  return {
    id: `owner-signal-${dateKey}`,
    date: dateKey,
    title: line.title,
    bodyText: line.bodyText,
    footerMessage: line.footerMessage,
    backgroundKey: getDailyOwnerSignalBackgroundKey(date),
    publishedAt: publishedAt.toISOString(),
    status: startOfUtcDay(date) <= startOfUtcDay(today) ? "PUBLISHED" : "SCHEDULED",
    seasonalTheme: seasonalThemeForDate(date),
    accentVariant: ACCENT_VARIANTS[weekday],
    animationVariant: ANIMATION_VARIANTS[weekday]
  };
}

export function buildDailyOwnerSignalContentBank(referenceDate = new Date()) {
  const today = startOfUtcDay(referenceDate);
  return Array.from({ length: SCHEDULED_BANK_DAYS }, (_, index) =>
    signalForDate(addDays(today, index + 1), today)
  );
}

export function getVisibleDailyOwnerSignals(referenceDate = new Date()) {
  const today = startOfUtcDay(referenceDate);
  return Array.from({ length: ARCHIVE_WINDOW_DAYS + 1 }, (_, index) =>
    signalForDate(addDays(today, index - ARCHIVE_WINDOW_DAYS), today)
  ).filter((signal) => signal.status === "PUBLISHED");
}

export function getDailyOwnerSignalExperience(
  referenceDate = new Date()
): DailyOwnerSignalExperience {
  const visibleSignals = getVisibleDailyOwnerSignals(referenceDate);
  const todayKey = toDailyOwnerSignalDateKey(referenceDate);
  const today = visibleSignals.find((signal) => signal.date === todayKey) ?? signalForDate(referenceDate, referenceDate);
  const scheduledBank = buildDailyOwnerSignalContentBank(referenceDate);

  return {
    todayKey,
    today,
    visibleSignals,
    scheduledBank,
    archiveWindowDays: ARCHIVE_WINDOW_DAYS,
    generatedThrough: scheduledBank.at(-1)?.date ?? todayKey
  };
}

export function millisecondsUntilNextDailyOwnerSignalRollover(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 1);
  return Math.max(1000, next - now.getTime());
}
