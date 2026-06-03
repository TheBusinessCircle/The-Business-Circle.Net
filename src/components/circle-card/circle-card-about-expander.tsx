"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CircleCardAboutExpanderProps = {
  text: string;
  className?: string;
};

export function CircleCardAboutExpander({ text, className }: CircleCardAboutExpanderProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldToggle = text.length > 260;

  return (
    <div className={cn("space-y-3", className)}>
      <p
        className={cn(
          "text-sm leading-relaxed text-muted",
          !expanded && shouldToggle ? "line-clamp-4" : null
        )}
      >
        {text}
      </p>
      {shouldToggle ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-full border-silver/16 bg-white/[0.035] px-3 text-xs text-silver hover:border-gold/30 hover:text-foreground"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show Less" : "Read More"}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={cn("ml-1 transition-transform", expanded ? "rotate-180" : null)}
          />
        </Button>
      ) : null}
    </div>
  );
}
