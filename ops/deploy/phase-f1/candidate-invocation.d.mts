export function validateCandidateInvocation(record: Record<string, unknown>, unit: string, port: number): Record<string, unknown>;
export function createCandidateInvocation(path: string, unit: string, port: number, options?: { preState?: string; portWasFree?: boolean; invocationId?: string }): Record<string, unknown>;
export function readCandidateInvocation(path: string, unit: string, port: number, options?: { operational?: boolean }): Record<string, unknown>;
export function validateCandidateCleanupResult(result: Record<string, unknown>): boolean;
