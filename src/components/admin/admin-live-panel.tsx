"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AdminLiveSnapshotResponse = {
  pulse: {
    signups24h: number;
    posts24h: number;
    comments24h: number;
    wins24h: number;
  };
  system: {
    appStatus: "healthy" | "attention";
    databaseStatus: "healthy" | "degraded";
    warnings: number;
  };
  security: {
    warnings: number;
    suspendedUsers: number;
    paymentRiskMembers: number;
    passwordResetRequests24h: number;
  };
  activity: Array<{
    id: string;
    type:
      | "member-signup"
      | "community-post"
      | "community-comment"
      | "connection-win"
      | "resource"
      | "event"
      | "profile"
      | "billing";
    title: string;
    detail: string;
    href: string | null;
    createdAt: string;
    tone?: "default" | "attention";
  }>;
  lastUpdatedAt: string;
};

const POLL_INTERVAL_MS = 60_000;

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function AdminLivePanel() {
  const [snapshot, setSnapshot] = useState<AdminLiveSnapshotResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        const response = await fetch("/api/admin/live-summary", {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("admin-live-summary-failed");
        }

        const payload = (await response.json()) as AdminLiveSnapshotResponse;
        if (!cancelled) {
          setSnapshot(payload);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    }

    void loadSnapshot();
    const intervalId = window.setInterval(() => {
      void loadSnapshot();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (!snapshot && !error) {
    return (
      <div className="mt-5 rounded-2xl border border-silver/16 bg-background/18 p-4">
        <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Live operations</p>
        <p className="mt-2 text-sm text-muted">Loading the latest platform pulse...</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-red-100">
          <AlertTriangle size={14} />
          Live operations are temporarily unavailable.
        </p>
        <p className="mt-2 text-xs text-red-100/80">
          Refresh the page to retry the near-live admin feed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3 rounded-2xl border border-silver/16 bg-background/18 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Live operations</p>
          <p className="mt-1 text-sm text-foreground">Near-live pulse across members, content, and risk.</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "normal-case tracking-normal",
            snapshot.system.warnings || snapshot.security.warnings
              ? "border-gold/35 bg-gold/10 text-gold"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          )}
        >
          <Activity size={12} className="mr-1" />
          {snapshot.system.warnings || snapshot.security.warnings ? "Attention" : "Healthy"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PulseStat label="Signups" value={snapshot.pulse.signups24h} />
        <PulseStat label="Posts" value={snapshot.pulse.posts24h} />
        <PulseStat label="Comments" value={snapshot.pulse.comments24h} />
        <PulseStat label="Wins" value={snapshot.pulse.wins24h} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <StatusRow
          icon={Sparkles}
          label="System"
          value={`${snapshot.system.appStatus}, ${snapshot.system.databaseStatus}`}
          tone={snapshot.system.warnings ? "attention" : "default"}
        />
        <StatusRow
          icon={ShieldAlert}
          label="Security"
          value={`${snapshot.security.passwordResetRequests24h} reset requests in 24h`}
          tone={snapshot.security.warnings ? "attention" : "default"}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground">Latest activity</p>
        {snapshot.activity.length ? (
          snapshot.activity.slice(0, 5).map((item) => {
            const content = (
              <div
                className={cn(
                  "rounded-xl border px-3 py-3 transition-colors",
                  item.tone === "attention"
                    ? "border-gold/24 bg-gold/10"
                    : "border-silver/14 bg-background/18 hover:border-silver/24 hover:bg-background/28"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted">{formatTimestamp(item.createdAt)}</span>
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-silver/14 bg-background/14 px-3 py-3 text-xs text-muted">
            New activity will appear here as the platform moves.
          </p>
        )}
      </div>

      <p className="text-[11px] text-muted">Updated {formatTimestamp(snapshot.lastUpdatedAt)}</p>
    </div>
  );
}

function PulseStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-silver/14 bg-background/18 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value.toLocaleString("en-GB")}</p>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  tone = "default"
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "default" | "attention";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        tone === "attention"
          ? "border-gold/24 bg-gold/10 text-gold"
          : "border-silver/14 bg-background/18 text-muted"
      )}
    >
      <Icon size={13} />
      <span className="font-medium">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
