import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn-base inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 disabled:saturate-[0.88]",
  {
    variants: {
      variant: {
        default:
          "btn-default bg-primary text-buttonForeground shadow-gold-soft hover:-translate-y-0.5 hover:bg-primary/90",
        foundation:
          "btn-foundation bg-foundation text-buttonForeground shadow-foundation-soft hover:-translate-y-0.5 hover:bg-foundation/88",
        innerCircle:
          "btn-innerCircle border border-silver/24 bg-gradient-to-b from-silver/18 to-silver/10 text-silver shadow-silver-soft hover:-translate-y-0.5 hover:border-silver/34 hover:from-silver/22 hover:to-silver/14",
        core:
          "btn-core bg-gold text-buttonForeground shadow-gold-soft hover:-translate-y-0.5 hover:bg-gold/90",
        secondary:
          "btn-secondary bg-accent text-foreground shadow-inner-surface hover:-translate-y-0.5 hover:bg-accent/85",
        ghost: "btn-ghost bg-transparent text-foreground hover:bg-accent/70",
        outline:
          "btn-outline border border-border/90 bg-background/30 text-foreground hover:-translate-y-0.5 hover:border-gold/35 hover:bg-background/50",
        danger:
          "btn-danger bg-destructive/92 text-destructiveForeground hover:-translate-y-0.5 hover:bg-destructive"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-sm",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
