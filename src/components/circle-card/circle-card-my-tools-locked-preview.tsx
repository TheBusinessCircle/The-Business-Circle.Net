import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, LockKeyhole, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CircleCardPageHeader } from "@/components/circle-card/circle-card-page-header";
import { cn } from "@/lib/utils";

const PREVIEW = [
  {
    heading: "Creator Tools",
    icon: Sparkles,
    tools: ["Featured Content", "Live Media Kit", "Brand Partnerships", "Creator Offers"]
  },
  {
    heading: "Business Tools",
    icon: BriefcaseBusiness,
    tools: ["Services", "Products", "Gallery & Portfolio", "Booking & Enquiries"]
  }
] as const;

/**
 * A deliberately static, non-interactive Free preview. Never renders a
 * customer card, a save form, a real editor link or privately saved tools.
 * All real data and mutation routes are gated separately on the server.
 */
export function CircleCardMyToolsLockedPreview() {
  return (
    <main className="page-shell space-y-5 pb-16 pt-4 sm:pt-6">
      <Link href="/dashboard/circle-card"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> Back to Circle Card
      </Link>

      <CircleCardPageHeader
        title="My Tools"
        icon={<Wrench size={20} />}
        description="Your personal collection of Creator and Business tools."
        badge={<Badge variant="premium">Pro only</Badge>}
      >
        Discover what your card could do with Pro. Your free Circle Card, QR code,
        unlimited standard links, Circle Wallet and card scanner remain available.
      </CircleCardPageHeader>

      <section aria-label="My Tools Pro preview, locked"
        className="relative isolate overflow-hidden rounded-[1.8rem] border border-gold/25 bg-card/70">
        <div aria-hidden="true"
          className="pointer-events-none grid select-none gap-3 p-4 opacity-30 blur-[2px] sm:grid-cols-2 sm:p-6">
          {PREVIEW.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.heading}
                className="min-h-[310px] space-y-4 rounded-2xl border border-silver/16 bg-background/35 p-4 sm:min-h-[360px]">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Icon size={20} /> {category.heading}
                </div>
                <div className="grid gap-3">
                  {category.tools.map((tool) => (
                    <div key={tool} className="rounded-xl border border-silver/15 bg-card/70 p-4">
                      <div className="h-2 w-2/5 rounded-full bg-gold/40" />
                      <p className="mt-3 text-sm font-semibold text-foreground">{tool}</p>
                      <div className="mt-3 h-2 w-2/3 rounded-full bg-silver/15" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute inset-0 z-10 grid place-items-center bg-[linear-gradient(180deg,rgba(3,9,20,0.12)_0%,rgba(3,9,20,0.56)_50%,rgba(3,9,20,0.82)_100%)] p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-gold/35 bg-[#0c1528]/95 p-5 text-center shadow-2xl backdrop-blur-lg sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/35 bg-gold/15 text-gold">
              <LockKeyhole size={27} aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-gold">Available with Pro</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">
              Unlock My Tools
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-silver">
              Choose from Creator and Business categories, mix your favourite tools
              and grow beyond a standard digital card.
            </p>
            <p className="mt-5 font-display text-2xl font-semibold text-foreground">
              £9.99 <span className="text-sm font-normal text-muted">per month</span>
            </p>
            <Link href="/circle-card/pro"
              className={cn(buttonVariants({ variant: "default", size: "lg" }),
                "mt-4 inline-flex w-full max-w-xs items-center justify-center gap-2")}>
              Explore Circle Card Pro <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <p className="mt-3 text-xs text-muted">
              Some additional tools are still being improved and will be released in stages.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
