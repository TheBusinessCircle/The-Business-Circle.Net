import type { RuntimeBrandKey } from "@/config/runtime-brand";
import {
  getRuntimeAuthenticationBrand,
  requireAuthenticationBrand
} from "@/lib/auth/brand";
import { safeAuthenticationRedirectPath } from "@/lib/auth/utils";
import {
  getCircleCardRoutes,
  resolveCircleCardAuthReturnPath
} from "@/lib/circle-card/routes";

type AuthRedirectCallbackInput = {
  url: string;
  baseUrl: string;
};

function relativePathFromCandidate(
  candidate: string,
  canonicalOrigin: string
): string | null {
  if (candidate.startsWith("/")) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.origin !== canonicalOrigin) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function resolveAuthenticationRedirect(
  runtimeBrand: RuntimeBrandKey,
  candidate: string
) {
  const brand = requireAuthenticationBrand(runtimeBrand);
  const relativePath = relativePathFromCandidate(
    candidate,
    brand.canonicalOrigin
  );

  if (!relativePath) {
    return new URL("/", brand.canonicalOrigin).toString();
  }

  const safePath = safeAuthenticationRedirectPath(relativePath, "/");
  const productPath =
    brand.key === "circle-card"
      ? resolveCircleCardAuthReturnPath(
          safePath,
          brand.key,
          getCircleCardRoutes(brand.key).landing
        )
      : safePath;

  return new URL(productPath, brand.canonicalOrigin).toString();
}

export function resolveRuntimeAuthenticationRedirect({
  url
}: AuthRedirectCallbackInput) {
  const brand = getRuntimeAuthenticationBrand();
  return resolveAuthenticationRedirect(brand.key, url);
}
