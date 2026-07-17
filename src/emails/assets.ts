import { RUNTIME_BRANDS, type RuntimeBrandKey } from "@/config/runtime-brand";

export function resolveEmailAssetUrl(path: string, brand: RuntimeBrandKey) {
  return new URL(path, RUNTIME_BRANDS[brand].canonicalOrigin).toString();
}
