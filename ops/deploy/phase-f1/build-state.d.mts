export interface BuildAttempt { format: string; role: "forward" | "rollback"; applicationSha: string; path: string; attemptId: string; status: "prepared" | "consumed" | "failed" | "complete" }
export function createBuildAttempt(path: string, values: { role: "forward" | "rollback"; applicationSha: string; workspace: string; attemptId?: string }): BuildAttempt;
export function consumeBuildAttempt(path: string, values: { role: "forward" | "rollback"; applicationSha: string }): BuildAttempt;
export function finishBuildAttempt(path: string, status: "failed" | "complete"): BuildAttempt;
