export const CIRCLE_CARD_CURRENT_CARD_STORAGE_KEY = "circle-card.workspace.current-card-id.v1";
export const CIRCLE_CARD_CURRENT_CARD_COOKIE = "circle_card_workspace_card";

const CARD_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const LEGACY_SESSION_STORAGE_KEY = "circle-card.dashboard.current-card-id";

export function normalizeCircleCardCurrentCardId(value: unknown) {
  if (typeof value !== "string") return null;
  const cardId = value.trim();
  return CARD_ID_PATTERN.test(cardId) ? cardId : null;
}

export function readCircleCardCurrentCardPreference() {
  try {
    const stored = normalizeCircleCardCurrentCardId(
      window.localStorage.getItem(CIRCLE_CARD_CURRENT_CARD_STORAGE_KEY)
    );
    if (stored) return stored;

    const legacy = normalizeCircleCardCurrentCardId(
      window.sessionStorage.getItem(LEGACY_SESSION_STORAGE_KEY)
    );
    if (legacy) persistCircleCardCurrentCardPreference(legacy);
    return legacy;
  } catch {
    return null;
  }
}

export function persistCircleCardCurrentCardPreference(cardId: string) {
  const normalized = normalizeCircleCardCurrentCardId(cardId);
  if (!normalized) return;

  try {
    window.localStorage.setItem(CIRCLE_CARD_CURRENT_CARD_STORAGE_KEY, normalized);
  } catch {
    // Storage may be unavailable in hardened browsers; the scoped cookie remains a fallback.
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CIRCLE_CARD_CURRENT_CARD_COOKIE}=${encodeURIComponent(normalized)}; Path=/dashboard/circle-card; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

export function clearCircleCardCurrentCardPreference() {
  try {
    window.localStorage.removeItem(CIRCLE_CARD_CURRENT_CARD_STORAGE_KEY);
  } catch {
    // Keep the cleanup best-effort.
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CIRCLE_CARD_CURRENT_CARD_COOKIE}=; Path=/dashboard/circle-card; Max-Age=0; SameSite=Lax${secure}`;
}
