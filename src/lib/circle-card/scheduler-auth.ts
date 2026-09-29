import "server-only";

import { timingSafeEqual } from "node:crypto";
import { getRuntimeBrand } from "@/config/runtime-brand";

export type CircleCardSchedulerAuthorization =
  | "authorized"
  | "invalid-runtime-brand"
  | "not-configured"
  | "unauthorized";

const MINIMUM_SCHEDULER_SECRET_LENGTH = 24;

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function bearerCredential(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  const match = authorization?.match(/^Bearer ([^\s,]+)$/);

  return match?.[1] ?? null;
}

export function authorizeCircleCardSchedulerRequest(
  request: Request,
  environment: { APP_BRAND?: string; CIRCLE_CARD_SCHEDULER_SECRET?: string } = {
    APP_BRAND: process.env.APP_BRAND,
    CIRCLE_CARD_SCHEDULER_SECRET: process.env.CIRCLE_CARD_SCHEDULER_SECRET
  }
): CircleCardSchedulerAuthorization {
  try {
    if (getRuntimeBrand(environment).key !== "circle-card") {
      return "invalid-runtime-brand";
    }
  } catch {
    return "invalid-runtime-brand";
  }

  const configuredSecret = environment.CIRCLE_CARD_SCHEDULER_SECRET?.trim() ?? "";
  if (configuredSecret.length < MINIMUM_SCHEDULER_SECRET_LENGTH) {
    return "not-configured";
  }

  const candidate = bearerCredential(request);
  if (!candidate || !secureEqual(candidate, configuredSecret)) {
    return "unauthorized";
  }

  return "authorized";
}
