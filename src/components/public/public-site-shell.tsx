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
        <main className="bcn-page-shell relative flex flex-1 flex-col">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
