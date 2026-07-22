export interface ApplicationFileIdentity { status: string; mode: string; path: string; }
export interface ApplicationIdentity { sha: string; parentSha: string; files: readonly ApplicationFileIdentity[]; }
export const FORWARD_APPLICATION_SHA: string;
export const FORWARD_PARENT_SHA: string;
export const ROLLBACK_APPLICATION_SHA: string;
export const HISTORICAL_PRODUCTION_SHA: string;
export const APPLICATION_IDENTITIES: Readonly<Record<string, ApplicationIdentity>>;
export function verifyApplicationCommit(root: string, role: string, identities?: Record<string, ApplicationIdentity>): { role: string; applicationSha: string; parentSha: string; candidateFileSet: string[]; candidateRawDiffSha256: string; fileHashes: Array<{ path: string; sha256: string }> };
