import Link from "next/link";
import { ReactNode } from "react";
import { MembershipTier } from "@prisma/client";
import { ShieldCheck } from "lucide-react";
import { BackgroundModeToggle } from "@/components/background-mode/background-mode-toggle";
import { BrandMark } from "@/components/branding/brand-mark";
import { MemberNavigation } from "@/components/member";
import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { Separator } from "@/components/ui/separator";
import { getMembershipTierLabel } from "@/config/membership";
import { signOutAction } from "@/lib/actions/auth-actions";
import { PLATFORM_NAV, ROLE_LABELS } from "@/lib/constants";
import { canAccessTier, roleToTier } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);

  const visibleNavItems = PLATFORM_NAV.filter((item) => {
    const roleAllowed = item.requiresRole ? item.requiresRole === session.user.role : true;
    const tierAllowed = item.requiresTier ? canAccessTier(effectiveTier, item.requiresTier) : true;
    return roleAllowed && tierAllowed;
  });

  const membershipBadge = `${getMembershipTierLabel(effectiveTier)} Active`;
  const premiumLinkLabel = canAccessTier(effectiveTier, MembershipTier.CORE)
    ? "Open Core Access"
    : "Open Inner Circle";

  const header = (
    <header className="border-b border-border/80 bg-background/78 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="inline-flex items-center gap-3">
            <BrandMark placement="workspace" />
            <div>
              <p className="font-display text-base text-foreground">Member Workspace</p>
              <p className="text-[11px] tracking-[0.08em] text-muted uppercase">
                The Business Circle Network
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant="muted" className="hidden sm:inline-flex">
              {membershipBadge}
            </Badge>
            <FoundingBadge tier={session.user.foundingTier} className="hidden sm:inline-flex" />
            <BackgroundModeToggle labelClassName="hidden sm:inline" />
            {session.user.role === "ADMIN" ? (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  Admin
                </Button>
              </Link>
            ) : null}
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </div>

        <div className="lg:hidden">
          <MemberNavigation items={visibleNavItems} orientation="horizontal" />
        </div>
      </div>
    </header>
  );

  const sidebar = (
    <aside className="premium-surface hidden h-fit p-4 lg:sticky lg:top-6 lg:block">
      <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/25 p-3">
        <Avatar name={session.user.name ?? session.user.email ?? "Member"} image={session.user.image} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {session.user.name ?? "Business Circle Member"}
          </p>
          <p className="truncate text-xs text-muted">{session.user.email}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="muted">{ROLE_LABELS[session.user.role]}</Badge>
        <MembershipTierBadge tier={effectiveTier} />
        <FoundingBadge tier={session.user.foundingTier} />
      </div>

      <Separator className="my-4" />
      <MemberNavigation items={visibleNavItems} />

      {canAccessTier(effectiveTier, MembershipTier.INNER_CIRCLE) ? (
        <Link
          href="/inner-circle"
          className="mt-5 flex items-center gap-2 rounded-xl border border-gold/35 bg-gold/10 px-3 py-2 text-sm text-gold transition-colors hover:bg-gold/15"
        >
          <ShieldCheck size={16} />
          {premiumLinkLabel}
        </Link>
      ) : (
        <Link
          href="/inner-circle"
          className="mt-5 block rounded-xl border border-border/80 bg-background/20 px-3 py-2 text-sm text-muted transition-colors hover:border-gold/35 hover:text-foreground"
        >
          Preview Inner Circle
        </Link>
      )}
    </aside>
  );

  return (
    <AppShell header={header} sidebar={sidebar} contentClassName="py-7 lg:py-9">
      <div className="space-y-6">{children}</div>
    </AppShell>
  );
}
