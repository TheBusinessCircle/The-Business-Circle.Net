import { getBaseUrl } from "@/lib/utils";

export function resolveEmailAssetUrl(path: string) {
  return new URL(path, getBaseUrl()).toString();
}
