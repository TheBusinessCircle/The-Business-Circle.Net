"use client";

import { useActionState } from "react";
import {
  claimScaleSmithsPartnerLinkAction,
  createScaleSmithsPartnerLinkAction,
  type ScaleSmithsAdminLinkState,
  type ScaleSmithsClaimLinkState
} from "@/actions/scalesmiths-circle-card.actions";

const initialClaim: ScaleSmithsClaimLinkState = { linked: false, message: "" };
const initialIssue: ScaleSmithsAdminLinkState = { message: "", token: null, expiresAt: null };

const fieldClass = "w-full rounded-xl border border-silver/25 bg-background px-3 py-2 text-sm";
const submitClass = "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60";

export function ScaleSmithsPartnerClaimForm() {
  const [state, submit, pending] = useActionState(claimScaleSmithsPartnerLinkAction, initialClaim);
  if (state.linked) {
    return <p className="rounded-xl border border-emerald-400/30 p-4 text-sm" role="status">{state.message}</p>;
  }
  return (
    <form action={submit} className="mt-4 grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Your ScaleSmiths partner ID</span>
        <input className={fieldClass} name="externalPartnerId" required maxLength={128} autoComplete="off" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">One-time account-link token</span>
        <input className={fieldClass} name="token" required minLength={64} maxLength={64}
          autoComplete="off" spellCheck={false} />
      </label>
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Verifying your account…" : "Link my Circle Card account"}
      </button>
      {state.message ? <p className="text-sm text-muted" role="status">{state.message}</p> : null}
    </form>
  );
}

export function ScaleSmithsAdminIssueLinkForm() {
  const [state, submit, pending] = useActionState(createScaleSmithsPartnerLinkAction, initialIssue);
  return (
    <form action={submit} className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">Verified ScaleSmiths partner ID</span>
        <input className={fieldClass} name="externalPartnerId" required maxLength={128} autoComplete="off" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">Exact Circle Card user ID</span>
        <input className={fieldClass} name="circleCardUserId" required maxLength={128} autoComplete="off" />
      </label>
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Issuing secure link…" : "Issue one-time link token"}
      </button>
      {state.message ? <p role="status" className="text-sm text-muted">{state.message}</p> : null}
      {state.token ? (
        <div className="rounded-xl border border-primary/35 bg-background/50 p-4">
          <p className="text-sm font-semibold">Private token (shown only in this response)</p>
          <input aria-label="One-time account link token" className={fieldClass}
            readOnly value={state.token} onFocus={(event) => event.currentTarget.select()} />
          <p className="mt-2 text-xs text-muted">
            Expires {state.expiresAt}. Send it privately and securely to its intended user.
            Never paste it in a public chat, URL or repository. The user must claim it while
            signed into the correct Circle Card account.
          </p>
        </div>
      ) : null}
    </form>
  );
}
