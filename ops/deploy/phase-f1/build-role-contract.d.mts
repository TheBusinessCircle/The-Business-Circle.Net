export interface ForwardBuildRoleContract {
  readonly role: "bcn" | "circle-card";
  readonly appBrand: "bcn" | "circle-card";
  readonly publicOrigin: "https://thebusinesscircle.net" | "https://circlecard.co.uk";
  readonly authOrigin: "https://thebusinesscircle.net" | "https://circlecard.co.uk";
  readonly runtimeEnvironmentAuthority: string;
  readonly runtimeRelativePath: ".runtime/bcn" | ".runtime/circle-card";
}

export interface ForwardBuildRoleRecord {
  readonly schemaVersion: "phase-f1-forward-build-role-v1";
  readonly buildRole: "bcn" | "circle-card";
  readonly sourceApplicationSha: string;
  readonly operationsCommit: string;
  readonly appBrand: "bcn" | "circle-card";
  readonly publicOrigin: string;
  readonly authOrigin: string;
  readonly runtimeEnvironmentAuthority: string;
  readonly buildIdSha256: string;
  readonly independentBuildInvocation: true;
  readonly bcnBuildOutputReused: false;
  readonly selectorsRequired: false;
  readonly valueMaterialRecorded: false;
}

export declare const FORWARD_APPLICATION_SHA: string;
export declare const BUILD_ROLE_SCHEMA: string;
export declare const BUILD_ROLE_FILE: string;
export declare const FORWARD_BUILD_ROLES: Readonly<Record<"bcn" | "circle-card", ForwardBuildRoleContract>>;
export declare function forwardBuildRole(role: string): ForwardBuildRoleContract;
export declare function createForwardBuildRoleRecord(role: string, operationsCommit: string, buildId: Buffer | string): ForwardBuildRoleRecord;
export declare function validateForwardBuildRoleRecord(record: ForwardBuildRoleRecord, expected?: { role?: string; operationsCommit?: string; buildIdSha256?: string }): ForwardBuildRoleRecord;
export declare function publishForwardBuildRoleRecord(role: string, runtimeRoot: string, operationsCommit: string, options?: { operational?: boolean }): { record: ForwardBuildRoleRecord; target: string; identity: string };
export declare function verifyForwardBuildRoleRecord(role: string, runtimeRoot: string, operationsCommit: string, options?: { operational?: boolean }): { record: ForwardBuildRoleRecord; target: string; identity: string };
