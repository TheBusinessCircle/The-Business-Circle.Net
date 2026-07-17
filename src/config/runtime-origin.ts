import {
  getRuntimeBrand,
  InvalidRuntimeBrandError,
  type RuntimeBrandConfig
} from "@/config/runtime-brand";

export type RuntimeOriginEnvironment = {
  APP_BRAND?: string;
  APP_URL?: string;
  AUTH_URL?: string;
  NEXTAUTH_URL?: string;
  NODE_ENV?: string;
};

function processRuntimeOriginEnvironment(): RuntimeOriginEnvironment {
  return {
    APP_BRAND: process.env.APP_BRAND,
    APP_URL: process.env.APP_URL,
    AUTH_URL: process.env.AUTH_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV
  };
}

export type RuntimeOriginIssueCode =
  | "invalid-runtime-brand"
  | "missing-app-url"
  | "missing-auth-url"
  | "invalid-url"
  | "origin-brand-mismatch"
  | "configured-url-mismatch";

export type RuntimeOriginIssue = {
  code: RuntimeOriginIssueCode;
  message: string;
  variable?: "APP_URL" | "AUTH_URL" | "NEXTAUTH_URL";
};

type ConfiguredOrigin = {
  variable: "APP_URL" | "AUTH_URL" | "NEXTAUTH_URL";
  origin: string;
};

export type RuntimeOriginValidation = {
  brand: RuntimeBrandConfig | null;
  configuredOrigins: ConfiguredOrigin[];
  issues: RuntimeOriginIssue[];
};

function configuredValue(value: string | undefined): string | null {
  return value?.trim() || null;
}

export function normalizeRuntimeOrigin(value: string): string | null {
  try {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function readConfiguredOrigins(environment: RuntimeOriginEnvironment) {
  const values = [
    ["APP_URL", configuredValue(environment.APP_URL)],
    ["AUTH_URL", configuredValue(environment.AUTH_URL)],
    ["NEXTAUTH_URL", configuredValue(environment.NEXTAUTH_URL)]
  ] as const;
  const configuredOrigins: ConfiguredOrigin[] = [];
  const issues: RuntimeOriginIssue[] = [];

  for (const [variable, value] of values) {
    if (!value) {
      continue;
    }

    const origin = normalizeRuntimeOrigin(value);
    if (!origin) {
      issues.push({
        code: "invalid-url",
        variable,
        message: `${variable} must be an http(s) origin without credentials, a path, query, or fragment.`
      });
      continue;
    }

    configuredOrigins.push({ variable, origin });
  }

  return { configuredOrigins, issues };
}

export function validateRuntimeOriginEnvironment(
  environment: RuntimeOriginEnvironment = processRuntimeOriginEnvironment()
): RuntimeOriginValidation {
  let brand: RuntimeBrandConfig;

  try {
    brand = getRuntimeBrand(environment);
  } catch (error) {
    if (!(error instanceof InvalidRuntimeBrandError)) {
      throw error;
    }

    return {
      brand: null,
      configuredOrigins: [],
      issues: [
        {
          code: "invalid-runtime-brand",
          message: error.message
        }
      ]
    };
  }

  const { configuredOrigins, issues } = readConfiguredOrigins(environment);
  const isProduction = environment.NODE_ENV === "production";
  const hasAppUrl = Boolean(configuredValue(environment.APP_URL));
  const hasAuthUrl = Boolean(
    configuredValue(environment.AUTH_URL) || configuredValue(environment.NEXTAUTH_URL)
  );

  if (isProduction && !hasAppUrl) {
    issues.push({
      code: "missing-app-url",
      variable: "APP_URL",
      message: `APP_URL must be set to ${brand.canonicalOrigin} in production.`
    });
  }

  if (isProduction && !hasAuthUrl) {
    issues.push({
      code: "missing-auth-url",
      message: `AUTH_URL or NEXTAUTH_URL must be set to ${brand.canonicalOrigin} in production.`
    });
  }

  if (isProduction) {
    for (const configuredOrigin of configuredOrigins) {
      if (configuredOrigin.origin !== brand.canonicalOrigin) {
        issues.push({
          code: "origin-brand-mismatch",
          variable: configuredOrigin.variable,
          message: `${configuredOrigin.variable} must be set to ${brand.canonicalOrigin} for APP_BRAND=${brand.key}.`
        });
      }
    }
  }

  const distinctOrigins = new Set(configuredOrigins.map(({ origin }) => origin));
  if (isProduction && distinctOrigins.size > 1) {
    issues.push({
      code: "configured-url-mismatch",
      message: "APP_URL, AUTH_URL and NEXTAUTH_URL must resolve to the same origin when configured together."
    });
  }

  return { brand, configuredOrigins, issues };
}

export function assertValidRuntimeOriginEnvironment(
  environment: RuntimeOriginEnvironment = processRuntimeOriginEnvironment()
): RuntimeOriginValidation {
  const validation = validateRuntimeOriginEnvironment(environment);

  if (validation.issues.length > 0) {
    throw new Error(validation.issues.map(({ message }) => message).join(" "));
  }

  return validation;
}

export function getConfiguredRuntimeBaseUrl(
  environment: RuntimeOriginEnvironment = processRuntimeOriginEnvironment()
): string | null {
  if (environment.NODE_ENV === "production" || configuredValue(environment.APP_BRAND)) {
    const validation = assertValidRuntimeOriginEnvironment(environment);
    return (
      validation.configuredOrigins.find(({ variable }) => variable === "APP_URL")?.origin ??
      validation.configuredOrigins[0]?.origin ??
      null
    );
  }

  // Preserve the existing BCN development default while still ignoring malformed values.
  getRuntimeBrand(environment);
  const { configuredOrigins } = readConfiguredOrigins(environment);
  return (
    configuredOrigins.find(({ variable }) => variable === "APP_URL")?.origin ??
    configuredOrigins.find(({ variable }) => variable === "AUTH_URL")?.origin ??
    configuredOrigins.find(({ variable }) => variable === "NEXTAUTH_URL")?.origin ??
    null
  );
}
