"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type CircleCardReferralNudge = {
  id: string;
  title: string;
  message: string;
  actionHref?: string | null;
  actionLabel?: string | null;
};

type CircleCardReferralNudgesProps = {
  nudges: CircleCardReferralNudge[];
};

const DISMISSED_STORAGE_KEY = "circle-card:referral-nudges:dismissed";

function readDismissedIds() {
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeDismissedIds(ids: string[]) {
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Nudge dismissal is progressive enhancement only.
  }
}

export function CircleCardReferralNudges({ nudges }: CircleCardReferralNudgesProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissedIds(readDismissedIds());
  }, []);

  const visibleNudges = useMemo(
    () => nudges.filter((nudge) => !dismissedIds.includes(nudge.id)).slice(0, 2),
    [dismissedIds, nudges]
  );

  if (!visibleNudges.length) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleNudges.map((nudge) => (
        <div key={nudge.id} className="rounded-2xl border border-gold/18 bg-gold/8 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{nudge.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{nudge.message}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss referral nudge"
              className="rounded-full border border-silver/14 p-1 text-muted transition-colors hover:border-silver/30 hover:text-foreground"
              onClick={() => {
                const next = Array.from(new Set([...dismissedIds, nudge.id]));

                setDismissedIds(next);
                writeDismissedIds(next);
              }}
            >
              <X size={14} />
            </button>
          </div>
          {nudge.actionHref && nudge.actionLabel ? (
            <Link
              href={nudge.actionHref}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-silver/18 px-3 text-sm font-medium text-foreground transition-colors hover:border-gold/35 hover:text-gold"
            >
              {nudge.actionLabel}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
