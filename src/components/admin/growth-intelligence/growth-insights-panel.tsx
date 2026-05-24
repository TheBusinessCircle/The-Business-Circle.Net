import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function GrowthInsightsPanel({ insights }: { insights: string[] }) {
  return (
    <Card className="border-gold/28 bg-gradient-to-br from-gold/10 via-card/76 to-card/68">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Lightbulb size={18} className="text-gold" />
          Insights Panel
        </CardTitle>
        <CardDescription>Deterministic admin-only observations from first-party signals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((insight) => (
          <p key={insight} className="rounded-2xl border border-gold/18 bg-background/24 p-4 text-sm leading-relaxed text-silver">
            {insight}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
