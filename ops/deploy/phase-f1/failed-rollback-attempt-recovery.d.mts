export const FAILED_ROLLBACK_ATTEMPT_RECOVERY: "FAILED_CURRENT_AUTHORITY_ROLLBACK_BUILD_ATTEMPT_RECOVERY";
export const FAILED_ROLLBACK_CLASSIFICATION: "FAILED_BEFORE_IMMUTABLE_ARTIFACT_PUBLICATION";
export const RECOVERY_PLAN_SCHEMA: "phase-f1-failed-rollback-attempt-recovery-plan-v1";
export const RECOVERY_REPORT_SCHEMA: "phase-f1-failed-rollback-attempt-recovery-report-v1";
export function validateFailedRollbackRecoveryFacts(facts: Record<string, unknown>, options?: { enforceMetadata?: boolean }): string;
export function recoverFailedRollbackAttempt(options: Record<string, unknown>, dependencies?: Record<string, unknown>): Record<string, unknown>;
