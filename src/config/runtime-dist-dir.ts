import type { RuntimeBrandKey } from "@/config/runtime-brand";

export const RUNTIME_DIST_DIRS: Record<RuntimeBrandKey, string> = {
  bcn: ".runtime/bcn",
  "circle-card": ".runtime/circle-card"
};

type RuntimeDistEnvironment = {
  APP_BRAND?: string;
  NEXT_RUNTIME_DIST_DIR?: string;
};

export function resolveNextDistDir(
  environment: RuntimeDistEnvironment = {
    APP_BRAND: process.env.APP_BRAND,
    NEXT_RUNTIME_DIST_DIR: process.env.NEXT_RUNTIME_DIST_DIR
  }
) {
  const configured = environment.NEXT_RUNTIME_DIST_DIR?.trim();
  if (!configured) return ".next";

  const brand = environment.APP_BRAND?.trim();
  if (brand !== "bcn" && brand !== "circle-card") {
    throw new Error("NEXT_RUNTIME_DIST_DIR requires an explicit valid APP_BRAND.");
  }

  const expected = RUNTIME_DIST_DIRS[brand];
  if (configured !== expected) {
    throw new Error(`NEXT_RUNTIME_DIST_DIR must be ${expected} for APP_BRAND=${brand}.`);
  }

  return configured;
}
