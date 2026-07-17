import {
  RUNTIME_BRANDS,
  RUNTIME_BRAND_KEYS,
  getRuntimeBrand,
  type RuntimeBrandConfig,
  type RuntimeBrandKey
} from "@/config/runtime-brand";

export type AuthenticationBrand = Pick<
  RuntimeBrandConfig,
  | "key"
  | "displayName"
  | "legalOperatorName"
  | "canonicalOrigin"
  | "supportEmail"
  | "defaultLoginPath"
  | "defaultAuthenticatedHomePath"
>;

export class InvalidAuthenticationBrandError extends Error {
  constructor(value: unknown) {
    super(
      `Invalid authentication brand ${JSON.stringify(value)}. Expected one of: ${RUNTIME_BRAND_KEYS.join(", ")}.`
    );
    this.name = "InvalidAuthenticationBrandError";
  }
}

export function requireAuthenticationBrand(value: unknown): AuthenticationBrand {
  if (
    typeof value !== "string" ||
    !RUNTIME_BRAND_KEYS.includes(value as RuntimeBrandKey)
  ) {
    throw new InvalidAuthenticationBrandError(value);
  }

  return RUNTIME_BRANDS[value as RuntimeBrandKey];
}

export function getRuntimeAuthenticationBrand(): AuthenticationBrand {
  return requireAuthenticationBrand(getRuntimeBrand().key);
}

export function getStoredUserAuthenticationBrand(
  registrationSource: string | null | undefined
): AuthenticationBrand {
  return requireAuthenticationBrand(
    registrationSource === "circle-card" || registrationSource === "circle-card-spin"
      ? "circle-card"
      : "bcn"
  );
}

export function buildAuthenticationUrl(
  brandKey: RuntimeBrandKey,
  pathname: string,
  searchParams?: Readonly<Record<string, string>>
) {
  const brand = requireAuthenticationBrand(brandKey);

  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(pathname)
  ) {
    throw new Error("Authentication URL paths must be safe application-relative paths.");
  }

  const url = new URL(pathname, brand.canonicalOrigin);
  if (url.origin !== brand.canonicalOrigin) {
    throw new Error("Authentication URL origin did not match the declared brand.");
  }

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}
