export interface ArtifactEnvironmentExclusionResult {
  role: "forward-release" | "bcn" | "circle-card";
  root: string;
  filesScanned: number;
  prohibitedMaterial: false;
  valueMaterialRecorded: false;
}
export function verifyArtifactEnvironmentExclusion(role: string, root: string, options?: object): ArtifactEnvironmentExclusionResult;
