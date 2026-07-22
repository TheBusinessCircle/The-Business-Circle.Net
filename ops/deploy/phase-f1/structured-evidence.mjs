import { lstatSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { FORWARD_APPLICATION_SHA, ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";

const digestKeys = ["artifactIdentity", "systemdUnitIdentity", "nginxIdentity", "databaseIdentity", "storageIdentity"];
const commonKeys = ["artifactIdentity", "databaseIdentity", "executedAt", "forwardApplicationSha", "kind", "nginxIdentity", "operationsIdentity", "reviewer", "rollbackApplicationSha", "schemaVersion", "storageIdentity", "systemdUnitIdentity"];
const gates = {
  authenticated: ["existingProPassed", "freeUserPassed", "independentSessionsPassed", "noLiveEmailPassed", "noRealChargePassed", "operatorOnlyBillingPassed", "sharedAccountIdentityPassed"],
  "routing-active": ["bcnHomepagePassed", "bcnWebhookPassed", "cacheBypassPassed", "circleCardPassed", "circleOwnerRouteMatrixPassed", "circleTrafficEnabled", "hostRejectionPassed", "mutatingHttpNeverRedirected", "nginxSyntaxPassed"],
  "routing-removed": ["bcnHomepagePassed", "bcnWebhookPassed", "circleTrafficRemoved", "nginxSyntaxPassed", "publicRouteProbePassed"],
  "traffic-switch": ["authenticatedEvidenceSha256", "cloudflareEvidenceSha256", "cloudflareTlsNginxIdentity", "cloudflareTlsRehearsalIdentity", "routingEvidenceSha256", "forwardRehearsalEvidenceSha256", "rollbackRehearsalEvidenceSha256"]
};

export function validateStructuredEvidence(kind, record) {
  const special = gates[kind];
  if (!special) throw new Error("Unknown structured evidence kind.");
  const expectedKeys = [...commonKeys, ...special].sort();
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(expectedKeys)) throw new Error("Structured evidence has unknown or missing fields.");
  if (record.schemaVersion !== 1 || record.kind !== kind || record.forwardApplicationSha !== FORWARD_APPLICATION_SHA || record.rollbackApplicationSha !== ROLLBACK_APPLICATION_SHA || !/^[0-9a-f]{40}$/u.test(record.operationsIdentity || "") || !/^\d{4}-\d{2}-\d{2}T/u.test(record.executedAt || "") || typeof record.reviewer !== "string" || !record.reviewer.trim()) throw new Error("Structured evidence identity is invalid.");
  for (const key of digestKeys) if (!/^[0-9a-f]{64}$/u.test(record[key] || "")) throw new Error(`Structured evidence digest missing: ${key}`);
  for (const key of special) {
    if (kind === "traffic-switch" ? !/^[0-9a-f]{64}$/u.test(record[key] || "") : record[key] !== true) throw new Error(`Structured evidence gate failed: ${key}`);
  }
  return record;
}

export function readStructuredEvidence(path, kind, { operational = false } = {}) {
  if (operational) {
    const parent = lstatSync(dirname(path));
    if (!parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== 0 || (parent.mode & 0o777) !== 0o700) throw new Error("Unsafe structured evidence parent.");
  }
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || (operational && (stats.uid !== 0 || (stats.mode & 0o777) !== 0o600))) throw new Error("Unsafe structured evidence file.");
  return validateStructuredEvidence(kind, JSON.parse(readFileSync(path, "utf8")));
}

if (process.argv[2] === "validate") readStructuredEvidence(resolve(process.argv[4]), process.argv[3], { operational: true });
else if (process.argv[2]) throw new Error("Usage: structured-evidence.mjs validate <kind> <path>");
