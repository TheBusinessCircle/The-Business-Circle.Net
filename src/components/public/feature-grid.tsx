import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FeatureGridItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type FeatureGridProps = {
  items: FeatureGridItem[];
  className?: string;
  columns?: 2 | 3 | 4;
};

const GRID_COLUMNS: Record<NonNullable<FeatureGridProps["columns"]>, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4"
};

export function FeatureGrid({ items, className, columns = 3 }: FeatureGridProps) {
  return (
    <div className={cn("grid gap-6 lg:gap-7", GRID_COLUMNS[columns], className)}>
      {items.map((item) => (
        <Card key={item.title} className="interactive-card group border-border/80 bg-card/60">
          <CardHeader className="space-y-4 p-6 lg:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gold/35 bg-gold/10 text-gold">
              <item.icon size={18} />
            </span>
            <CardTitle className="text-xl text-silver">{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 lg:px-8 lg:pb-8">
            <p className="text-base leading-relaxed text-white/75">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
