import { ReactNode } from "react";
import { Footer } from "@/components/public/footer";
import { Navbar } from "@/components/public/navbar";

export function PublicSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <Navbar />
      <div className="page-surface page-surface-public relative flex flex-1 flex-col overflow-x-clip transition-colors duration-200">
        <div className="page-surface-premium-glow pointer-events-none absolute inset-0 -z-10 bg-radial-premium" />
        <div className="page-surface-premium-top pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-gold/10 via-gold/4 to-transparent" />
        <main className="relative mx-auto flex w-full max-w-7xl min-w-0 flex-1 overflow-x-clip px-4 pb-14 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pb-20 lg:pt-10">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
