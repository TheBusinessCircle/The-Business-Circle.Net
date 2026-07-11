import { safeRedirectPath } from "@/lib/auth/utils";

export type FirstCircleCardSource = {
  source: "spin" | "circle-card";
  sourceCardSlug: string | null;
  returnTo: string | null;
};

function metadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export function readFirstCircleCardSource(metadata: unknown): FirstCircleCardSource {
  const sourceCardSlug = metadataString(metadata, "sourceCardSlug").toLowerCase();
  const candidate = safeRedirectPath(metadataString(metadata, "returnTo"), "");
  const expectedPrefix = sourceCardSlug ? `/card/${sourceCardSlug}` : "";
  const returnTo =
    expectedPrefix &&
    (candidate === expectedPrefix || candidate.startsWith(`${expectedPrefix}?`)) &&
    new URL(candidate, "http://internal.local").searchParams.get("spin") === "return"
      ? candidate
      : null;

  return {
    source: returnTo ? "spin" : "circle-card",
    sourceCardSlug: returnTo ? sourceCardSlug : null,
    returnTo
  };
}
