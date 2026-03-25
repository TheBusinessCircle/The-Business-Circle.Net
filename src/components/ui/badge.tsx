import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.06em] uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/35 bg-primary/16 text-primary",
        secondary: "border-accent/70 bg-accent text-foreground",
        outline: "border-border/85 bg-background/30 text-foreground",
        muted: "border-silver/20 bg-silver/10 text-silver",
        foundation: "border-foundation/35 bg-foundation/14 text-foundation",
        innerCircle: "border-silver/24 bg-silver/12 text-silver",
        core: "border-gold/40 bg-gold/14 text-gold",
        premium: "border-gold/40 bg-gold/14 text-gold",
        success: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
        danger: "border-red-500/40 bg-red-500/12 text-red-200",
        warning: "border-amber-500/40 bg-amber-500/12 text-amber-200"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
