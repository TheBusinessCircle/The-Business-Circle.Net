import { ReactNode } from "react";
import { Footer } from "@/components/public/footer";
import { Navbar } from "@/components/public/navbar";

export function PublicSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-premium" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-52 bg-gradient-to-b from-gold/8 to-transparent" />
      <Navbar />
      <main className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-16 lg:pt-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
