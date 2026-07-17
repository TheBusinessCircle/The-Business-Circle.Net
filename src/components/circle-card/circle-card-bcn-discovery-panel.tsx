import Link from "next/link";
import { ArrowUpRight, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRuntimeBrand } from "@/components/runtime-brand-provider";

export function CircleCardBcnDiscoveryPanel() {
  const runtimeBrand = useRuntimeBrand();

  if (runtimeBrand === "circle-card") {
    return null;
  }

  return (
    <section className="rounded-2xl border border-primary/24 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--card)/0.72)_48%,hsl(var(--background)/0.62))] p-5 shadow-panel-soft sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/24 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
            <Sparkles size={13} />
            Ecosystem
          </div>
          <h2 className="mt-4 font-display text-3xl text-foreground">
            Powered by The Business Circle
          </h2>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted sm:text-base">
            <p>Circle Card is part of The Business Circle ecosystem.</p>
            <p>
              A private founder-led business environment built to help business owners connect,
              collaborate and grow.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-silver/14 bg-background/24 p-4 lg:min-w-[260px]">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/24 bg-primary/10 text-primary">
            <Building2 size={18} />
          </div>
          <Link href="/home">
            <Button type="button" variant="outline" className="w-full gap-2">
              Explore The Business Circle
              <ArrowUpRight size={16} />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
