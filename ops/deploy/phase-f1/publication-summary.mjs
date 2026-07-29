import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parsePackManifest } from "./pack-layout.mjs";

export const PUBLICATION_SUMMARY_SCHEMA = "phase-f1-publication-summary-v1";
export const ARCHIVE_FORMAT = "POSIX USTAR";
export const CORE_PUBLICATION_FILES = Object.freeze([
  "EXTERNAL-SHA256SUMS",
  "approved-pack-identity.json",
  "bootstrap-install.sh",
  "installed-pack.manifest",
  "phase-f1-pack.tar"
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const compareUtf8 = (left, right) =>
  Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const isLowerHex = (value, length) =>
  typeof value === "string" &&
  new RegExp(`^[0-9a-f]{${length}}$`, "u").test(value);

function readOctal(header, offset, length) {
  const field = header
    .subarray(offset, offset + length)
    .toString("ascii")
    .replace(/\0.*$/u, "")
    .trim();
  if (!/^[0-7]*$/u.test(field)) throw new Error("Malformed USTAR octal field.");
  return field ? Number.parseInt(field, 8) : 0;
}

function readText(header, offset, length) {
  return header
    .subarray(offset, offset + length)
    .toString("utf8")
    .replace(/\0.*$/u, "");
}

export function inspectPublicationArchive(archive) {
  if (!Buffer.isBuffer(archive) || archive.length < 1536 || archive.length % 512) {
    throw new Error("Publication archive is not block-aligned USTAR.");
  }
  const names = new Set();
  let memberCount = 0;
  let offset = 0;
  let terminatorOffset = -1;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      terminatorOffset = offset;
      break;
    }
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    const expectedChecksum = readOctal(header, 148, 8);
    const actualChecksum = checksumHeader.reduce((sum, byte) => sum + byte, 0);
    if (expectedChecksum !== actualChecksum) {
      throw new Error("Publication archive header checksum mismatch.");
    }
    const name = readText(header, 0, 100);
    const type = readText(header, 156, 1) || "0";
    const size = readOctal(header, 124, 12);
    if (
      readText(header, 257, 6) !== "ustar" ||
      readText(header, 263, 2) !== "00" ||
      readOctal(header, 108, 8) !== 0 ||
      readOctal(header, 116, 8) !== 0 ||
      readOctal(header, 136, 12) !== 0 ||
      readText(header, 265, 32) !== "root" ||
      readText(header, 297, 32) !== "root"
    ) {
      throw new Error("Publication archive metadata is not deterministic POSIX USTAR.");
    }
    if (
      !name ||
      name.startsWith("/") ||
      name.includes("\\") ||
      name.split("/").filter(Boolean).some((part) => part === "." || part === "..") ||
      names.has(name) ||
      !["0", "5"].includes(type) ||
      readText(header, 157, 100)
    ) {
      throw new Error("Publication archive contains an unsafe or duplicate member.");
    }
    if (type === "5" && size !== 0) {
      throw new Error("Publication archive directory has content.");
    }
    const bodyEnd = offset + 512 + size;
    if (bodyEnd > archive.length) throw new Error("Publication archive is truncated.");
    names.add(name);
    memberCount += 1;
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (
    terminatorOffset < 0 ||
    archive.length - terminatorOffset < 1024 ||
    !archive.subarray(terminatorOffset).every((byte) => byte === 0) ||
    !names.has("phase-f1/")
  ) {
    throw new Error("Publication archive terminator or root is invalid.");
  }
  return { format: ARCHIVE_FORMAT, memberCount };
}

function exactRegularFiles(directory, expectedNames) {
  const expected = [...expectedNames].sort(compareUtf8);
  const actual = readdirSync(directory).sort(compareUtf8);
  if (
    actual.length !== expected.length ||
    actual.some((name, index) => name !== expected[index])
  ) {
    throw new Error("Publication directory file set is not exact.");
  }
  for (const name of actual) {
    const stats = lstatSync(join(directory, name));
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) {
      throw new Error("Publication output must be a single-link regular file.");
    }
  }
}

function coreFileRecords(directory) {
  return CORE_PUBLICATION_FILES.map((filename) => {
    const path = join(directory, filename);
    const stats = lstatSync(path);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) {
      throw new Error("Publication core output must be a single-link regular file.");
    }
    const body = readFileSync(path);
    return { filename, size: body.length, sha256: sha256(body) };
  });
}

function summaryInputs(directory, operationsCommit, { coreOnly = false } = {}) {
  if (coreOnly) exactRegularFiles(directory, CORE_PUBLICATION_FILES);
  if (!isLowerHex(operationsCommit, 40)) {
    throw new Error("Exact operations commit required for publication summary.");
  }
  const identityBytes = readFileSync(join(directory, "approved-pack-identity.json"));
  const identity = JSON.parse(identityBytes.toString("utf8"));
  if (
    identity.operationsCommit !== operationsCommit ||
    !isLowerHex(identity.forwardApplicationSha, 40) ||
    !isLowerHex(identity.rollbackApplicationSha, 40) ||
    !isLowerHex(identity.historicalProductionSha, 40) ||
    identity.installedPath !==
      `/opt/thebusinesscircle/deployment-packs/${operationsCommit}` ||
    identity.candidateAggregate?.schemaVersion !==
      "phase-f1-candidate-aggregate-v1" ||
    !Number.isSafeInteger(identity.candidateAggregate.fileCount) ||
    identity.candidateAggregate.fileCount < 1 ||
    !isLowerHex(identity.candidateAggregate.aggregateSha256, 64)
  ) {
    throw new Error("Approved identity cannot produce a publication summary.");
  }
  const manifest = parsePackManifest(
    readFileSync(join(directory, "installed-pack.manifest"), "utf8")
  );
  const archive = inspectPublicationArchive(
    readFileSync(join(directory, "phase-f1-pack.tar"))
  );
  if (archive.memberCount !== manifest.length + 1) {
    throw new Error("Publication archive and manifest counts differ.");
  }
  return {
    identity,
    manifest: {
      entryCount: manifest.length,
      regularFileCount: manifest.filter(({ type }) => type === "F").length,
      directoryCount: manifest.filter(({ type }) => type === "D").length
    },
    archive,
    coreFiles: coreFileRecords(directory)
  };
}

function renderSummary({ identity, manifest, archive, coreFiles }) {
  const lines = [
    `schemaVersion=${PUBLICATION_SUMMARY_SCHEMA}`,
    `operationsCommit=${identity.operationsCommit}`,
    `forwardApplicationSha=${identity.forwardApplicationSha}`,
    `rollbackApplicationSha=${identity.rollbackApplicationSha}`,
    `historicalProductionSha=${identity.historicalProductionSha}`,
    `installedPackPath=${identity.installedPath}`,
    `candidateAggregateSchema=${identity.candidateAggregate.schemaVersion}`,
    `candidateFileCount=${identity.candidateAggregate.fileCount}`,
    `candidateAggregateSha256=${identity.candidateAggregate.aggregateSha256}`,
    `manifestEntryCount=${manifest.entryCount}`,
    `manifestRegularFileCount=${manifest.regularFileCount}`,
    `manifestDirectoryCount=${manifest.directoryCount}`,
    `archiveFormat=${archive.format}`,
    `archiveMemberCount=${archive.memberCount}`,
    ...coreFiles.map(
      ({ filename, size, sha256 }) =>
        `coreOutput\t${filename}\t${size}\t${sha256}`
    )
  ];
  return Buffer.from(`${lines.join("\n")}\n`, "utf8");
}

export function renderPublicationSummary(directory, operationsCommit) {
  return renderSummary(summaryInputs(directory, operationsCommit, { coreOnly: true }));
}

export function verifyPublicationDirectory(directory, operationsCommit) {
  const summaryName = `PUBLICATION-SUMMARY-${operationsCommit}.txt`;
  exactRegularFiles(directory, [...CORE_PUBLICATION_FILES, summaryName]);
  const expected = renderSummary(summaryInputs(directory, operationsCommit));
  const actual = readFileSync(join(directory, summaryName));
  if (!actual.equals(expected)) {
    throw new Error("Publication summary differs from generated core evidence.");
  }
  return {
    summaryName,
    summarySize: actual.length,
    summarySha256: sha256(actual)
  };
}
