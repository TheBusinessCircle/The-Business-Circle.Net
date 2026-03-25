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
        "flex flex-col gap-4",
        isCentered ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {label ? (
        <p className="premium-kicker">
          {label}
        </p>
      ) : null}
      <div className={cn("space-y-3", isCentered ? "max-w-3xl" : "max-w-2xl")}>
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">{title}</h2>
        {description ? <p className="text-base leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
