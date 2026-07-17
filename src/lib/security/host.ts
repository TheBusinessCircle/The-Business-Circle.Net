import {
  getAllowedProductionHostnames,
  getRuntimeBrand,
  InvalidRuntimeBrandError,
  type RuntimeBrandKey
} from "@/config/runtime-brand";

type HostValidationEnvironment = {
  APP_BRAND?: string;
  NODE_ENV?: string;
};

function processHostValidationEnvironment(): HostValidationEnvironment {
  return {
    APP_BRAND: process.env.APP_BRAND,
    NODE_ENV: process.env.NODE_ENV
  };
}

type RequestHostSource = Pick<Request, "headers" | "url">;

type ParsedHostAuthority = {
  hostname: string;
  port: string | null;
};

export type RuntimeHostValidation =
  | {
      ok: true;
      hostname: string;
      runtimeBrand: RuntimeBrandKey;
    }
  | {
      ok: false;
      reason:
        | "invalid-runtime-brand"
        | "missing-host"
        | "malformed-host"
        | "untrusted-host"
        | "forwarded-host-mismatch";
    };

const LOCAL_DEVELOPMENT_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "host.docker.internal"
]);

const BRAND_DEVELOPMENT_HOSTNAMES: Readonly<Record<RuntimeBrandKey, ReadonlySet<string>>> = {
  bcn: new Set(["bcn.test", "thebusinesscircle.local"]),
  "circle-card": new Set(["circle-card.test", "circlecard.local"])
};

function parseHostAuthority(hostValue: string): ParsedHostAuthority | null {
  if (hostValue !== hostValue.trim()) {
    return null;
  }

  const normalized = hostValue.toLowerCase();

  if (
    !normalized ||
    normalized.includes(",") ||
    normalized.includes("/") ||
    normalized.includes("\\") ||
    normalized.includes("@") ||
    /\s/.test(normalized)
  ) {
    return null;
  }

  const ipv6Match = normalized.match(/^\[([0-9a-f:.]+)\](?::(\d+))?$/);
  const hostnameMatch = normalized.match(/^([a-z0-9.-]+)(?::(\d+))?$/);
  const match = ipv6Match ?? hostnameMatch;

  if (!match) {
    return null;
  }

  const rawHostname = match[1];
  const rawPort = match[2] ?? null;
  const portNumber = rawPort === null ? null : Number(rawPort);

  if (
    portNumber !== null &&
    (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65_535)
  ) {
    return null;
  }

  try {
    const hostname = new URL(`http://${ipv6Match ? `[${rawHostname}]` : rawHostname}`)
      .hostname.toLowerCase();
    const normalizedHostname = hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;

    return {
      hostname: normalizedHostname,
      port: portNumber === null ? null : String(portNumber)
    };
  } catch {
    return null;
  }
}

function hostAuthorityFromRequestUrl(requestUrl: string): ParsedHostAuthority | null {
  try {
    return parseHostAuthority(new URL(requestUrl).host);
  } catch {
    return null;
  }
}

function sameHostAuthority(left: ParsedHostAuthority, right: ParsedHostAuthority) {
  return left.hostname === right.hostname && left.port === right.port;
}

export function validateRuntimeRequestHost(
  request: RequestHostSource,
  environment: HostValidationEnvironment = processHostValidationEnvironment()
): RuntimeHostValidation {
  let runtimeBrand;

  try {
    runtimeBrand = getRuntimeBrand(environment);
  } catch (error) {
    if (error instanceof InvalidRuntimeBrandError) {
      return { ok: false, reason: "invalid-runtime-brand" };
    }
    throw error;
  }

  const hostHeader = request.headers.get("host");
  const isProduction = environment.NODE_ENV === "production";

  if (!hostHeader && isProduction) {
    return { ok: false, reason: "missing-host" };
  }

  const hostAuthority = hostHeader
    ? parseHostAuthority(hostHeader)
    : hostAuthorityFromRequestUrl(request.url);

  if (!hostAuthority) {
    return { ok: false, reason: hostHeader ? "malformed-host" : "missing-host" };
  }

  const forwardedHostHeader = request.headers.get("x-forwarded-host");
  if (forwardedHostHeader) {
    const forwardedHostAuthority = parseHostAuthority(forwardedHostHeader);

    // X-Forwarded-Host is never authoritative. When a proxy supplies it, it must
    // be a single, valid value that agrees with the validated Host header.
    if (
      !forwardedHostAuthority ||
      !sameHostAuthority(forwardedHostAuthority, hostAuthority)
    ) {
      return { ok: false, reason: "forwarded-host-mismatch" };
    }
  }

  const allowedProductionHostnames = getAllowedProductionHostnames(runtimeBrand);
  const isAllowed = isProduction
    ? allowedProductionHostnames.has(hostAuthority.hostname) &&
      (hostAuthority.port === null || hostAuthority.port === "443")
    : allowedProductionHostnames.has(hostAuthority.hostname) ||
      LOCAL_DEVELOPMENT_HOSTNAMES.has(hostAuthority.hostname) ||
      BRAND_DEVELOPMENT_HOSTNAMES[runtimeBrand.key].has(hostAuthority.hostname);

  if (!isAllowed) {
    return { ok: false, reason: "untrusted-host" };
  }

  return {
    ok: true,
    hostname: hostAuthority.hostname,
    runtimeBrand: runtimeBrand.key
  };
}

export function isTrustedRuntimeRequestHost(
  request: RequestHostSource,
  environment: HostValidationEnvironment = processHostValidationEnvironment()
): boolean {
  return validateRuntimeRequestHost(request, environment).ok;
}
