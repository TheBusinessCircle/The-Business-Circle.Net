export function assertRuntimeCacheExcluded(root: string): void;
export function createContentManifest(root: string, excluded?: string[]): string;
export function assertBuildWorkspaceInputs(root: string, phase: "fresh" | "post-install" | "post-build"): { ignoredCount: number; allowedPrefixes: string[] };
export function assertApprovedReleaseSymlinks(root: string, options?: { storageTargets?: Record<string, string> }): unknown[];
export function createReleaseManifest(root: string, options?: { storageTargets?: Record<string, string> }): string;
export function verifyReleaseManifest(root: string, manifest: string, options?: { storageTargets?: Record<string, string> }): string;
