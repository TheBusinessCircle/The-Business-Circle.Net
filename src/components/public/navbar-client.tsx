"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { NavigationItem } from "@/types";
import { BackgroundModeToggle } from "@/components/background-mode/background-mode-toggle";
import { NavbarBrand } from "@/components/public/navbar-brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth-actions";
import { PUBLIC_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NavbarClientProps = {
  isAuthenticated: boolean;
};

type NavigationLinksProps = {
  items: readonly NavigationItem[];
  onNavigate?: () => void;
  className?: string;
};

function NavigationLinks({ items, onNavigate, className }: NavigationLinksProps) {
  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "rounded-xl px-2.5 py-2 text-sm text-muted transition-all hover:bg-background/55 hover:text-foreground xl:px-3",
            className
          )}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function NavbarClient({ isAuthenticated }: NavbarClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 overflow-x-clip border-b border-border/80 bg-background/82 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between gap-3 px-2.5 sm:h-[5.5rem] sm:gap-6 sm:px-6 lg:px-8">
        <NavbarBrand />

        <nav className="hidden flex-1 items-center justify-center px-3 lg:flex">
          <div className="flex min-w-0 max-w-[36rem] items-center gap-1 rounded-2xl border border-border/70 bg-card/60 p-1.5 shadow-panel-soft">
            <NavigationLinks items={PUBLIC_NAV} />
          </div>
        </nav>

        <div className="hidden flex-none items-center gap-2 lg:flex">
          <BackgroundModeToggle />
          <div className="h-7 w-px bg-border/70" />
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Member home
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign Out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Sign in
              </Link>
              <Link href="/membership" className={buttonVariants({ size: "sm" })}>
                Find Your Room
              </Link>
            </>
          )}
        </div>

        <div className="relative flex shrink-0 items-center gap-1.5 min-[420px]:gap-2 lg:hidden">
          <BackgroundModeToggle showLabel={false} className="hidden min-[420px]:inline-flex" />
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileMenuOpen((previousState) => !previousState)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/65 text-silver min-[420px]:h-10 min-[420px]:w-10 min-[420px]:rounded-xl"
          >
            <span className="sr-only">Toggle navigation</span>
            <Menu size={18} />
          </button>

          {mobileMenuOpen ? (
            <div
              id="mobile-navigation-menu"
              className="absolute right-0 top-11 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-border/90 bg-background/95 p-3 shadow-panel backdrop-blur min-[420px]:top-12"
            >
              <div className="rounded-2xl border border-gold/20 bg-gold/10 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                  Private environment
                </p>
                <p className="mt-1 text-sm text-muted">
                  Built for business owners who value clearer rooms and better signal.
                </p>
              </div>
              <nav className="mt-3 flex flex-col gap-1">
                <NavigationLinks
                  items={PUBLIC_NAV}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </nav>
              <div className="gold-divider my-3" />
              <BackgroundModeToggle fullWidth />
              <div className="mt-3 flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "w-full justify-center"
                      )}
                    >
                      Member home
                    </Link>
                    <form
                      action={signOutAction}
                      onSubmit={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center"
                      >
                        Sign Out
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "w-full justify-center"
                      )}
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/membership"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(buttonVariants({ size: "sm" }), "w-full justify-center")}
                    >
                      Find Your Room
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
