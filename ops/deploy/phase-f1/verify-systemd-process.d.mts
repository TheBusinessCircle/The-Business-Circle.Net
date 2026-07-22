export interface ProcessExpectation { user: string; groups: string[]; port: number; mode: string; runtime: Record<string, string>; resolvedCwd: string; applicationRole: string; applicationSha: string; artifactIdentityPath: string; launcherPath: string; restart: string }
export function resolveProcessExpectation(unit: string, resolvedCwd: string, packPath: string): ProcessExpectation;
export function parseSystemdExecStart(value: string): string[];
export function verifyProcessSnapshot(snapshot: Record<string, unknown>, expected: Record<string, unknown>): true;
