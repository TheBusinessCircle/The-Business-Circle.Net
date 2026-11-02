export type PreparedCardSample = "free" | "pro" | "custom";
export type CircleCardPresentation = "standard" | "custom";

/** Custom is a presentation of the existing Pro sample, never a billing plan. */
export function resolvePreparedCardSample(input: {
  plan?: string | null;
  presentation?: string | null;
  hasCustomPresentation: boolean;
}): { sample: PreparedCardSample; plan: "free" | "pro"; presentation: CircleCardPresentation } {
  const plan = input.plan === "pro" ? "pro" : "free";
  const custom = input.hasCustomPresentation && plan === "pro" && input.presentation === "custom";
  return { plan, sample: custom ? "custom" : plan, presentation: custom ? "custom" : "standard" };
}

export function preparedCardSampleHrefs(previewHref: string) {
  // Only a caller-provided same-origin prepared-preview path is accepted.
  if (!/^\/app\/prepared\/[^/?#]+\/preview(?:\?[^#]*)?$/.test(previewHref)) {
    throw new Error("Expected a prepared-card preview path");
  }
  const source = new URL(previewHref, "https://circlecard.invalid");
  const href = (plan: "free" | "pro", presentation: CircleCardPresentation) => {
    const url = new URL(source);
    url.searchParams.set("plan", plan);
    if (presentation === "custom") url.searchParams.set("presentation", "custom");
    else url.searchParams.delete("presentation");
    return `${url.pathname}${url.search}`;
  };
  return { free: href("free", "standard"), pro: href("pro", "standard"), custom: href("pro", "custom") };
}
