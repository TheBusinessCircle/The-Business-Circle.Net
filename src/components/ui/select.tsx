import * as React from "react";
import { cn } from "@/lib/utils";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "box-border flex h-11 w-full min-w-0 max-w-full rounded-xl border border-border/90 bg-background/35 px-3 py-2 text-sm text-foreground shadow-inner-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-0",
      className
    )}
    {...props}
  />
));
Select.displayName = "Select";

export { Select };
