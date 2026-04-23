import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { AdminLivePanel, AdminNavigation } from "@/components/admin";
import { BackgroundModeToggle } from "@/components/background-mode/background-mode-toggle";
import { BrandMark } from "@/components/branding/brand-mark";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SITE_CONFIG } from "@/config/site";
import { signOutAction } from "@/lib/actions/auth-actions";
import { ADMIN_NAV } from "@/lib/constants";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url)
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  const header = (
    <header className="border-b border-border/80 bg-background/78 backdrop-blur-xl">
      <div className="flex w-full flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin" className="inline-flex min-w-0 items-center gap-3">
            <BrandMark placement="admin" />
            <div className="min-w-0">
              <p className="font-display text-lg text-foreground">Admin Control Panel</p>
              <p className="truncate text-xs text-muted">Signed in as {session.user.email}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="premium" className="hidden sm:inline-flex">
              <ShieldCheck size={12} className="mr-1" />
              Administrator
            </Badge>
            <BackgroundModeToggle labelClassName="hidden sm:inline" />
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          <AdminNavigation items={ADMIN_NAV} orientation="horizontal" />
          <AdminLivePanel />
        </div>
      </div>
    </header>
  );

  const sidebar = (
    <aside className="premium-surface hidden p-4 lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:overscroll-contain">
      <div className="rounded-2xl border border-gold/35 bg-gold/10 p-3">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-gold">
          <Sparkles size={15} />
          Platform Operations
        </p>
        <p className="mt-1 text-xs text-muted">
          Moderation, content, billing, channels, and member governance.
        </p>
      </div>

      <Separator className="my-4" />
      <AdminNavigation items={ADMIN_NAV} />

      <Link
        href="/dashboard"
        className="mt-5 inline-flex w-full items-center justify-between rounded-xl border border-border/80 bg-background/20 px-3 py-2 text-sm text-muted transition-colors hover:border-gold/35 hover:text-foreground"
      >
        Back to Member App
        <ArrowUpRight size={14} />
      </Link>

      <AdminLivePanel />
    </aside>
  );

  return (
    <AppShell header={header} sidebar={sidebar} contentClassName="py-7 lg:py-9">
      <div className="space-y-6">{children}</div>
    </AppShell>
  );
}
