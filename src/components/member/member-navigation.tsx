"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Compass,
  Crown,
  GitBranch,
  LayoutGrid,
  Mail,
  Menu,
  MessageSquare,
  Sparkles,
  Trophy,
  Search,
  UserCircle2,
  Video,
  X
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/types";
import { BrandMark } from "@/components/branding/brand-mark";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

type MemberNavigationProps = {
  items: NavigationItem[];
  orientation?: "vertical" | "horizontal";
  accentThemeStyle?: CSSProperties;
  showAdminLink?: boolean;
};

function iconForHref(href: string) {
  if (href.startsWith("/dashboard/resources")) {
    return Search;
  }
  if (href.startsWith("/dashboard")) {
    return LayoutGrid;
  }
  if (href.startsWith("/blueprint")) {
    return GitBranch;
  }
  if (href.startsWith("/resources")) {
    return Search;
  }
  if (href.startsWith("/directory")) {
    return UserCircle2;
  }
  if (href.startsWith("/messages")) {
    return MessageSquare;
  }
  if (href.startsWith("/wins")) {
    return Trophy;
  }
  if (href.startsWith("/calls")) {
    return Video;
  }
  if (href.startsWith("/member/bcn-updates")) {
    return Sparkles;
  }
  if (href.startsWith("/member/growth-architect")) {
    return Compass;
  }
  if (href.startsWith("/member/contact")) {
    return Mail;
  }
  if (href.startsWith("/community")) {
    return MessageSquare;
  }
  if (href.startsWith("/events")) {
    return CalendarDays;
  }
  if (href.startsWith("/inner-circle")) {
    return Crown;
  }
  if (href.startsWith("/founder")) {
    return Compass;
  }
  return LayoutGrid;
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberNavigation({
  items,
  orientation = "vertical",
  accentThemeStyle,
  showAdminLink = false
}: MemberNavigationProps) {
  const pathname = usePathname();
  const horizontal = orientation === "horizontal";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const activeItem = items.find((item) => isItemActive(pathname, item.href));

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  if (horizontal) {
    const mobileDrawer = mobileMenuOpen ? (
      <div
        id="member-mobile-navigation-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Member navigation"
        className="member-accent-theme fixed inset-0 isolate z-[9999] h-dvh min-h-dvh overflow-hidden overscroll-none bg-[#08030f] text-foreground lg:hidden"
        style={accentThemeStyle}
      >
        <div className="relative z-10 flex h-dvh min-h-dvh flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-[#08030f] bg-[linear-gradient(180deg,#120820_0%,hsl(var(--member-atmosphere-from))_26%,hsl(var(--member-atmosphere-via))_58%,#050208_100%)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl">
          <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col">
            <div className="rounded-3xl border border-[hsl(var(--member-accent-border)/0.42)] bg-[#0b0616] bg-[linear-gradient(145deg,hsl(var(--member-accent-strong))_0%,hsl(var(--member-atmosphere-via))_44%,hsl(var(--member-atmosphere-to))_100%)] p-4 shadow-[0_22px_64px_var(--member-accent-glow)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <BrandMark
                    placement="workspace"
                    className="border-[hsl(var(--member-accent-border)/0.45)]"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[hsl(var(--member-accent-text))]">
                      Member Workspace
                    </p>
                    <p className="mt-1 font-display text-xl leading-tight text-foreground">
                      Inside The Business Circle
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close member navigation"
                  onClick={closeMobileMenu}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--member-accent-border)/0.4)] bg-[hsl(var(--member-atmosphere-to))] text-[hsl(var(--member-accent-muted))] shadow-inner-surface transition-all hover:border-[hsl(var(--member-accent-border)/0.62)] hover:bg-[hsl(var(--member-accent-strong))] hover:text-[hsl(var(--member-accent-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--member-accent-soft)/0.75)]"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--member-accent-muted))]">
                Move through the rooms without leaving the member environment.
              </p>
            </div>

            <nav className="mt-5 flex flex-col gap-2" aria-label="Member mobile navigation">
              {items.map((item) => {
                const Icon = iconForHref(item.href);
                const active = isItemActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-active={active ? "true" : "false"}
                    onClick={() => {
                      if (active) {
                        closeMobileMenu();
                      }
                    }}
                    className={cn(
                      "flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-base font-medium shadow-inner-surface transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--member-accent-soft)/0.75)]",
                      active
                        ? "border-[hsl(var(--member-accent-border)/0.72)] bg-[#120820] bg-[linear-gradient(135deg,hsl(var(--member-accent-strong))_0%,hsl(var(--member-atmosphere-via))_52%,hsl(var(--member-atmosphere-to))_100%)] text-[hsl(var(--member-accent-text))] shadow-[0_18px_48px_var(--member-accent-glow)]"
                        : "border-[hsl(var(--member-accent-border)/0.26)] bg-[hsl(var(--member-atmosphere-via))] text-foreground hover:border-[hsl(var(--member-accent-border)/0.5)] hover:bg-[hsl(var(--member-accent-strong))] hover:text-[hsl(var(--member-accent-text))]"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                          active
                            ? "border-[hsl(var(--member-accent-border)/0.56)] bg-[hsl(var(--member-accent-strong))] text-[hsl(var(--member-accent-text))]"
                            : "border-[hsl(var(--member-accent-border)/0.24)] bg-[hsl(var(--member-atmosphere-to))] text-[hsl(var(--member-accent-muted))]"
                        )}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badgeCount ? (
                      <span className="rounded-full border border-[hsl(var(--member-accent-border)/0.36)] bg-[hsl(var(--member-accent-strong))] px-2 py-0.5 text-[11px] text-[hsl(var(--member-accent-text))]">
                        {item.badgeCount}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          active
                            ? "bg-[hsl(var(--member-accent-soft))]"
                            : "bg-[hsl(var(--member-accent-border)/0.42)]"
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-6">
              <div className="rounded-3xl border border-[hsl(var(--member-accent-border)/0.24)] bg-[hsl(var(--member-atmosphere-via))] p-3">
                {showAdminLink ? (
                  <Link
                    href="/admin"
                    className="mb-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--member-accent-border)/0.28)] bg-[hsl(var(--member-accent-strong))] px-4 text-sm font-medium text-[hsl(var(--member-accent-text))] transition-colors hover:bg-[hsl(var(--member-atmosphere-from))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--member-accent-soft)/0.75)]"
                  >
                    <Crown size={16} />
                    Admin
                  </Link>
                ) : null}
                <form action={signOutAction} onSubmit={closeMobileMenu}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="lg"
                    className="min-h-12 w-full justify-center text-[hsl(var(--member-accent-muted))] hover:bg-[hsl(var(--member-atmosphere-from))] hover:text-foreground"
                  >
                    Sign Out
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;

    return (
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="member-mobile-navigation-menu"
          aria-label={mobileMenuOpen ? "Close member navigation" : "Open member navigation"}
          onClick={() => setMobileMenuOpen((previousState) => !previousState)}
          className="member-nav-item flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[hsl(var(--member-accent-border)/0.34)] bg-[hsl(var(--member-accent-strong)/0.36)] px-4 py-3 text-left text-foreground shadow-inner-surface transition-all hover:border-[hsl(var(--member-accent-border)/0.58)] hover:bg-[hsl(var(--member-accent)/0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--member-accent-soft)/0.75)]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--member-accent-border)/0.4)] bg-[hsl(var(--member-accent)/0.14)] text-[hsl(var(--member-accent-text))]">
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--member-accent-muted))]">
                Member menu
              </span>
              <span className="mt-0.5 block truncate text-sm font-medium text-foreground">
                {activeItem?.label ?? "Open workspace navigation"}
              </span>
            </span>
          </span>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--member-accent-soft))] shadow-[0_0_24px_var(--member-accent-glow)]"
            aria-hidden="true"
          />
        </button>

        {portalReady && mobileDrawer ? createPortal(mobileDrawer, document.body) : null}
      </div>
    );
  }

  return (
    <nav className="space-y-1.5">
      {items.map((item) => {
        const Icon = iconForHref(item.href);
        const active = isItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active ? "true" : "false"}
            className={cn(
              "member-nav-item inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200",
              "w-full",
              active
                ? "border-[hsl(var(--member-accent-border)/0.55)] bg-[hsl(var(--member-accent)/0.14)] text-[hsl(var(--member-accent-text))] shadow-[0_12px_34px_var(--member-accent-glow)]"
                : "border-border/70 bg-background/20 text-muted hover:border-[hsl(var(--member-accent-border)/0.38)] hover:bg-[hsl(var(--member-accent)/0.09)] hover:text-foreground"
            )}
          >
            <Icon
              size={16}
              className={cn(active ? "text-[hsl(var(--member-accent-text))]" : "text-[hsl(var(--member-accent-muted))]")}
            />
            <span>{item.label}</span>
            {item.badgeCount ? (
              <span className="ml-auto rounded-full bg-[hsl(var(--member-accent)/0.15)] px-2 py-0.5 text-[11px] text-[hsl(var(--member-accent-text))]">
                {item.badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
