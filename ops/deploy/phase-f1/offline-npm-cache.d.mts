export const OFFLINE_CACHE_ROOT: string;
export const READINESS_PATH: string;
export const ROLLBACK_APPLICATION_SHA: string;
export const FORWARD_APPLICATION_SHA: string;
export const NODE_VERSION: string;
export const NPM_VERSION: string;
export const READINESS_SCHEMA: string;
export const READY_CARRY_FORWARD_SCHEMA: string;
export const IDENTITY_ONLY_READY_CARRY_FORWARD: string;
export const IDENTITY_ONLY_READY_DELTA: string;
export const STATE_ROOT: string;
export const APPROVED_TARGET_PLATFORM: Readonly<TargetPlatform>;
export const SEALED_NOT_READY: string;
export interface TargetPlatform { os: string; cpu: string; libc: string }
export interface OfflineCacheEvaluation { lockfileSha256: string; targetPlatform: TargetPlatform; totalLockfileIntegrityCount: number; requiredTargetIntegrityCount: number; presentRequiredTargetIntegrityCount: number; missingRequiredTargetIntegrityCount: 0; optionalInapplicableIntegrityCount: number; cacheInventorySha256: string; fileCount: number }
export interface OfflineCacheReadiness { schemaVersion: string; operationsCommit: string; applicationSha: string; cacheRoot: string; nodeVersion: string; npmVersion: string; lockfileSha256: string; targetOs: string; targetCpu: string; targetLibc: string; totalLockfileIntegrityCount: number; requiredTargetIntegrityCount: number; presentRequiredTargetIntegrityCount: number; missingRequiredTargetIntegrityCount: 0; optionalInapplicableIntegrityCount: number; cacheInventorySha256: string; cacheFileCount: number; offlineResolutionVerified: true; ready: true; valueMaterialRecorded: false }
export function approvedTargetPlatform(): Readonly<TargetPlatform>;
export function packagePlatformApplicable(entry: Record<string, unknown>, targetPlatform: TargetPlatform): { applicable: boolean; constrained: boolean };
export function packageIntegrityContract(lockfile: Record<string, unknown>, targetPlatform: TargetPlatform): { totalLockfileIntegrityCount: number; requiredTargetIntegrities: string[]; optionalInapplicableIntegrities: string[] };
export function evaluateOfflineCache(cacheRoot: string, lockfilePath: string, options?: { operational?: boolean; expectedGid?: number | null; enforceMetadata?: boolean; targetPlatform?: TargetPlatform }): OfflineCacheEvaluation;
export function publishOfflineCacheReadiness(workspace: string, operationsCommit: string, options?: { offlineResolutionVerified?: boolean }): OfflineCacheReadiness;
export function createOfflineCacheReadinessRecord(workspace: string, operationsCommit: string, options?: { offlineResolutionVerified?: boolean }): OfflineCacheReadiness;
export function verifyOfflineCacheReadiness(workspace: string, operationsCommit: string): OfflineCacheReadiness;
export function verifyOfflineCacheForForwardBuild(workspace: string, operationsCommit: string, options?: Record<string, unknown>): { cacheRoot: string; applicationSha: string; operationsCommit: string; lockfileSha256: string; cacheInventorySha256: string; requiredTargetIntegrityCount: number; missingRequiredTargetIntegrityCount: 0; offlineResolutionRequired: true; ready: true; valueMaterialRecorded: false };
export function validateOfflineCacheReadiness(record: OfflineCacheReadiness, operationsCommit: string, expected?: OfflineCacheReadiness): OfflineCacheReadiness;
export function classifyOfflineCacheReadinessDelta(source: OfflineCacheReadiness, candidate: OfflineCacheReadiness): string;
export function preservedOfflineCacheReadinessPath(stateRoot: string, operationsCommit: string): string;
export function offlineCacheReadinessExchangeSlotPath(stateRoot: string, operationsCommit: string): string;
export function offlineCacheReadinessCarryForwardReportPath(stateRoot: string, operationsCommit: string): string;
export function validateOfflineCacheReadinessCarryForwardReport(report: Record<string, unknown>, expected?: Record<string, unknown>): Record<string, unknown>;
export function createOfflineCacheReadinessCarryForwardArtifacts(source: { record: OfflineCacheReadiness; bytes: Buffer; identity: string }, candidate: OfflineCacheReadiness, operationsCommit: string, lineage: string[]): Record<string, unknown>;
export function publishCarriedForwardOfflineCacheReadiness(options: { workspace: string; sourceReadinessSha256: string; operationsCommit: string; carryForward: string }, dependencies?: Record<string, unknown>): Record<string, unknown>;
export function assertReadyCarryForwardOperationalState(workspace: string): string;
export function validateSealedReadyCacheState(current: { fileCount: number; cacheInventorySha256: string }, expected: { cacheFileCount: number; cacheInventorySha256: string }): { fileCount: number; cacheInventorySha256: string };
export function assertSealedReadyCacheOperationalState(expected: { cacheFileCount: number; cacheInventorySha256: string }): { fileCount: number; cacheInventorySha256: string };
export function classifySealedNotReadyCache(workspace: string, operationsCommit: string): Record<string, unknown>;
export function validateFailedCachePreparationLog(body: string, identity: Record<string, unknown>, trustedLineage: string[]): string;
export function validateSealedNotReadyRecoveryContract(record: Record<string, unknown>): string;
