export const COOKIE_CONSENT_COOKIE_NAME = "bc_cookie_consent";
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const COOKIE_SETTINGS_OPEN_EVENT = "business-circle:cookie-settings-open";

const COOKIE_CONSENT_VERSION = "v1";

export type CookieConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

export type OptionalCookieConsentCategory = Exclude<keyof CookieConsentState, "necessary">;

export const DEFAULT_COOKIE_CONSENT: CookieConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false
};

export const ACCEPT_ALL_COOKIE_CONSENT: CookieConsentState = {
  necessary: true,
  analytics: true,
  marketing: true,
  preferences: true
};

export function normalizeCookieConsent(
  consent?: Partial<CookieConsentState> | null
): CookieConsentState {
  return {
    necessary: true,
    analytics: Boolean(consent?.analytics),
    marketing: Boolean(consent?.marketing),
    preferences: Boolean(consent?.preferences)
  };
}

export function serializeCookieConsentValue(consent: Partial<CookieConsentState>): string {
  const normalized = normalizeCookieConsent(consent);

  return [
    COOKIE_CONSENT_VERSION,
    "n:1",
    `a:${normalized.analytics ? 1 : 0}`,
    `m:${normalized.marketing ? 1 : 0}`,
    `p:${normalized.preferences ? 1 : 0}`
  ].join("|");
}

export function parseCookieConsentValue(value?: string | null): CookieConsentState | null {
  if (!value) {
    return null;
  }

  let decodedValue = value;

  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    decodedValue = value;
  }

  const parts = decodedValue.split("|");

  if (parts[0] !== COOKIE_CONSENT_VERSION) {
    return null;
  }

  const entries = new Map<string, string>();

  parts.slice(1).forEach((part) => {
    const [key, rawValue] = part.split(":");

    if (key && rawValue) {
      entries.set(key, rawValue);
    }
  });

  if (!entries.has("a") || !entries.has("m") || !entries.has("p")) {
    return null;
  }

  return normalizeCookieConsent({
    analytics: entries.get("a") === "1",
    marketing: entries.get("m") === "1",
    preferences: entries.get("p") === "1"
  });
}

export function readNamedCookieValue(
  cookieString: string | null | undefined,
  name = COOKIE_CONSENT_COOKIE_NAME
): string | null {
  if (!cookieString) {
    return null;
  }

  const prefix = `${name}=`;
  const match = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return match ? match.slice(prefix.length) : null;
}

export function parseCookieConsentFromCookieString(
  cookieString: string | null | undefined
): CookieConsentState | null {
  return parseCookieConsentValue(readNamedCookieValue(cookieString));
}

export function hasConsentForCategory(
  consent: CookieConsentState | null | undefined,
  category: keyof CookieConsentState
): boolean {
  if (category === "necessary") {
    return true;
  }

  return Boolean(consent?.[category]);
}
