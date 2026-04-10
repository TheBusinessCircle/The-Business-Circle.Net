"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MembershipTier, PendingRegistrationStatus } from "@prisma/client";
import { CheckCircle2, Clock3, RefreshCcw, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMembershipTierLabel } from "@/config/membership";
import { buildJoinConfirmationHref } from "@/lib/join/routing";

type PendingRegistrationStatusModel = {
  status: PendingRegistrationStatus;
  email: string;
  fullName: string;
  selectedTier: MembershipTier;
  billingInterval: "monthly" | "annual";
};

type JoinCompletionStatusProps = {
  sessionId: string;
  initialStatus: PendingRegistrationStatusModel | null;
};

const POLL_INTERVAL_MS = 2500;

function isTerminalStatus(status: PendingRegistrationStatus | null | undefined) {
  return (
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "EXPIRED"
  );
}

export function JoinCompletionStatus({
  sessionId,
  initialStatus
}: JoinCompletionStatusProps) {
  const [status, setStatus] = useState<PendingRegistrationStatusModel | null>(initialStatus);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || isTerminalStatus(status?.status)) {
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response = await fetch(
          `/api/register/status?session_id=${encodeURIComponent(sessionId)}`,
          {
            cache: "no-store"
          }
        );

        if (!response.ok) {
          if (!cancelled) {
            setNotice("We are still checking your payment confirmation.");
          }
          return;
        }

        const nextStatus = (await response.json()) as PendingRegistrationStatusModel;
        if (!cancelled) {
          setStatus(nextStatus);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setNotice("We are still checking your payment confirmation.");
        }
      }
    };

    void loadStatus();
    const pollHandle = window.setInterval(() => {
      void loadStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(pollHandle);
    };
  }, [sessionId, status?.status]);

  const retryHref = useMemo(() => {
    if (!status) {
      return "/join";
    }

    return buildJoinConfirmationHref({
      tier: status.selectedTier,
      period: status.billingInterval,
      billing: status.status === "EXPIRED" ? "cancelled" : undefined
    });
  }, [status]);

  if (!status) {
    return (
      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/10 text-gold">
            Stripe Confirmation
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">
            We are checking your payment now.
          </CardTitle>
          <CardDescription className="text-base">
            Keep this page open for a moment while we confirm the checkout and complete access.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status.status === "COMPLETED") {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/72">
          <CardHeader>
            <Badge variant="outline" className="w-fit border-gold/35 bg-gold/10 text-gold">
              Payment Confirmed
            </Badge>
            <CardTitle className="mt-3 font-display text-4xl">
              Your access is ready.
            </CardTitle>
            <CardDescription className="text-base">
              Stripe confirmed payment for {getMembershipTierLabel(status.selectedTier)}. Sign in
              with the password you chose during checkout to enter the Circle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Member</p>
                <p className="mt-2 text-sm font-medium text-foreground">{status.fullName}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Room</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {getMembershipTierLabel(status.selectedTier)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Billing</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {status.billingInterval === "annual" ? "Annual" : "Monthly"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gold/25 bg-gold/10 px-5 py-4 text-sm text-gold">
              Billing was completed securely in Stripe. Your real member account was only created
              after payment confirmed.
            </div>

            <div className="space-y-3 rounded-2xl border border-border/80 bg-background/22 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 size={16} className="text-gold" />
                What happens next
              </p>
              <p className="text-sm text-muted">
                Sign in below, open your dashboard, and take the first calm move inside the
                membership.
              </p>
            </div>
          </CardContent>
        </Card>

        <LoginForm
          from="/dashboard?billing=success&source=join&welcome=1"
          initialNotice="Payment confirmed. Sign in with the password you chose during checkout."
          initialEmail={status.email}
        />
      </div>
    );
  }

  if (status.status === "EXPIRED" || status.status === "CANCELLED") {
    return (
      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/10 text-gold">
            Checkout Not Completed
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">
            Your access was not activated.
          </CardTitle>
          <CardDescription className="text-base">
            No member account was created. Return to join and restart secure checkout when you are
            ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href={retryHref}>
            <Button>Return To Join</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gold/25 bg-gradient-to-br from-gold/8 via-card/82 to-card/72">
      <CardHeader>
        <Badge variant="outline" className="w-fit border-gold/35 bg-gold/10 text-gold">
          Completing Access
        </Badge>
        <CardTitle className="mt-3 font-display text-3xl">
          {status.status === "PAID"
            ? "Payment confirmed. Finalising your access."
            : "Waiting for final payment confirmation."}
        </CardTitle>
        <CardDescription className="text-base">
          Keep this page open for a moment while the webhook completes the real member account and
          membership setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock3 size={16} className="text-gold" />
              Payment
            </p>
            <p className="mt-2 text-sm text-muted">
              Stripe has returned you to the confirmation step.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck size={16} className="text-gold" />
              Security
            </p>
            <p className="mt-2 text-sm text-muted">
              Access is only created after the webhook confirms payment.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <RefreshCcw size={16} className="text-gold" />
              Next
            </p>
            <p className="mt-2 text-sm text-muted">
              This page refreshes automatically while setup finishes.
            </p>
          </div>
        </div>

        {notice ? (
          <p className="rounded-2xl border border-border/80 bg-background/22 px-4 py-3 text-sm text-muted">
            {notice}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Refresh Status
          </Button>
          <Link href={retryHref}>
            <Button variant="ghost">Back To Join</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
