import type { Metadata } from "next";
import { Activity, ShieldCheck, Sparkles } from "lucide-react";
import { IntelligenceControlPanel } from "@/components/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BCN_INTELLIGENCE_CATEGORIES } from "@/lib/bcn-intelligence-sources";
import {
  listBcnIntelligenceItemsForAdmin,
  listBcnIntelligenceSourcesForAdmin
} from "@/server/community/bcn-intelligence-admin.service";

export const metadata: Metadata = {
  title: "BCN Intelligence Admin"
};

export const dynamic = "force-dynamic";

export default async function AdminIntelligencePage() {
  const [sources, items] = await Promise.all([
    listBcnIntelligenceSourcesForAdmin(),
    listBcnIntelligenceItemsForAdmin()
  ]);
  const enabledCount = sources.filter((source) => source.effectiveEnabled).length;
  const healthyCount = sources.filter((source) => source.healthStatus === "healthy").length;
  const lastRefresh = sources
    .map((source) => source.lastFetchAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div className="space-y-6">
      <Card className="border-gold/28 bg-gradient-to-br from-gold/10 via-card/82 to-card/70">
        <CardHeader className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/24 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
            <Sparkles size={13} />
            BCN Intelligence
          </div>
          <CardTitle className="font-display text-3xl">Signal board controls</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-relaxed">
            Manage curated intelligence sources, run a protected refresh, and monitor source health without exposing any controls to members.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck size={15} className="text-gold" />
              Sources enabled
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{enabledCount}</p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Activity size={15} className="text-silver" />
              Healthy sources
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{healthyCount}</p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-sm font-medium text-foreground">Last refresh</p>
            <p className="mt-2 text-sm text-muted">{lastRefresh ?? "Not refreshed yet"}</p>
          </div>
        </CardContent>
      </Card>

      <IntelligenceControlPanel
        categories={[...BCN_INTELLIGENCE_CATEGORIES]}
        items={items}
        sources={sources}
      />
    </div>
  );
}
