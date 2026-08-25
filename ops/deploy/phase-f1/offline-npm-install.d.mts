export interface OfflineNpmInstallInvocation {
  readonly executable: "/usr/bin/sudo";
  readonly arguments: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
  readonly cacheRoot: string;
  readonly offline: true;
  readonly registryFallback: false;
  readonly operationsCommit: string;
}
export declare const OFFLINE_INSTALL_SCHEMA: string;
export declare const OFFLINE_NPM_ARGUMENTS: readonly string[];
export declare function createOfflineNpmInstallInvocation(workspace: string, operationsCommit: string): OfflineNpmInstallInvocation;
export declare function installForwardDependenciesOffline(workspace: string, operationsCommit: string, dependencies?: Record<string, unknown>): Record<string, unknown>;
