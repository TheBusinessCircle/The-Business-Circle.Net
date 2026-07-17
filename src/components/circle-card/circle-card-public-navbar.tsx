"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

const CIRCLE_CARD_PUBLIC_NAVIGATION = [
  { label: "Home", href: "/" },
  { label: "Pro", href: "/pro" },
  { label: "Teams", href: "/teams" },
  { label: "Community Standards", href: "/community-standards" }
] as const;

type CircleCardPublicNavbarProps = {
  isAuthenticated: boolean;
};

function AccountActions({
  isAuthenticated,
  onNavigate
}: CircleCardPublicNavbarProps & { onNavigate?: () => void }) {
  if (isAuthenticated) {
    return (
      <>
        <Link
          href="/app"
          onClick={onNavigate}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Open app
        </Link>
        <form action={signOutAction} onSubmit={onNavigate}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link
        href="/login?from=%2Fapp"
        onClick={onNavigate}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Log in
      </Link>
      <Link
        href="/register?source=circle-card&returnTo=%2Fapp%2Fonboarding"
        onClick={onNavigate}
        className={buttonVariants({ size: "sm" })}
      >
        Create your card
      </Link>
    </>
  );
}

export function CircleCardPublicNavbar({ isAuthenticated }: CircleCardPublicNavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="bcn-container-wide flex h-[4.75rem] items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Circle Card home">
            <BrandMark placement="navbar" brand="circle-card" priority />
            <div className="min-w-0">
              <p className="truncate font-display text-base text-foreground">Circle Card</p>
              <p className="hidden text-[10px] uppercase tracking-[0.12em] text-muted sm:block">
                Your professional identity
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Circle Card navigation">
            {CIRCLE_CARD_PUBLIC_NAVIGATION.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-accent/70 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <AccountActions isAuthenticated={isAuthenticated} />
          </div>

          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="circle-card-mobile-navigation"
            aria-label={mobileMenuOpen ? "Close Circle Card navigation" : "Open Circle Card navigation"}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/80 bg-card/70 text-silver lg:hidden"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div
          id="circle-card-mobile-navigation"
          className="fixed inset-0 z-[110] overflow-y-auto bg-background/98 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(5.5rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden"
        >
          <button
            type="button"
            aria-label="Close Circle Card navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-silver"
          >
            <X size={20} />
          </button>
          <div className="mx-auto flex min-h-[calc(100svh-7rem)] w-full max-w-md flex-col">
            <div className="flex items-center gap-3 rounded-3xl border border-gold/25 bg-gold/10 p-4">
              <BrandMark placement="workspace" brand="circle-card" />
              <div>
                <p className="font-display text-xl text-foreground">Circle Card</p>
                <p className="text-sm text-muted">Your card, wallet and relationship tools.</p>
              </div>
            </div>
            <nav className="mt-5 grid gap-2" aria-label="Circle Card mobile navigation">
              {CIRCLE_CARD_PUBLIC_NAVIGATION.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="flex min-h-14 items-center rounded-2xl border border-border/80 bg-card/65 px-4 text-base text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className={cn("mt-auto grid gap-2 pt-6", isAuthenticated && "grid-cols-2")}>
              <AccountActions
                isAuthenticated={isAuthenticated}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
