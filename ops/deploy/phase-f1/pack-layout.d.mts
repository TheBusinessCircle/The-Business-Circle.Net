export type PackEntry = { type: "D" | "F"; path: string; body?: Buffer | string };
export declare function expectedPackMode(path: string, type?: "D" | "F"): string;
export declare function renderPackManifest(entries: PackEntry[]): string;
export declare function parsePackManifest(body: string): Array<{ type: "D" | "F"; mode: string; size: number | null; sha256: string | null; path: string }>;
export declare function validatePackTree(entries: Array<PackEntry & { mode: string }>, manifest: string): boolean;
export declare function inventoryInstalledPack(root: string, options?: { operational?: boolean; excludeManifest?: boolean }): string;
export declare function verifyInstalledPack(root: string, manifest: string, options?: { operational?: boolean; excludeManifest?: boolean }): string;
