"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, Flag, Loader2 } from "lucide-react";
import {
  CIRCLE_CARD_REPORT_IDLE_STATE,
  submitCircleCardReportAction
} from "@/actions/circle-card-report.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CIRCLE_CARD_REPORT_REASON_OPTIONS } from "@/lib/circle-card/reports";
import { cn } from "@/lib/utils";

type CircleCardReportFormProps = {
  cardId: string;
  cardSlug: string;
  className?: string;
};

export function CircleCardReportForm({
  cardId,
  cardSlug,
  className
}: CircleCardReportFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, isPending] = useActionState(
    submitCircleCardReportAction,
    CIRCLE_CARD_REPORT_IDLE_STATE
  );

  return (
    <div className={cn("border-t border-silver/12 pt-4", className)}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
      >
        <Flag size={13} />
        Report this card
      </button>

      {isOpen ? (
        <form action={action} className="mt-4 space-y-3 rounded-2xl border border-silver/14 bg-white/[0.035] p-4">
          <input type="hidden" name="cardId" value={cardId} />
          <input type="hidden" name="cardSlug" value={cardSlug} />

          <div className="space-y-2">
            <Label htmlFor={`circle-card-report-reason-${cardId}`}>Reason</Label>
            <Select id={`circle-card-report-reason-${cardId}`} name="reason" required>
              {CIRCLE_CARD_REPORT_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`circle-card-report-details-${cardId}`}>Details</Label>
            <Textarea
              id={`circle-card-report-details-${cardId}`}
              name="details"
              maxLength={1600}
              placeholder="Optional context for the moderation team"
              className="min-h-[96px]"
            />
          </div>

          <p className="text-xs leading-relaxed text-muted">
            Reports are reviewed by a human. You can read the{" "}
            <Link href="/circle-card/community-standards" className="text-primary hover:underline">
              Circle Card Community Standards
            </Link>
            .
          </p>

          <Button type="submit" variant="outline" size="sm" disabled={isPending} className="gap-2">
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
            Submit report
          </Button>

          {state.message ? (
            <p
              aria-live="polite"
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed",
                state.status === "success"
                  ? "border-gold/30 bg-gold/10 text-gold"
                  : "border-red-500/30 bg-red-500/10 text-red-100"
              )}
            >
              {state.status === "success" ? (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              )}
              <span>{state.message}</span>
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
