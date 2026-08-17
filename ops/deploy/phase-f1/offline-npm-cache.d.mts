export const OFFLINE_CACHE_ROOT: string;
export const READINESS_PATH: string;
export const ROLLBACK_APPLICATION_SHA: string;
export const NODE_VERSION: string;
export const NPM_VERSION: string;
export const READINESS_SCHEMA: string;
export interface OfflineCacheEvaluation { lockfileSha256: string; packageCount: number; cacheInventorySha256: string; fileCount: number }
export interface OfflineCacheReadiness { schemaVersion: string; operationsCommit: string; applicationSha: string; cacheRoot: string; nodeVersion: string; npmVersion: string; lockfileSha256: string; packageCount: number; cacheInventorySha256: string; cacheFileCount: number; ready: true; valueMaterialRecorded: false }
export function evaluateOfflineCache(cacheRoot: string, lockfilePath: string, options?: { operational?: boolean; expectedGid?: number | null; enforceMetadata?: boolean }): OfflineCacheEvaluation;
export function publishOfflineCacheReadiness(workspace: string, operationsCommit: string): OfflineCacheReadiness;
export function verifyOfflineCacheReadiness(workspace: string, operationsCommit: string): OfflineCacheReadiness;
