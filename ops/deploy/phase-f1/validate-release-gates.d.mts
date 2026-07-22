export function validateReleaseEvidenceObjects(role: "forward" | "rollback", evidence: Record<string, unknown>): boolean;
export function validateReleaseEvidence(stateRoot: string, role: "forward" | "rollback", options?: { operational?: boolean }): string;
