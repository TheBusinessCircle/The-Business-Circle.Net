import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { MembershipTier } from "@prisma/client";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import { MemberFooter, MemberNavigation, RulesEntryOverlay } from "@/components/member";
import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { Separator } from "@/components/ui/separator";
import { SITE_CONFIG } from "@/config/site";
import { getMembershipTierLabel } from "@/config/membership";
import { signOutAction } from "@/lib/actions/auth-actions";
import { getAccentThemeCssVariables, resolveAccentTheme } from "@/lib/accent-themes";
import { PLATFORM_NAV, ROLE_LABELS } from "@/lib/constants";
import { canAccessTier, roleToTier } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  BCN_RULES_ACCEPTANCE_PATH,
  hasAcceptedBcnRules
} from "@/lib/rules-acceptance";
import { shouldShowRulesWelcomeOverlay } from "@/lib/rules-onboarding";
import { requireUser } from "@/lib/session";
import { getDirectMessageNavCounts } from "@/server/messages";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url)
};

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const [messageCounts, rulesAccepted, profileTheme] = await Promise.all([
    getDirectMessageNavCounts(session.user.id),
    hasAcceptedBcnRules(session.user.id),
    prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { accentTheme: true, workspaceAtmosphereEnabled: true }
    })
  ]);
  const accentTheme = resolveAccentTheme(profileTheme?.accentTheme);
  const workspaceAtmosphereEnabled = profileTheme?.workspaceAtmosphereEnabled ?? false;
  const accentThemeStyle = getAccentThemeCssVariables(accentTheme) as CSSProperties;
  const memberShellStyle = {
    ...accentThemeStyle,
    "--member-sticky-top": "6.75rem"
  } as CSSProperties;

  const visibleNavItems = PLATFORM_NAV.filter((item) => {
    const roleAllowed = item.requiresRole ? item.requiresRole === session.user.role : true;
    const tierAllowed = item.requiresTier ? canAccessTier(effectiveTier, item.requiresTier) : true;
    return roleAllowed && tierAllowed;
  }).map((item) => {
    if (item.href === "/messages") {
      return {
        ...item,
        badgeCount: messageCounts.unreadCount + messageCounts.pendingRequestCount
      };
    }

    if (item.href === "/wins") {
      return {
        ...item,
        badgeCount: messageCounts.pendingWinCredits
      };
    }

    return item;
  });

  const membershipBadge = `${getMembershipTierLabel(effectiveTier)} Active`;
  const premiumLinkLabel = canAccessTier(effectiveTier, MembershipTier.CORE)
    ? "Open Core Access"
    : "Open Inner Circle";
  const showRulesWelcome = shouldShowRulesWelcomeOverlay({
    isLoggedIn: true,
    rulesAccepted
  });

  const header = (
    <div className="sticky top-0 z-50">
      <header className="member-shell-header border-b border-border/80 bg-background/78 backdrop-blur-xl">
        <div className="flex w-full flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 2xl:px-12">
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
        </div>
      </header>

      <div className="border-b border-border/80 bg-background/94 px-4 py-3 sm:px-6 lg:hidden">
        <MemberNavigation items={visibleNavItems} orientation="horizontal" />
      </div>
    </div>
  );

  const sidebar = (
    <aside className="premium-surface hidden p-4 lg:sticky lg:top-[var(--member-sticky-top,6.75rem)] lg:block lg:max-h-[calc(100dvh-var(--member-sticky-top,6.75rem)-1rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
      <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/25 p-3">
        <Avatar
          className="member-profile-ring"
          name={session.user.name ?? session.user.email ?? "Member"}
          image={session.user.image}
        />
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
    <div
      className="member-accent-theme"
      data-member-accent-theme={accentTheme}
      data-member-workspace-atmosphere={workspaceAtmosphereEnabled ? "true" : "false"}
      style={memberShellStyle}
    >
      <AppShell
        header={header}
        sidebar={sidebar}
        footer={<MemberFooter />}
        contentClassName="py-7 lg:py-9"
      >
        <div className="space-y-6">
          {showRulesWelcome ? (
            <>
              <RulesEntryOverlay reviewHref={BCN_RULES_ACCEPTANCE_PATH} />
              <section className="premium-surface border-primary/30 bg-gradient-to-br from-primary/12 via-card/84 to-card/70 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs uppercase tracking-[0.1em] text-primary">
                      Accept BCN Rules to access conversations
                    </p>
                    <h2 className="mt-2 font-display text-2xl text-foreground">
                      Review the BCN Rules
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Messaging, chat, and calls unlock once you accept the BCN Rules.
                    </p>
                  </div>
                  <Link href={BCN_RULES_ACCEPTANCE_PATH}>
                    <Button className="w-full md:w-auto">
                      Review BCN Rules <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>
              </section>
            </>
          ) : null}
          {children}
        </div>
      </AppShell>
    </div>
  );
}
