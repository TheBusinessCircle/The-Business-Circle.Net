import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type JourneyStepKey = "home" | "about" | "membership" | "join";

type JourneyRailProps = {
  currentStep: JourneyStepKey;
  note?: string;
  nextAction?: {
    href: string;
    label: string;
  };
  className?: string;
};

const JOURNEY_STEPS: Array<{
  key: JourneyStepKey;
  label: string;
  href: string;
}> = [
  { key: "home", label: "Home", href: "/" },
  { key: "about", label: "About", href: "/about" },
  { key: "membership", label: "Membership", href: "/membership" },
  { key: "join", label: "Join", href: "/join" }
];

export function JourneyRail({
  currentStep,
  note,
  nextAction,
  className
}: JourneyRailProps) {
  return (
    <div
      className={cn(
        "surface-subtle overflow-hidden rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Public journey</p>
          <div className="flex flex-wrap items-center gap-2">
            {JOURNEY_STEPS.map((step, index) => {
              const isCurrent = step.key === currentStep;

              return (
                <div key={step.key} className="flex items-center gap-2">
                  {isCurrent ? (
                    <span
                      aria-current="page"
                      className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-xs text-foreground"
                    >
                      <span className="text-gold">{index + 1}.</span>
                      {step.label}
                    </span>
                  ) : (
                    <Link
                      href={step.href}
                      className="surface-pill inline-flex items-center gap-2 text-xs hover:border-gold/25 hover:text-foreground"
                    >
                      <span className="text-silver">{index + 1}.</span>
                      {step.label}
                    </Link>
                  )}

                  {index < JOURNEY_STEPS.length - 1 ? (
                    <span className="text-silver/40" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {note || nextAction ? (
          <div className="min-w-0 flex max-w-xl flex-col gap-2 text-sm leading-relaxed text-muted lg:items-end lg:text-right">
            {note ? <p>{note}</p> : null}
            {nextAction ? (
              <Link
                href={nextAction.href}
                className="inline-flex items-center gap-2 text-sm text-foreground transition-colors hover:text-gold lg:justify-end"
              >
                {nextAction.label}
                <ArrowRight size={14} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
