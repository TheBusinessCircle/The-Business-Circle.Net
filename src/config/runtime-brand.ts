import { COMPANY_CONFIG } from "@/config/company";

export const RUNTIME_BRAND_KEYS = ["bcn", "circle-card"] as const;

export type RuntimeBrandKey = (typeof RUNTIME_BRAND_KEYS)[number];

export type RuntimeBrandAssetIdentity = {
  logoPath: string;
  iconPath: string;
  appleTouchIconPath: string;
};

export type RuntimeBrandWwwHostnamePolicy = {
  hostname: string;
  behavior: "allow" | "redirect-to-canonical";
};

export type RuntimeBrandConfig = {
  key: RuntimeBrandKey;
  displayName: string;
  legalOperatorName: string;
  canonicalOrigin: `https://${string}`;
  canonicalHostname: string;
  wwwHostnamePolicy: RuntimeBrandWwwHostnamePolicy | null;
  supportEmail: string;
  defaultLoginPath: `/${string}`;
  defaultAuthenticatedHomePath: `/${string}`;
  publicContactEmail: string;
  assets: RuntimeBrandAssetIdentity;
};

export const RUNTIME_BRANDS: Readonly<Record<RuntimeBrandKey, RuntimeBrandConfig>> = {
  bcn: {
    key: "bcn",
    displayName: "The Business Circle Network",
    legalOperatorName: COMPANY_CONFIG.displayLegalName,
    canonicalOrigin: "https://thebusinesscircle.net",
    canonicalHostname: "thebusinesscircle.net",
    wwwHostnamePolicy: {
      hostname: "www.thebusinesscircle.net",
      behavior: "redirect-to-canonical"
    },
    supportEmail: "contact@thebusinesscircle.net",
    defaultLoginPath: "/login",
    defaultAuthenticatedHomePath: "/dashboard",
    publicContactEmail: "contact@thebusinesscircle.net",
    assets: {
      logoPath: "/branding/the-business-circle-logo.png",
      iconPath: "/icon-192.png",
      appleTouchIconPath: "/apple-touch-icon.png"
    }
  },
  "circle-card": {
    key: "circle-card",
    displayName: "Circle Card",
    legalOperatorName: COMPANY_CONFIG.legalName,
    canonicalOrigin: "https://circlecard.co.uk",
    canonicalHostname: "circlecard.co.uk",
    wwwHostnamePolicy: {
      hostname: "www.circlecard.co.uk",
      behavior: "redirect-to-canonical"
    },
    supportEmail: "support@circlecard.co.uk",
    defaultLoginPath: "/login",
    defaultAuthenticatedHomePath: "/app",
    publicContactEmail: "support@circlecard.co.uk",
    assets: {
      logoPath: "/branding/circle-card-logo.png",
      iconPath: "/circle-card-icon-192.png",
      appleTouchIconPath: "/circle-card-apple-touch-icon.png"
    }
  }
};

export class InvalidRuntimeBrandError extends Error {
  constructor(value: string) {
    super(
      `Invalid APP_BRAND value "${value}". Expected one of: ${RUNTIME_BRAND_KEYS.join(", ")}.`
    );
    this.name = "InvalidRuntimeBrandError";
  }
}

export function resolveRuntimeBrandKey(value = process.env.APP_BRAND): RuntimeBrandKey {
  if (value === undefined) {
    return "bcn";
  }

  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    throw new InvalidRuntimeBrandError(value);
  }

  if (RUNTIME_BRAND_KEYS.includes(normalized as RuntimeBrandKey)) {
    return normalized as RuntimeBrandKey;
  }

  throw new InvalidRuntimeBrandError(normalized);
}

export function getRuntimeBrand(
  environment: { APP_BRAND?: string } = { APP_BRAND: process.env.APP_BRAND }
): RuntimeBrandConfig {
  return RUNTIME_BRANDS[resolveRuntimeBrandKey(environment.APP_BRAND)];
}

export function getAllowedProductionHostnames(brand: RuntimeBrandConfig): ReadonlySet<string> {
  const hostnames = new Set([brand.canonicalHostname]);

  if (brand.wwwHostnamePolicy) {
    hostnames.add(brand.wwwHostnamePolicy.hostname);
  }

  return hostnames;
}
