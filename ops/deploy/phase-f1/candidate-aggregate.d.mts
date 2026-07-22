export const AGGREGATE_SCHEMA: string;
export const CANDIDATE_FILES: string[];
export function aggregateCandidateEntries(entries: Array<{ path: string; body: string | Buffer }>, expectedPaths?: string[] | null): { schemaVersion: string; fileCount: number; aggregateSha256: string };
export function aggregateCandidateWorkspace(root?: string): { schemaVersion: string; fileCount: number; aggregateSha256: string };
