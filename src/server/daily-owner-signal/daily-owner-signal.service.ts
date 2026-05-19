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
      "Before adding more work, notice what is already carrying weight. A founder can lose clarity by treating every task as equal. Choose the one pressure point that would make the rest of the day cleaner.",
    footerMessage: "Less noise. One honest move."
  },
  {
    title: "Protect the Decision",
    bodyText:
      "The business does not need every answer today. It needs one decision made with enough calm to stand behind it. Delay the rest if the extra thinking is only disguising uncertainty.",
    footerMessage: "Clarity is often quieter than urgency."
  },
  {
    title: "Return to the Customer",
    bodyText:
      "When the internal list starts to grow teeth, come back to the person you serve. Their next useful outcome is a better anchor than your busiest admin thread. Let that decide what deserves attention.",
    footerMessage: "Serve the real problem first."
  },
  {
    title: "Name the Drag",
    bodyText:
      "Some friction is not failure. It is information arriving before the numbers catch up. Name what feels heavy, then separate the structural issue from the emotional residue around it.",
    footerMessage: "Pressure becomes useful when it is named."
  },
  {
    title: "Keep the Standard",
    bodyText:
      "A premium business is often built by refusing the small compromises that would make today easier and tomorrow noisier. Hold the line where it protects trust. Loosen it where it only protects ego.",
    footerMessage: "Discipline can still feel calm."
  },
  {
    title: "Use the Quiet Hour",
    bodyText:
      "There is usually one part of the day where your thinking is cleaner than the rest. Guard it from low-value reaction. Put the work that needs judgement there, not the work that only needs hands.",
    footerMessage: "Spend your best attention deliberately."
  },
  {
    title: "Let the Business Breathe",
    bodyText:
      "Not every gap is a problem to fill. Space helps you see what the pace has been hiding. Give the business enough room today to show you what is working, what is tired, and what needs a cleaner rhythm.",
    footerMessage: "Stillness can be operational."
  },
  {
    title: "Look for the Repeated Signal",
    bodyText:
      "The first complaint may be noise. The third version is probably a pattern. Look for what keeps returning in customers, energy, team rhythm, or cash flow, then respond to the pattern rather than the mood.",
    footerMessage: "Patterns deserve more respect than panic."
  },
  {
    title: "Choose the Visible Move",
    bodyText:
      "A founder can do plenty of invisible work and still leave the business feeling stuck. Pick one move today that creates visible progress for a customer, partner, member, or team. Let momentum be seen.",
    footerMessage: "Progress should leave a trace."
  },
  {
    title: "Tidy the Mental Ledger",
    bodyText:
      "Unfinished decisions take up more space than unfinished tasks. Write down what is open, what is waiting, and what is already decided. Your mind should not be the only place the business is organised.",
    footerMessage: "Make the load visible."
  },
  {
    title: "Respect the Energy Curve",
    bodyText:
      "Founders often plan as if energy is flat. It is not. Put judgement, sales, and strategic tension where your energy is strongest, then let lower-friction work take the softer parts of the day.",
    footerMessage: "Work with the curve, not against it."
  },
  {
    title: "Reduce the Second Guessing",
    bodyText:
      "A decision does not become wiser because you keep reopening it. If the information has not changed, protect the choice and move. If the information has changed, update cleanly without punishing yourself.",
    footerMessage: "Confidence is built through clean movement."
  },
  {
    title: "Find the Hidden Cost",
    bodyText:
      "Some cheap choices are expensive because they drain attention, trust, or pace. Look at one recurring shortcut today and ask what it is really costing. The answer may be more useful than another new tool.",
    footerMessage: "The true cost is rarely only money."
  },
  {
    title: "Close the Loop",
    bodyText:
      "Open loops make a business feel heavier than it is. Send the update, confirm the date, ask the question, or end the thread. One closed loop can return more calm than another hour of planning.",
    footerMessage: "Completion is a form of relief."
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
