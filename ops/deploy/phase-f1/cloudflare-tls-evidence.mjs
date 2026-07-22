import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isIP } from "node:net";
import { FORWARD_APPLICATION_SHA, ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";

const keys = ["apexHostname", "apexOnlyLaunchApproved", "certificateExpiresAt", "certificateKeyPairingPassed", "cloudflareProxyStatus", "forwardApplicationSha", "hostRoutingPassed", "httpMethodProtectionPassed", "nginxIdentity", "noAaaaReason", "noStaleCachePassed", "officialRealIpSource", "operationsIdentity", "originCertificateFingerprintSha256", "originCertificateSans", "originIpv4Target", "originIpv6", "originIpv6Decision", "ownerRouteRejectionPassed", "realIpRangeSetSha256", "realIpSourceReviewedAt", "realIpSourceType", "redirectRuleReviewPassed", "renewalMethod", "reviewedAt", "reviewer", "rollbackApplicationSha", "schemaVersion", "sniPassed", "sslMode", "tlsRehearsalIdentity", "unsupportedWwwDecision"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const OFFICIAL_SOURCE = "https://www.cloudflare.com/ips/";
function publicIpv4(value) {
  if (isIP(value) !== 4) return false;
  const [a, b] = value.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0));
}
function publicIpv6(value) {
  if (isIP(value) !== 6) return false;
  const normalized = value.toLowerCase();
  return normalized !== "::" && normalized !== "::1" && !normalized.startsWith("ff") && !normalized.startsWith("fc") && !normalized.startsWith("fd") && !normalized.startsWith("fe8") && !normalized.startsWith("fe9") && !normalized.startsWith("fea") && !normalized.startsWith("feb") && !normalized.startsWith("2001:db8");
}

export function parseStrictJsonObject(body) {
  const keyMatches = [...body.matchAll(/"((?:\\.|[^"\\])*)"\s*:/gu)].map((match) => JSON.parse(`"${match[1]}"`));
  if (new Set(keyMatches).size !== keyMatches.length) throw new Error("Cloudflare/TLS evidence contains duplicate JSON keys.");
  let record;
  try { record = JSON.parse(body); } catch { throw new Error("Cloudflare/TLS evidence is malformed JSON."); }
  if (!record || Array.isArray(record) || typeof record !== "object") throw new Error("Cloudflare/TLS evidence must be an object.");
  return record;
}

export function validateCloudflareTlsEvidence(record, expected, { now = new Date() } = {}) {
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(keys)) throw new Error("Cloudflare/TLS evidence has unknown or missing fields.");
  if (record.schemaVersion !== 1 || record.operationsIdentity !== expected.operationsIdentity || record.forwardApplicationSha !== FORWARD_APPLICATION_SHA || record.rollbackApplicationSha !== ROLLBACK_APPLICATION_SHA || record.nginxIdentity !== expected.nginxIdentity || record.tlsRehearsalIdentity !== expected.tlsRehearsalIdentity || record.originCertificateFingerprintSha256 !== expected.originCertificateFingerprintSha256) throw new Error("Cloudflare/TLS evidence identity mismatch.");
  if (!/^[0-9a-f]{40}$/u.test(record.operationsIdentity) || !/^[0-9a-f]{64}$/u.test(record.nginxIdentity) || !/^[0-9a-f]{64}$/u.test(record.tlsRehearsalIdentity) || !/^[0-9a-f]{64}$/u.test(record.originCertificateFingerprintSha256)) throw new Error("Cloudflare/TLS digest or fingerprint is malformed.");
  if (record.apexHostname !== "circlecard.co.uk" || record.cloudflareProxyStatus !== "proxied" || record.sslMode !== "Full (strict)" || record.unsupportedWwwDecision !== "unsupported" || !publicIpv4(record.originIpv4Target)) throw new Error("Cloudflare launch topology is not approved.");
  if (record.originIpv6Decision === "explicit-ipv6") {
    if (!publicIpv6(record.originIpv6) || record.noAaaaReason !== null) throw new Error("Explicit IPv6 approval is invalid.");
  } else if (record.originIpv6Decision === "explicitly-no-aaaa") {
    if (record.originIpv6 !== null || typeof record.noAaaaReason !== "string" || !record.noAaaaReason.trim()) throw new Error("No-AAAA approval is incomplete.");
  } else throw new Error("IPv6/AAAA decision is missing or invalid.");
  if (!Array.isArray(record.originCertificateSans) || !record.originCertificateSans.includes("circlecard.co.uk") || record.originCertificateSans.some((name) => name.toLowerCase().startsWith("www."))) throw new Error("Origin certificate SAN policy mismatch.");
  for (const gate of ["apexOnlyLaunchApproved", "certificateKeyPairingPassed", "hostRoutingPassed", "httpMethodProtectionPassed", "noStaleCachePassed", "ownerRouteRejectionPassed", "redirectRuleReviewPassed", "sniPassed"]) if (record[gate] !== true) throw new Error(`Cloudflare/TLS mandatory gate failed: ${gate}`);
  if (record.realIpSourceType !== "cloudflare-official-ip-ranges" || record.officialRealIpSource !== OFFICIAL_SOURCE || !/^[0-9a-f]{64}$/u.test(record.realIpRangeSetSha256 || "")) throw new Error("Cloudflare real-IP source identity is not approved or bound.");
  for (const name of ["renewalMethod", "reviewer"]) if (typeof record[name] !== "string" || !record[name].trim()) throw new Error(`Cloudflare/TLS metadata missing: ${name}`);
  const reviewed = Date.parse(record.reviewedAt), sourceReviewed = Date.parse(record.realIpSourceReviewedAt), expires = Date.parse(record.certificateExpiresAt), current = now.getTime();
  if (![reviewed, sourceReviewed, expires].every(Number.isFinite) || reviewed > current || current - reviewed > 30 * 86400_000 || sourceReviewed > current || current - sourceReviewed > 90 * 86400_000 || expires <= current + 14 * 86400_000) throw new Error("Cloudflare/TLS evidence is stale or certificate expiry is unsafe.");
  return record;
}

export function readCloudflareTlsEvidence(path, expected, { operational = false, now } = {}) {
  if (operational) {
    const parent = lstatSync(dirname(path));
    if (!parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== 0 || (parent.mode & 0o777) !== 0o700) throw new Error("Unsafe Cloudflare/TLS evidence parent.");
  }
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || (operational && (stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600))) throw new Error("Unsafe Cloudflare/TLS evidence file.");
  const body = readFileSync(path);
  const record = validateCloudflareTlsEvidence(parseStrictJsonObject(body.toString("utf8")), expected, { now });
  return { record, sha256: sha256(body) };
}

if (process.argv[2] === "validate") {
  const [path, operationsIdentity, nginxIdentity, tlsRehearsalIdentity, originCertificateFingerprintSha256] = process.argv.slice(3);
  const validated = readCloudflareTlsEvidence(resolve(path), { operationsIdentity, nginxIdentity, tlsRehearsalIdentity, originCertificateFingerprintSha256 }, { operational: true });
  process.stdout.write(JSON.stringify({ sha256: validated.sha256, nginxIdentity: validated.record.nginxIdentity, tlsRehearsalIdentity: validated.record.tlsRehearsalIdentity }));
} else if (process.argv[2]) throw new Error("Usage: cloudflare-tls-evidence.mjs validate <path> <operations-identity> <nginx-identity> <tls-rehearsal-identity> <origin-certificate-fingerprint>");
