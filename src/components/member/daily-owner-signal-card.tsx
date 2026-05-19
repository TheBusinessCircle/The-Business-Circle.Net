import type { DailyOwnerSignal } from "@/server/daily-owner-signal";

type DailyOwnerSignalCardProps = {
  signal: DailyOwnerSignal;
  isToday: boolean;
};

const backgroundClassNames: Record<DailyOwnerSignal["backgroundKey"], string> = {
  "midnight-boardroom":
    "from-[#05070d] via-[#101827] to-[#05070d] before:bg-[radial-gradient(circle_at_22%_18%,rgba(212,175,55,0.22),transparent_34%)] after:bg-[linear-gradient(135deg,rgba(37,99,235,0.16),transparent_42%)]",
  "golden-ledger":
    "from-[#070604] via-[#16110b] to-[#05070d] before:bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.26),transparent_36%)] after:bg-[linear-gradient(160deg,rgba(148,105,34,0.2),transparent_44%)]",
  "quiet-harbour":
    "from-[#03080d] via-[#071a22] to-[#05070d] before:bg-[radial-gradient(circle_at_24%_16%,rgba(56,189,248,0.16),transparent_34%)] after:bg-[linear-gradient(145deg,rgba(212,175,55,0.12),transparent_48%)]",
  "blueprint-shadow":
    "from-[#030712] via-[#0b1224] to-[#05070d] before:bg-[radial-gradient(circle_at_18%_22%,rgba(59,130,246,0.18),transparent_36%)] after:bg-[linear-gradient(120deg,rgba(226,232,240,0.08),transparent_42%)]",
  "ember-focus":
    "from-[#080503] via-[#1a0d08] to-[#05070d] before:bg-[radial-gradient(circle_at_24%_18%,rgba(245,158,11,0.2),transparent_34%)] after:bg-[linear-gradient(150deg,rgba(212,175,55,0.14),transparent_46%)]",
  "rain-glass":
    "from-[#05070d] via-[#0d141c] to-[#030712] before:bg-[radial-gradient(circle_at_22%_18%,rgba(148,163,184,0.18),transparent_34%)] after:bg-[linear-gradient(150deg,rgba(59,130,246,0.12),transparent_46%)]",
  "deep-library":
    "from-[#060507] via-[#151018] to-[#05070d] before:bg-[radial-gradient(circle_at_24%_18%,rgba(212,175,55,0.18),transparent_34%)] after:bg-[linear-gradient(140deg,rgba(88,28,135,0.14),transparent_42%)]"
};

function formatSignalDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

export function DailyOwnerSignalCard({ signal, isToday }: DailyOwnerSignalCardProps) {
  return (
    <article
      data-owner-signal-card
      data-owner-signal-today={isToday ? "true" : "false"}
      tabIndex={0}
      className={[
        "group relative isolate flex min-h-[23.5rem] w-[calc(100vw-2rem)] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[1.45rem] border p-5 shadow-2xl outline-none transition-all duration-500 focus-visible:ring-2 focus-visible:ring-gold/70 motion-reduce:transform-none motion-reduce:transition-none min-[390px]:w-[calc(100vw-3rem)] sm:min-h-[25rem] sm:w-[28rem] sm:rounded-[1.6rem] sm:p-6 lg:w-[31rem]",
        "before:absolute before:inset-0 before:-z-10 before:opacity-100 after:absolute after:inset-0 after:-z-10",
        "bg-gradient-to-br",
        backgroundClassNames[signal.backgroundKey],
        isToday
          ? "scale-[1.012] border-gold/55 text-foreground shadow-[0_26px_100px_rgba(212,175,55,0.2)]"
          : "border-silver/14 opacity-82 saturate-[0.9] shadow-black/35"
      ].join(" ")}
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,6,23,0.26),rgba(2,6,23,0.72)_52%,rgba(2,6,23,0.9))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold/12 blur-3xl motion-safe:transition-opacity motion-safe:duration-700 group-hover:opacity-90" />
      <div className="absolute bottom-0 left-0 h-40 w-full bg-gradient-to-t from-black/82 via-black/42 to-transparent" />
      {isToday ? (
        <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-gold/24" />
      ) : null}

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-gold">
            {isToday ? "Today's Owner Signal" : "Previous Signal"}
          </p>
          <span className="rounded-full border border-white/12 bg-black/26 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver backdrop-blur-sm">
            {formatSignalDate(signal.date)}
          </span>
        </div>

        <div className="mt-8 space-y-4 sm:mt-10">
          <p className="text-[11px] uppercase tracking-[0.12em] text-silver/90">
            {signal.seasonalTheme}
          </p>
          <h3 className="font-display text-[2rem] leading-tight text-foreground sm:text-4xl">
            {signal.title}
          </h3>
          <p className="max-w-[35rem] text-base leading-7 text-slate-200/90 sm:text-[1.05rem]">
            {signal.bodyText}
          </p>
        </div>
      </div>

      <div className="relative mt-10 border-t border-white/10 pt-4">
        <p className="text-sm text-gold/95">{signal.footerMessage}</p>
      </div>
    </article>
  );
}
