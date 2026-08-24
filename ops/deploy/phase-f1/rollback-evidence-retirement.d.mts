export declare const STALE_ROLLBACK_EVIDENCE_RETIREMENT: string;
export declare const RETIREMENT_PLAN_SCHEMA: string;
export declare const RETIREMENT_REPORT_SCHEMA: string;
export declare const SUPPORTED_RETIREMENT_EVIDENCE: readonly string[];
export declare function retireStaleRollbackEvidence(options: {
  stateRoot: string;
  applicationIdentitySha256: string;
  buildAttemptSha256: string;
  currentOperationsCommit: string;
  retirement: string;
}, dependencies?: Record<string, unknown>): {
  applicationIdentity: string;
  buildAttemptIdentity: string;
  sourceOperationsCommit: string;
  currentOperationsCommit: string;
  reportIdentity: string;
  historyPaths: { application: string; attempt: string };
  reportPath: string;
  canonicalSlots: "ABSENT";
  historicalPreservation: "VERIFIED";
};
