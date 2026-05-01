"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { NavigationItem } from "@/types";
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
  className?: string;
};

function NavigationLinks({ items, className }: NavigationLinksProps) {
  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-xl px-2.5 py-2 text-sm text-muted transition-all hover:bg-accent/70 hover:text-foreground xl:px-3",
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

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-50 overflow-x-clip border-b border-border/80 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-[1400px] items-center justify-between gap-3 px-6 sm:h-[5.5rem] sm:gap-6 lg:px-10">
          <NavbarBrand />

          <nav className="hidden flex-1 items-center justify-center px-3 lg:flex">
            <div className="surface-subtle flex min-w-0 max-w-[36rem] items-center gap-1 rounded-2xl p-1.5">
              <NavigationLinks items={PUBLIC_NAV} />
            </div>
          </nav>

          <div className="hidden flex-none items-center gap-2 lg:flex">
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
            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-menu"
              aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMobileMenuOpen((previousState) => !previousState)}
              className="surface-subtle flex h-9 w-9 items-center justify-center rounded-lg text-silver min-[420px]:h-10 min-[420px]:w-10 min-[420px]:rounded-xl"
            >
              <span className="sr-only">Toggle navigation</span>
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div
          id="mobile-navigation-menu"
          className="fixed inset-0 z-[110] min-h-dvh overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,rgba(6,12,27,0.99)_0%,rgba(8,17,38,0.985)_48%,rgba(3,8,19,0.995)_100%)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(5.25rem,env(safe-area-inset-top))] text-foreground shadow-2xl backdrop-blur-md lg:hidden"
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMobileMenu}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-silver shadow-inner-surface transition-all hover:border-gold/35 hover:bg-gold/10 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          >
            <X size={18} />
          </button>

          <div className="mx-auto flex min-h-[calc(100svh-6.5rem)] w-full max-w-md flex-col">
            <div className="rounded-3xl border border-gold/25 bg-[linear-gradient(145deg,rgba(217,168,74,0.14),rgba(255,255,255,0.045)_42%,rgba(10,20,46,0.84))] p-4 shadow-panel-soft">
              <p className="text-[11px] uppercase tracking-[0.12em] text-gold">
                The Business Circle
              </p>
              <p className="mt-2 font-display text-2xl leading-tight text-foreground">
                Clearer rooms for serious business owners.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-silver">
                Choose where you want to go next.
              </p>
            </div>

            <nav className="mt-5 flex flex-col gap-2" aria-label="Public mobile navigation">
              {PUBLIC_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-left text-base font-medium text-foreground shadow-inner-surface transition-all hover:border-gold/35 hover:bg-gold/10 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                >
                  <span>{item.label}</span>
                  <span className="h-2 w-2 rounded-full bg-gold/70" aria-hidden="true" />
                </Link>
              ))}
            </nav>

            <div className="mt-auto pt-6">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/dashboard"
                      onClick={closeMobileMenu}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "lg" }),
                        "min-h-12 w-full justify-center border-gold/35 bg-gold/10 text-gold hover:bg-gold/15"
                      )}
                    >
                      Member home
                    </Link>
                    <form action={signOutAction} onSubmit={closeMobileMenu}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="lg"
                        className="min-h-12 w-full justify-center text-silver hover:bg-white/10 hover:text-foreground"
                      >
                        Sign Out
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={closeMobileMenu}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "lg" }),
                        "min-h-12 w-full justify-center border-white/14 bg-white/[0.045] text-silver hover:border-gold/35 hover:bg-white/10 hover:text-foreground"
                      )}
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/"
                      onClick={closeMobileMenu}
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "min-h-12 w-full justify-center bg-gold text-buttonForeground shadow-gold-soft hover:bg-gold/90"
                      )}
                    >
                      Find Your Room
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
