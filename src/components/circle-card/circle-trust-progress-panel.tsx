import Link from "next/link";
import { CheckCircle2, ChevronDown, Circle, LockKeyhole, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type {
  CircleTrustOpportunity,
  CircleTrustSignal,
  CircleTrustSignalId,
  CircleTrustSummary
} from "@/lib/circle-card/circle-trust";
import { cn } from "@/lib/utils";

type CircleTrustProgressPanelProps = {
  trust: CircleTrustSummary;
  cardId: string;
  cardType: "BUSINESS" | "CREATOR";
  hasProAccess: boolean;
  publicUrl: string;
};

function manageHref(cardId: string, section: string, hash: string) {
  return `/dashboard/circle-card?cardId=${encodeURIComponent(cardId)}&section=${section}#${hash}`;
}

function actionForSignal(cardId: string, signal: CircleTrustOpportunity) {
  const actions: Partial<Record<CircleTrustSignalId, { href: string; label: string }>> = {
    "verified-connections": {
      href: manageHref(cardId, "wallet", "circle-wallet"),
      label: "Build Wallet Connections"
    },
    "verified-testimonials": {
      href: manageHref(cardId, "share", "share-assets"),
      label: "Invite a Testimonial"
    },
    "published-circle-card": {
      href: manageHref(cardId, "my-card", "card-visibility"),
      label: "Publish Circle Card"
    },
    "active-profile": {
      href: manageHref(cardId, "share", "share-assets"),
      label: "Stay Active"
    },
    "profile-complete": {
      href: manageHref(cardId, "my-card", "card-identity"),
      label: "Complete Profile"
    },
    "verified-account-email": { href: "/dashboard", label: "Verify Email" },
    "website-added": {
      href: manageHref(cardId, "my-card", "card-contact-details"),
      label: "Add Website"
    },
    "bcn-member": { href: "/join", label: "Explore Membership" }
  };

  return actions[signal.id] ?? null;
}

function CompletedSignal({ signal }: { signal: CircleTrustSignal }) {
  return (
    <li className="flex min-w-0 items-start gap-2.5 rounded-xl border border-emerald-300/16 bg-emerald-300/[0.045] p-3">
      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">
          {signal.count !== undefined ? `${signal.count} ` : ""}{signal.label}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{signal.description}</span>
      </span>
    </li>
  );
}

export function CircleTrustProgressPanel({
  trust,
  cardId,
  cardType,
  hasProAccess,
  publicUrl
}: CircleTrustProgressPanelProps) {
  const actionableSignals = trust.availableSignals
    .map((signal) => ({ signal, action: actionForSignal(cardId, signal) }))
    .filter((item): item is { signal: CircleTrustOpportunity; action: { href: string; label: string } } => Boolean(item.action));
  const nextAction = actionableSignals[0] ?? null;
  const creator = cardType === "CREATOR";

  return (
    <section
      id={`${cardType.toLowerCase()}-circle-trust-progress`}
      aria-labelledby={`${cardType.toLowerCase()}-circle-trust-progress-title`}
      className={cn(
        "overflow-hidden rounded-2xl border p-3 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-4",
        creator
          ? "border-cyan-300/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.09),transparent_38%),rgba(255,255,255,0.03)]"
          : "border-gold/22 bg-[radial-gradient(circle_at_top_right,rgba(212,175,95,0.08),transparent_38%),rgba(255,255,255,0.03)]"
      )}
    >
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.36fr)]">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("text-xs font-medium uppercase tracking-[0.1em]", creator ? "text-cyan-200" : "text-gold")}>Growing Circle Trust</p>
              <h3 id={`${cardType.toLowerCase()}-circle-trust-progress-title`} className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl">
                Build Your Circle Trust
              </h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted sm:text-sm">Only genuine, stored trust signals contribute. There are no percentages or activity points.</p>
            </div>
            <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", creator ? "border-cyan-300/24 bg-cyan-300/8 text-cyan-100" : "border-gold/24 bg-gold/10 text-gold")}>
              <ShieldCheck size={19} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
            <span className={cn("font-display text-4xl font-semibold leading-none", creator ? "text-cyan-100" : "text-gold")}>{trust.score}</span>
            <span className="pb-0.5 text-sm font-semibold text-foreground">Current Circle Trust</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">{trust.summary}</p>
        </div>

        <div className={cn("flex min-w-0 flex-col justify-between rounded-xl border p-3", creator ? "border-cyan-300/16 bg-cyan-300/[0.045]" : "border-gold/16 bg-gold/[0.045]")}>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">Next recommended action</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{nextAction?.action.label ?? "Keep your Circle Card current"}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {nextAction?.signal.description ?? "Your available trust signals are complete. Keep building genuine relationships."}
            </p>
          </div>
          <Link href={nextAction?.action.href ?? publicUrl} className={cn(buttonVariants({ size: "sm" }), "mt-3 h-10 w-full min-w-0")}>
            {nextAction?.action.label ?? "View Circle Card"}
          </Link>
        </div>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
        <details className="group min-w-0 rounded-xl border border-silver/12 bg-background/20">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span>Completed Trust Signals</span>
            <span className="flex items-center gap-2 text-xs font-normal text-muted">{trust.signals.length}<ChevronDown size={14} className="transition-transform group-open:rotate-180" /></span>
          </summary>
          <ul className="grid min-w-0 gap-2 border-t border-silver/10 p-2.5">
            {trust.signals.length ? trust.signals.map((signal) => <CompletedSignal key={signal.id} signal={signal} />) : (
              <li className="rounded-xl border border-silver/10 p-3 text-xs leading-relaxed text-muted">Completed trust signals will appear here as genuine history is recorded.</li>
            )}
          </ul>
        </details>

        <details className="group min-w-0 rounded-xl border border-silver/12 bg-background/20">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span>Available Trust Signals</span>
            <span className="flex items-center gap-2 text-xs font-normal text-muted">{actionableSignals.length}<ChevronDown size={14} className="transition-transform group-open:rotate-180" /></span>
          </summary>
          <ul className="grid min-w-0 gap-2 border-t border-silver/10 p-2.5">
            {actionableSignals.map(({ signal, action }) => (
              <li key={signal.id} className="flex min-w-0 items-start gap-2.5 rounded-xl border border-silver/10 bg-white/[0.025] p-3">
                <Circle size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{signal.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{signal.description}</span>
                  <Link href={action.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 h-8 max-w-full px-2.5 text-xs")}>
                    {action.label}
                  </Link>
                </span>
              </li>
            ))}
            {!actionableSignals.length ? <li className="rounded-xl border border-silver/10 p-3 text-xs leading-relaxed text-muted">No incomplete trust signals are currently available.</li> : null}
            {!hasProAccess ? (
              <li className="flex min-w-0 items-start gap-2.5 rounded-xl border border-gold/18 bg-gold/[0.045] p-3">
                <LockKeyhole size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">Upgrade to Pro <Badge variant="outline" className="border-gold/22 text-gold">Opportunity</Badge></span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">Pro unlocks additional modules that can create genuine trust signals when completed. Upgrading does not add points by itself.</span>
                  <Link href="/circle-card/pro" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 h-8 px-2.5 text-xs")}>Explore Pro</Link>
                </span>
              </li>
            ) : null}
          </ul>
        </details>
      </div>
    </section>
  );
}
