import "server-only";

import { randomUUID } from "node:crypto";
import { logServerInfo } from "@/lib/security/logging";

export type CircleCardDurationBucket = "under_250ms" | "250_749ms" | "750_1499ms" | "1500ms_plus";

export function circleCardDurationBucket(durationMs: number): CircleCardDurationBucket {
  if (durationMs < 250) return "under_250ms";
  if (durationMs < 750) return "250_749ms";
  if (durationMs < 1500) return "750_1499ms";
  return "1500ms_plus";
}

function safeCorrelationId(value?: string | null) {
  return value && /^[a-z0-9._:-]{8,100}$/i.test(value) ? value : randomUUID();
}

export async function measureCircleCardAction<T>(
  action: string,
  operation: (correlationId: string) => Promise<T>,
  requestedCorrelationId?: string | null
) {
  const correlationId = safeCorrelationId(requestedCorrelationId);
  const startedAt = performance.now();
  let success = false;

  try {
    const result = await operation(correlationId);
    success = result instanceof Response ? result.ok : true;
    return result;
  } finally {
    logServerInfo("circle-card-action-performance", {
      action,
      durationBucket: circleCardDurationBucket(performance.now() - startedAt),
      success,
      correlationId
    });
  }
}
