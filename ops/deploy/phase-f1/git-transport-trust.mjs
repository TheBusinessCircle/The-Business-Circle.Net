import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIVATE_KEY } from "./git-authentication.mjs";

export const APPROVED_GIT_HOST = "github.com";
export const APPROVED_GIT_HOST_KEY_ALGORITHM = "ssh-ed25519";
export const APPROVED_GIT_HOST_KEY =
  "AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl";
export const APPROVED_GIT_SSH_ORIGIN =
  "git@github.com:TheBusinessCircle/The-Business-Circle.Net.git";
export const APPROVED_GIT_HTTPS_ORIGIN =
  "https://github.com/TheBusinessCircle/The-Business-Circle.Net.git";
export const TRUST_FILE_NAME = "github.com.known_hosts";

export const APPROVED_KNOWN_HOSTS =
  `${APPROVED_GIT_HOST} ${APPROVED_GIT_HOST_KEY_ALGORITHM} ${APPROVED_GIT_HOST_KEY}\n`;

export function validateApprovedOrigin(origin) {
  if (origin === APPROVED_GIT_SSH_ORIGIN) return "ssh";
  if (origin === APPROVED_GIT_HTTPS_ORIGIN) return "https";
  throw new Error("Git origin is outside the exact approved repository contract.");
}

export function validateTrustContract(contract, { enforceMetadata = true } = {}) {
  if (
    contract.content !== APPROVED_KNOWN_HOSTS ||
    contract.canonical !== true ||
    contract.regular !== true ||
    contract.symlink !== false ||
    contract.linkCount !== 1 ||
    (enforceMetadata && (
      contract.uid !== 0 ||
      contract.gid !== 0 ||
      contract.mode !== 0o444
    )) ||
    contract.buildReadable !== true ||
    contract.buildWritable !== false ||
    contract.bcnWritable !== false ||
    contract.circleWritable !== false
  ) {
    throw new Error("Approved Git transport trust contract is invalid.");
  }
  return contract;
}

function userTest(user, predicate, path) {
  try {
    execFileSync("/usr/bin/sudo", ["-u", user, "/usr/bin/test", predicate, path], {
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}

export function verifyInstalledGitTrust(packRoot, { enforceMetadata = true } = {}) {
  const canonicalPack = realpathSync(resolve(packRoot));
  if (canonicalPack !== resolve(packRoot)) {
    throw new Error("Installed operations pack is noncanonical.");
  }
  const trustPath = join(canonicalPack, TRUST_FILE_NAME);
  const stats = lstatSync(trustPath);
  validateTrustContract({
    content: readFileSync(trustPath, "utf8"),
    canonical: realpathSync(trustPath) === trustPath,
    regular: stats.isFile(),
    symlink: stats.isSymbolicLink(),
    linkCount: stats.nlink,
    uid: stats.uid,
    gid: stats.gid,
    mode: stats.mode & 0o777,
    buildReadable: enforceMetadata ? userTest("phase-f1-build", "-r", trustPath) : true,
    buildWritable: enforceMetadata ? userTest("phase-f1-build", "-w", trustPath) : false,
    bcnWritable: enforceMetadata ? userTest("bcn-app", "-w", trustPath) : false,
    circleWritable: enforceMetadata ? userTest("circle-card-app", "-w", trustPath) : false
  }, { enforceMetadata });
  return trustPath;
}

export function buildPinnedSshCommand(trustPath, identityPath = PRIVATE_KEY) {
  const canonicalTrust = trustPath;
  if (!new RegExp(
    `^/opt/thebusinesscircle/deployment-packs/[0-9a-f]{40}/${TRUST_FILE_NAME.replace(".", "\\.")}$`,
    "u"
  ).test(canonicalTrust)) {
    throw new Error("Git transport trust path is unsafe.");
  }
  if (identityPath !== PRIVATE_KEY) throw new Error("Git authentication identity path is unsafe.");
  return [
    "/usr/bin/ssh",
    "-F", "/dev/null",
    "-oBatchMode=yes",
    "-oStrictHostKeyChecking=yes",
    `-oUserKnownHostsFile=${canonicalTrust}`,
    "-oGlobalKnownHostsFile=/dev/null",
    `-oHostKeyAlgorithms=${APPROVED_GIT_HOST_KEY_ALGORITHM}`,
    "-oUpdateHostKeys=no",
    "-oVerifyHostKeyDNS=no",
    "-oPasswordAuthentication=no",
    "-oKbdInteractiveAuthentication=no",
    "-oIdentityAgent=none"
    ,"-oIdentitiesOnly=yes",
    `-oIdentityFile=${identityPath}`
  ].join(" ");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, value, identity, ...extras] = process.argv.slice(2);
  if (extras.length) throw new Error("Unexpected Git transport trust arguments.");
  if (command === "verify") {
    const trustPath = verifyInstalledGitTrust(value);
    if (identity && identity !== PRIVATE_KEY) throw new Error("Git authentication identity path is unsafe.");
    process.stdout.write(`${buildPinnedSshCommand(trustPath)}\n`);
  } else if (command === "origin") {
    if (identity) throw new Error("Unexpected Git transport trust arguments.");
    process.stdout.write(`${validateApprovedOrigin(value)}\n`);
  } else {
    throw new Error("Usage: git-transport-trust.mjs <verify PACK_ROOT|origin GIT_ORIGIN>");
  }
}
