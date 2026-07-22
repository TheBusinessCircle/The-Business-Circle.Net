export interface DeploymentIdentities { forwardApplicationSha: string; rollbackApplicationSha: string; historicalProductionSha: string; operationsIdentity: string; }
export interface ReleaseBindings { forwardBcnArtifactDigest: string; forwardCircleCardArtifactDigest: string; rollbackBcnArtifactDigest: string; forwardRehearsalEvidence: string; rollbackRehearsalEvidence: string; databaseIdentity: string; storageConvergenceIdentity: string; systemdUnitIdentity: string; activeBcnSelector: string; circleCardTrafficStatus: string; }
export interface DeploymentState { stage: string; sequence: number; identities?: DeploymentIdentities; bindings?: ReleaseBindings; evidence?: unknown; }
export function readState(root: string, options?: { operational?: boolean }): DeploymentState;
export function transition(root: string, expected: string, next: string, identities: DeploymentIdentities, evidence?: unknown, bindings?: ReleaseBindings, options?: { operational?: boolean }): DeploymentState;
