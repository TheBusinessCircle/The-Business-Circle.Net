import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "input-surface field-shell flex h-11 w-full rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-0",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
