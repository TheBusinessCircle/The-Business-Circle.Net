import Link from "next/link";
import { Menu } from "lucide-react";
import { auth } from "@/auth";
import { BackgroundModeToggle } from "@/components/background-mode/background-mode-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { NavbarBrand } from "@/components/public/navbar-brand";
import { PUBLIC_NAV } from "@/lib/constants";
import { signOutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

function NavigationLinks() {
  return (
    <>
      {PUBLIC_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-lg px-3 py-2 text-sm text-muted transition-all hover:bg-background/50 hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 overflow-x-clip border-b border-border/80 bg-background/78 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.75rem] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-[5.5rem] sm:gap-6 sm:px-6 lg:px-8">
        <NavbarBrand />

        <nav className="hidden min-w-0 items-center gap-1 rounded-xl border border-border/70 bg-card/55 p-1 lg:flex">
          <NavigationLinks />
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <BackgroundModeToggle />
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Dashboard
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
                Login
              </Link>
              <Link href="/membership" className={buttonVariants({ size: "sm" })}>
                Find Your Room
              </Link>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <BackgroundModeToggle showLabel={false} />
          <details className="relative [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-border bg-card/65 text-silver">
              <span className="sr-only">Toggle navigation</span>
              <Menu size={18} />
            </summary>
            <div className="absolute right-0 top-12 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/90 bg-background/95 p-3 shadow-panel backdrop-blur">
              <nav className="flex flex-col gap-1">
                <NavigationLinks />
              </nav>
              <div className="gold-divider my-3" />
              <BackgroundModeToggle fullWidth />
              <div className="mt-3 flex flex-col gap-2">
                {session?.user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "w-full justify-center"
                      )}
                    >
                      Dashboard
                    </Link>
                    <form action={signOutAction}>
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
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "w-full justify-center"
                      )}
                    >
                      Login
                    </Link>
                    <Link
                      href="/membership"
                      className={cn(buttonVariants({ size: "sm" }), "w-full justify-center")}
                    >
                      Find Your Room
                    </Link>
                  </>
                )}
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
