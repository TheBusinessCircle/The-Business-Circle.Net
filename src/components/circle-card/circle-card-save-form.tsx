"use client";

import { useActionState, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  initialCircleCardSaveActionState,
  type CircleCardSaveActionState
} from "@/lib/circle-card/save-action-state";
import { CircleCardSubmitStatusProvider } from "@/components/circle-card/circle-card-submit-button";
import { cn } from "@/lib/utils";

type CircleCardSaveFormProps = {
  id?: string;
  className?: string;
  noValidate?: boolean;
  action: (
    previousState: CircleCardSaveActionState,
    formData: FormData
  ) => Promise<CircleCardSaveActionState>;
  children: ReactNode;
};

function firstFieldErrorName(fieldErrors?: Partial<Record<string, string[]>>) {
  if (!fieldErrors) {
    return null;
  }

  return Object.entries(fieldErrors).find(([, messages]) => Boolean(messages?.length))?.[0] ?? null;
}

export function CircleCardSaveForm({
  id,
  className,
  noValidate,
  action,
  children
}: CircleCardSaveFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialCircleCardSaveActionState);
  const firstInvalidField = useMemo(() => firstFieldErrorName(state.fieldErrors), [state.fieldErrors]);

  useEffect(() => {
    if (!state.success || !state.submittedAt) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("circle-card:save-success", {
        detail: {
          cardId: state.cardId,
          slug: state.slug
        }
      })
    );
    router.refresh();
  }, [router, state.cardId, state.slug, state.success, state.submittedAt]);

  useEffect(() => {
    if (state.success || !state.submittedAt || !firstInvalidField) {
      return;
    }

    const form = id ? document.getElementById(id) : null;
    const field =
      form instanceof HTMLFormElement
        ? form.elements.namedItem(firstInvalidField)
        : document.querySelector(`[name="${CSS.escape(firstInvalidField)}"]`);
    const target = field instanceof RadioNodeList ? field.item(0) : field;

    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.focus();
    }
  }, [firstInvalidField, id, state.success, state.submittedAt]);

  return (
    <CircleCardSubmitStatusProvider
      value={{
        success: state.success,
        submittedAt: state.submittedAt
      }}
    >
      <form id={id} action={formAction} className={className} noValidate={noValidate}>
        {state.message ? (
          <div
            role={state.success ? "status" : "alert"}
            aria-live={state.success ? "polite" : "assertive"}
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              state.success
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            )}
          >
            <div className="flex items-start gap-2">
              {state.success ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              ) : (
                <XCircle size={16} className="mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">{state.message}</p>
                {state.formError && state.formError !== state.message ? (
                  <p className="mt-1">{state.formError}</p>
                ) : null}
                {state.success && state.publicUrl ? (
                  <a
                    href={state.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all underline underline-offset-4"
                  >
                    {state.publicUrl}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {children}
      </form>
    </CircleCardSubmitStatusProvider>
  );
}
