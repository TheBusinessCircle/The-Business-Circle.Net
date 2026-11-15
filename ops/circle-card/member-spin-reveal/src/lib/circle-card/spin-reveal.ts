const REVEAL_PARAM = "reveal";
const REVEAL_VALUE = "spin";

export function isCircleCardSpinRevealEnabled(contentBlocks: unknown): boolean {
  return typeof contentBlocks === "object" && contentBlocks !== null &&
    "spinRevealEnabled" in contentBlocks && contentBlocks.spinRevealEnabled === true;
}

export function createCircleCardSpinRevealUrl(publicUrl: string): string {
  const url = new URL(publicUrl);
  url.searchParams.set(REVEAL_PARAM, REVEAL_VALUE);
  return url.toString();
}

export function getCircleCardSpinRevealDestination(
  slug: string,
  searchParams: Record<string, string | string[] | undefined>,
  enabled: boolean
): string | null {
  if (!enabled || searchParams[REVEAL_PARAM] !== REVEAL_VALUE) return null;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === REVEAL_PARAM || value === undefined) continue;
    for (const item of typeof value === "string" ? [value] : value) {
      params.append(key, item);
    }
  }

  const query = params.toString();
  return `/card/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}
