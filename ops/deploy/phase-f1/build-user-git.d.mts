export interface BuildCheckoutFacts {
  canonical: boolean;
  parentCanonical: boolean;
  directory: boolean;
  symlink: boolean;
  uid: number;
  gid: number;
  mode: number;
  expectedUid: number;
  expectedGid: number;
  basename: string;
  canonicalPath: string;
}

export function validateBuildCheckoutFacts(facts: BuildCheckoutFacts): string;
export function buildGitInspectionInvocation(repository: string, arguments_: string[]): {
  command: string;
  arguments: string[];
};
export function gitAsBuildUser(repository: string, arguments_: string[], encoding?: BufferEncoding | "buffer"): string | Buffer;
