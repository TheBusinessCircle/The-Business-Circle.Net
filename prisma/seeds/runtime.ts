import { SeedMode } from "./types";

const ALLOWED_MODES: SeedMode[] = ["bootstrap", "demo", "production"];

export function resolveSeedMode(rawMode: string | undefined): SeedMode {
  if (!rawMode) {
    return "bootstrap";
  }

  const normalized = rawMode.trim().toLowerCase() as SeedMode;

  if (ALLOWED_MODES.includes(normalized)) {
    return normalized;
  }

  return "bootstrap";
}

export function isTruthy(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}