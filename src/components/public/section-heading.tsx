import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  action?: ReactNode;
};

export function SectionHeading({
  label,
  title,
  description,
  align = "left",
  className,
  action
}: SectionHeadingProps) {
  const isCentered = align === "center";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4 sm:gap-5",
        isCentered ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {label ? (
        <p className="premium-kicker max-w-fit">
          {label}
        </p>
      ) : null}
      <div className={cn("min-w-0 space-y-4 sm:space-y-5", isCentered ? "max-w-4xl" : "max-w-[48rem]")}>
        <h2 className="font-display text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.02] tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-lg leading-relaxed text-white/80">{description}</p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
