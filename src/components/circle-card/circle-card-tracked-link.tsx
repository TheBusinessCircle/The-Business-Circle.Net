"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";
import type { CircleCardEventTypeValue } from "@/lib/circle-card/analytics-events";
import { trackCircleCardEvent } from "@/lib/circle-card/analytics-client";

type CircleCardTrackedLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  cardId: string;
  eventType: CircleCardEventTypeValue;
  metadata?: Record<string, unknown> | null;
};

export function CircleCardTrackedLink({
  cardId,
  eventType,
  metadata,
  onClick,
  ...props
}: CircleCardTrackedLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (cardId) {
      trackCircleCardEvent({
        cardId,
        eventType,
        metadata
      });
    }
    onClick?.(event);
  }

  return <a {...props} onClick={handleClick} />;
}
