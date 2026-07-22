export interface RollbackIdentity { rollbackApplicationSha: string; historicalParentSha: string; commitFileSet: string[] | readonly string[]; }
export const ROLLBACK_COMMIT_FILE_SET: string[];
export const requiredRollbackEvidence: string[];
export function createRollbackProof(path: string, identity: RollbackIdentity, evidence: Record<string, string>, options?: { operational?: boolean }): string;
export function verifyRollbackProof(path: string, identity: RollbackIdentity, options?: { operational?: boolean }): RollbackIdentity & { evidence: Record<string, unknown> };
