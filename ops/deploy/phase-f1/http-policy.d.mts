export const OWNER_ROUTE_VARIANTS: readonly string[];
export const OWNER_ROUTE_METHODS: readonly string[];
export function assertOwnerRouteDenial(response: { status: number; location: string | null }, method: string, path: string): true;
export function assertUncachedPublicResponse(headers: Headers): string;
export function isCircleOwnerRequestTarget(target: string): boolean;
export function expectedCircleHttpStatusClass(method: string, target: string): number;
