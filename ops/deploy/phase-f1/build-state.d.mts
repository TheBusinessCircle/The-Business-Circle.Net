export interface BuildAttempt { format: string; role: "forward" | "rollback"; applicationSha: string; operationsCommit: string; path: string; attemptId: string; status: "prepared" | "consumed" | "failed" | "complete" }
export interface BuildAttemptIdentity { role: "forward" | "rollback"; applicationSha: string; operationsCommit: string }
export function createBuildAttempt(path: string, values: BuildAttemptIdentity & { workspace: string; attemptId?: string }): BuildAttempt;
export function inspectBuildAttempt(path: string, values: BuildAttemptIdentity): BuildAttempt;
export function consumeBuildAttempt(path: string, values: BuildAttemptIdentity): BuildAttempt;
export function finishBuildAttempt(path: string, status: "failed" | "complete", operationsCommit: string): BuildAttempt;
