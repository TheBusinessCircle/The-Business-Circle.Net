"use client";

import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Download,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  Lock,
  Menu as MenuIcon,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CircleCardLinkType } from "@/lib/circle-card/schema";
import { cn } from "@/lib/utils";

type CircleCardPrivateLinkActionProps = {
  linkId: string;
  type: CircleCardLinkType;
  value: string;
  description?: string | null;
  accessCodeHint?: string | null;
  hasAccessCode: boolean;
};

type LinkAccessResponse = {
  ok?: boolean;
  accessUrl?: string;
  action?: "VIEW" | "DOWNLOAD";
  error?: string;
};

function privateLinkIcon(type: CircleCardLinkType) {
  switch (type) {
    case "BOOK_CALL":
      return <CalendarDays size={18} />;
    case "LATEST_OFFER":
      return <Sparkles size={18} />;
    case "COMMUNITY":
      return <Users size={18} />;
    case "DOWNLOAD":
      return <Download size={18} />;
    case "REVIEW":
      return <Star size={18} />;
    case "SHOP":
      return <ShoppingBag size={18} />;
    case "MENU":
      return <MenuIcon size={18} />;
    case "CASE_STUDY":
    case "PORTFOLIO":
      return <BookOpen size={18} />;
    default:
      return <LinkIcon size={18} />;
  }
}

export function CircleCardPrivateLinkAction({
  linkId,
  type,
  value,
  description,
  accessCodeHint,
  hasAccessCode
}: CircleCardPrivateLinkActionProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    if (!/^\d{4}$/.test(code)) {
      setError("Enter the 4-digit access code.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/circle-card/link-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, code })
      });
      const data = (await response.json().catch(() => ({}))) as LinkAccessResponse;

      if (!response.ok || !data.ok || !data.accessUrl) {
        setError(data.error ?? "That code was not accepted.");
        return;
      }

      if (data.action === "VIEW") {
        const opened = window.open(data.accessUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          window.location.assign(data.accessUrl);
        }
      } else {
        window.location.assign(data.accessUrl);
      }
    } catch {
      setError("Unable to verify the code. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateCode(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 4));
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-gold/18 bg-gold/8 px-3.5 py-3 text-left shadow-inner-surface transition-all hover:border-gold/36 hover:bg-gold/12 sm:px-4"
        onClick={() => setOpen(true)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/22 bg-gold/12 text-gold">
            <Lock size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-gold">Access code required</span>
            <span className="block truncate text-sm font-medium text-foreground">{value}</span>
            {description ? (
              <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted">
                {description}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronRight
          size={17}
          aria-hidden="true"
          className="shrink-0 text-silver transition-colors group-hover:text-gold"
        />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#020617]/78 px-3 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`circle-card-private-link-${linkId}`}
        >
          <div className="w-full max-w-md rounded-[1.75rem] border border-silver/16 bg-[linear-gradient(145deg,rgba(9,20,45,0.98),rgba(4,10,24,0.98))] p-5 shadow-panel-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/22 bg-gold/12 text-gold">
                  {privateLinkIcon(type)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gold">Private Circle Card link</p>
                  <h2 id={`circle-card-private-link-${linkId}`} className="mt-1 font-display text-2xl text-foreground">
                    Enter access code
                  </h2>
                  <p className="mt-1 truncate text-sm text-silver">{value}</p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-silver/14 text-silver transition-colors hover:border-gold/28 hover:text-gold"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {accessCodeHint ? (
                <p className="rounded-2xl border border-silver/14 bg-white/[0.035] p-3 text-xs leading-relaxed text-muted">
                  {accessCodeHint}
                </p>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">4-digit code</span>
                <input
                  value={code}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoFocus
                  className="h-14 w-full rounded-2xl border border-silver/16 bg-background/34 px-4 py-3 text-center font-mono text-2xl tracking-normal text-foreground outline-none transition focus:border-gold/45"
                  onChange={(event) => updateCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void unlock();
                    }
                  }}
                />
              </label>

              {!hasAccessCode ? (
                <p className="text-xs text-muted">This private link is not ready yet. Ask the card owner for a fresh code.</p>
              ) : null}
              {error ? <p className="text-sm text-red-200">{error}</p> : null}

              <Button
                type="button"
                className={cn("w-full gap-2", submitting ? "opacity-80" : "")}
                disabled={submitting || !hasAccessCode}
                onClick={unlock}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Unlock
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
