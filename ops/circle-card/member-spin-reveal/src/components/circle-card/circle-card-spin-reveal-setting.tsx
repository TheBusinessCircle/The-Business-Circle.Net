"use client";

import { useId, useState, useTransition } from "react";
import { setCircleCardSpinRevealAction } from "@/actions/circle-card-spin-reveal.actions";
import { CircleCardCopyLinkButton } from "@/components/circle-card/circle-card-copy-link-button";
import { createCircleCardSpinRevealUrl } from "@/lib/circle-card/spin-reveal";

export function CircleCardSpinRevealSetting({
  cardId,
  publicUrl,
  enabled: initialEnabled
}: {
  cardId: string;
  publicUrl: string;
  enabled: boolean;
}) {
  const headingId = useId();
  const descriptionId = useId();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState("");
  const [saving, startTransition] = useTransition();

  function toggle() {
    if (saving) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await setCircleCardSpinRevealAction({ cardId, enabled: !enabled });
        if (result.ok) setEnabled(result.enabled);
        else setError(result.message);
      } catch {
        setError("Couldn't save Spin Reveal. Try again.");
      }
    });
  }

  return (
    <section aria-labelledby={headingId} className="rounded-3xl border border-white/10 bg-[#11243e] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={headingId} className="text-lg font-semibold">Spin Reveal</h2>
          <p id={descriptionId} className="mt-1 text-sm text-slate-300">Add a coin spin before your card opens from your bio link.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-labelledby={headingId}
          aria-describedby={descriptionId}
          aria-checked={enabled}
          aria-disabled={saving || undefined}
          onClick={toggle}
          className="inline-flex min-h-11 min-w-16 shrink-0 items-center justify-center rounded-full border border-white/20 px-3 text-sm font-semibold text-slate-300 outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 aria-checked:border-amber-300/50 aria-checked:bg-amber-300/15 aria-checked:text-amber-200 aria-disabled:opacity-60"
        >
          {saving ? "Saving…" : enabled ? "On" : "Off"}
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p> : null}
      {enabled ? (
        <div className="mt-4">
          <CircleCardCopyLinkButton publicUrl={createCircleCardSpinRevealUrl(publicUrl)} label="Copy bio link" />
        </div>
      ) : null}
    </section>
  );
}
