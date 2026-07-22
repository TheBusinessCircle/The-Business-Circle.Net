export type StructuredEvidenceKind = "authenticated" | "routing-active" | "routing-removed" | "traffic-switch";
export function validateStructuredEvidence(kind: StructuredEvidenceKind, record: Record<string, unknown>): Record<string, unknown>;
export function readStructuredEvidence(path: string, kind: StructuredEvidenceKind, options?: { operational?: boolean }): Record<string, unknown>;
