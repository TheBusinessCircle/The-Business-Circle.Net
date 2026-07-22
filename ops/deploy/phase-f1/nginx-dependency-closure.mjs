import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const OPENSSL = existsSync("/usr/bin/openssl") ? "/usr/bin/openssl" : "C:/Program Files/Git/usr/bin/openssl.exe";
const DEFAULT_LINK_POLICY = [
  { linkRoot: "/etc/nginx/sites-enabled", targetRoots: ["/etc/nginx/sites-available"] },
  { linkRoot: "/etc/nginx/modules-enabled", targetRoots: ["/usr/share/nginx/modules-available", "/etc/nginx/modules-available"] }
];
const DEFAULT_MODULE_ROOTS = ["/usr/lib/nginx/modules", "/usr/share/nginx/modules"];
const directives = new Map([
  ["include", "configuration"], ["ssl_certificate", "certificate"], ["ssl_trusted_certificate", "certificate-chain"],
  ["ssl_certificate_key", "private-key"], ["ssl_dhparam", "secret"], ["auth_basic_user_file", "secret"],
  ["proxy_ssl_certificate", "certificate"], ["proxy_ssl_trusted_certificate", "certificate-chain"], ["proxy_ssl_certificate_key", "private-key"],
  ["ssl_session_ticket_key", "secret"], ["load_module", "immutable-binary-module"], ["perl_modules", "configuration"],
  ["js_import", "configuration"], ["js_path", "configuration"], ["lua_package_path", "configuration"],
  ["geoip_country", "configuration"], ["geoip_city", "configuration"]
]);
const runtimePathDirectives = new Set(["access_log", "error_log", "pid", "root", "alias", "client_body_temp_path", "fastcgi_temp_path", "proxy_temp_path", "scgi_temp_path", "uwsgi_temp_path"]);
const quote = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const within = (path, root) => path === root || path.startsWith(`${root}${sep}`);

export function validateNginxSymlinkPolicyRecord(record, policy, { operational = false } = {}) {
  const linkPath = resolve(record.path), linkParent = dirname(linkPath), targetPath = resolve(record.targetPath);
  const matched = policy.find(({ linkRoot }) => within(linkPath, resolve(linkRoot)));
  if (!matched || !matched.targetRoots.map((root) => resolve(root)).some((root) => within(targetPath, root))) throw new Error("Nginx symlink topology is outside approved roots.");
  if (!record.linkText || record.chained || record.cyclic || !record.targetIsFile || record.targetIsSymlink || record.targetNlink !== 1 || (record.targetMode & 0o022) || (record.parentMode & 0o022) || (operational && (record.targetUid !== 0 || record.targetGid !== 0 || record.parentUid !== 0 || record.parentGid !== 0))) throw new Error("Nginx symlink or target protection is unsafe.");
  if (resolve(linkParent, record.linkText) !== targetPath) throw new Error("Nginx symlink text does not resolve to the approved target.");
  return true;
}

function expandPattern(pattern) {
  if (!/[?*[]/u.test(pattern)) return [pattern];
  const directory = dirname(pattern), namePattern = basename(pattern);
  if (/[?*[]/u.test(directory)) throw new Error(`Unsupported recursive Nginx dependency glob: ${pattern}`);
  const expression = new RegExp(`^${quote(namePattern).replaceAll("\\*", ".*").replaceAll("\\?", ".")}$`, "u");
  const matches = readdirSync(directory).filter((name) => expression.test(name)).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))).map((name) => join(directory, name));
  if (!matches.length) throw new Error(`Unresolved Nginx dependency glob: ${pattern}`);
  return matches;
}

function safeRegular(path, { operational = false, binary = false } = {}) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || (operational && ((stats.mode & 0o022) || stats.uid !== 0 || stats.gid !== 0)) || (binary && operational && (stats.mode & 0o111))) throw new Error(`Unsafe linked, writable, executable, or special Nginx dependency: ${path}`);
  return stats;
}

function resolveOnePath(requestedPath, classification, options, links) {
  const absolute = resolve(requestedPath), stats = lstatSync(absolute);
  if (!stats.isSymbolicLink()) {
    const canonical = realpathSync(absolute);
    if (canonical !== absolute) throw new Error(`Nginx dependency contains an unclassified symlink component: ${absolute}`);
    return { path: canonical, stats: safeRegular(canonical, { operational: options.operational, binary: classification === "immutable-binary-module" }) };
  }
  const policy = options.symlinkPolicy.find(({ linkRoot }) => within(absolute, resolve(linkRoot)));
  if (!policy) throw new Error(`Nginx dependency symlink is outside an approved link root: ${absolute}`);
  const linkParent = dirname(absolute), parentStats = lstatSync(linkParent);
  if (!parentStats.isDirectory() || parentStats.isSymbolicLink() || realpathSync(linkParent) !== linkParent || (parentStats.mode & 0o022) || (options.operational && (parentStats.uid !== 0 || parentStats.gid !== 0))) throw new Error(`Unsafe Nginx symlink parent: ${linkParent}`);
  const linkText = readlinkSync(absolute), target = resolve(linkParent, linkText), targetStats = lstatSync(target);
  if (targetStats.isSymbolicLink()) throw new Error(`Chained or cyclic Nginx dependency symlink rejected: ${absolute}`);
  const canonicalTarget = realpathSync(target), approved = policy.targetRoots.map((root) => resolve(root));
  if (!approved.some((root) => within(canonicalTarget, root))) throw new Error(`Nginx symlink target escaped approved roots: ${absolute}`);
  const canonicalStats = safeRegular(canonicalTarget, { operational: options.operational, binary: classification === "immutable-binary-module" });
  validateNginxSymlinkPolicyRecord({ path: absolute, linkText, targetPath: canonicalTarget, chained: false, cyclic: false, targetIsFile: canonicalStats.isFile(), targetIsSymlink: false, targetNlink: canonicalStats.nlink, targetMode: canonicalStats.mode & 0o777, targetUid: canonicalStats.uid, targetGid: canonicalStats.gid, parentMode: parentStats.mode & 0o777, parentUid: parentStats.uid, parentGid: parentStats.gid }, options.symlinkPolicy, { operational: options.operational });
  const linkIdentity = { path: absolute, linkText, targetPath: canonicalTarget, sha256: sha256(Buffer.from(linkText, "utf8")) };
  const existing = links.get(absolute);
  if (existing && JSON.stringify(existing) !== JSON.stringify(linkIdentity)) throw new Error(`Nginx link identity changed during discovery: ${absolute}`);
  links.set(absolute, linkIdentity);
  return { path: canonicalTarget, stats: targetStats };
}

function resolveDirective(raw, directive, prefix, options) {
  if (!raw || raw.includes("$") || raw.includes("\0")) throw new Error(`Unsupported dynamic Nginx dependency: ${directive}`);
  if (!isAbsolute(raw) && raw.replaceAll("\\", "/").split("/").includes("..")) throw new Error(`Nginx dependency traversal rejected: ${raw}`);
  if (directive === "load_module") {
    const target = isAbsolute(raw) ? resolve(raw) : resolve(options.modulePrefix, raw);
    if (!options.moduleRoots.map((root) => resolve(root)).some((root) => within(target, root))) throw new Error(`Nginx module is outside an approved module root: ${raw}`);
    return target;
  }
  return isAbsolute(raw) ? raw : resolve(prefix, raw);
}

function discoverClosure(entryPath, supplied = {}) {
  const options = { prefix: dirname(entryPath), modulePrefix: "/usr/lib/nginx", moduleRoots: DEFAULT_MODULE_ROOTS, symlinkPolicy: DEFAULT_LINK_POLICY, operational: false, ...supplied };
  const queue = [{ path: resolve(entryPath), classification: "configuration", directive: "entry" }], discovered = new Map(), links = new Map();
  while (queue.length) {
    const requested = queue.shift();
    for (const expanded of expandPattern(requested.path)) {
      const resolvedEntry = resolveOnePath(expanded, requested.classification, options, links), path = resolvedEntry.path;
      const existing = discovered.get(path);
      if (existing && existing.classification !== requested.classification) throw new Error(`Conflicting Nginx dependency classification: ${path}`);
      if (existing) continue;
      const body = readFileSync(path), stats = lstatSync(path);
      const dependency = { path, classification: requested.classification, sha256: sha256(body), size: body.length, mode: stats.mode & 0o777, ownership: options.operational ? "root:root" : "fixture-reviewed" };
      discovered.set(path, dependency);
      if (requested.classification !== "configuration") continue;
      const text = body.toString("utf8").replace(/#[^\r\n]*/gu, ""), expression = /(?:^|[;{}\n])\s*([a-zA-Z0-9_]+)\s+([^;{}]+);/gu;
      for (const match of text.matchAll(expression)) {
        const raw = match[2].trim().replace(/^['"]|['"]$/gu, ""), classification = directives.get(match[1]);
        if (!classification) {
          if (raw.startsWith("/") && !runtimePathDirectives.has(match[1])) throw new Error(`Unclassified absolute Nginx dependency: ${match[1]}`);
          continue;
        }
        const target = resolveDirective(raw, match[1], options.prefix, options);
        for (const path of expandPattern(target)) queue.push({ path, classification, directive: match[1] });
      }
    }
  }
  return { dependencies: [...discovered.values()].sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path))), links: [...links.values()].sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path))), options };
}

export function discoverNginxDependencies(entryPath, options = {}) { return discoverClosure(entryPath, options).dependencies; }
export function discoverNginxDependencyClosure(entryPath, options = {}) { return discoverClosure(entryPath, options); }

function certificateMetadata(path) {
  const fingerprint = execFileSync(OPENSSL, ["x509", "-in", path, "-noout", "-fingerprint", "-sha256"], { encoding: "utf8" }).trim().split("=").pop().replaceAll(":", "").toLowerCase();
  const sanText = execFileSync(OPENSSL, ["x509", "-in", path, "-noout", "-ext", "subjectAltName"], { encoding: "utf8" });
  const expiresAt = execFileSync(OPENSSL, ["x509", "-in", path, "-noout", "-enddate"], { encoding: "utf8" }).trim().replace(/^notAfter=/u, "");
  const publicKey = execFileSync(OPENSSL, ["x509", "-in", path, "-pubkey", "-noout"]), publicKeyDer = execFileSync(OPENSSL, ["pkey", "-pubin", "-outform", "DER"], { input: publicKey });
  return { fingerprintSha256: fingerprint, sans: [...sanText.matchAll(/DNS:([^,\s]+)/gu)].map((match) => match[1]).sort(), expiresAt, publicKeyIdentity: sha256(publicKeyDer) };
}
const keyMetadata = (path) => ({ publicKeyIdentity: sha256(execFileSync(OPENSSL, ["pkey", "-in", path, "-pubout", "-outform", "DER"])) });
function capturedPathFor(path) {
  const normalized = path.replaceAll("\\", "/").replace(/^([A-Za-z]):/u, "$1-drive").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((part) => !part || part === "." || part === "..")) throw new Error(`Unsafe Nginx dependency path: ${path}`);
  return `phase-f1-dependencies/root/${normalized}`;
}
function rewriteConfiguration(body, options) {
  return body.replace(/(^|[;{}\n])(\s*)([a-zA-Z0-9_]+)(\s+)([^;{}]+);/gu, (whole, lead, spacing, directive, separator, argument) => {
    if (!directives.has(directive) && !runtimePathDirectives.has(directive)) return whole;
    const trimmed = argument.trim(), quoteMark = /^['"]/.test(trimmed) ? trimmed[0] : "", raw = trimmed.replace(/^['"]|['"]$/gu, "");
    if (runtimePathDirectives.has(directive)) {
      const [path, ...parameters] = raw.split(/\s+/u); if (!isAbsolute(path)) return whole;
      return `${lead}${spacing}${directive}${separator}${quoteMark}${capturedPathFor(path)}${parameters.length ? ` ${parameters.join(" ")}` : ""}${quoteMark};`;
    }
    const resolved = resolveDirective(raw, directive, options.prefix, options);
    return `${lead}${spacing}${directive}${separator}${quoteMark}${capturedPathFor(resolved)}${quoteMark};`;
  });
}

export function captureNginxDependencyClosure(entryPath, snapshotRoot, evidencePath, supplied = {}) {
  const closure = discoverClosure(entryPath, supplied), { dependencies, links, options } = closure;
  mkdirSync(snapshotRoot, { recursive: false, mode: 0o700 }); mkdirSync(join(snapshotRoot, "phase-f1-dependencies", "root"), { recursive: true, mode: 0o700 });
  const captured = [];
  for (const dependency of dependencies) {
    const relativePath = capturedPathFor(dependency.path), destination = join(snapshotRoot, relativePath); mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
    if (dependency.classification === "configuration") writeFileSync(destination, Buffer.from(rewriteConfiguration(readFileSync(dependency.path, "utf8"), options)), { mode: 0o400, flag: "wx" });
    else copyFileSync(dependency.path, destination);
    chmodSync(destination, new Set(["secret", "private-key", "immutable-binary-module"]).has(dependency.classification) ? 0o400 : 0o444);
    const row = { ...dependency, capturedPath: relativePath, capturedSha256: sha256(readFileSync(destination)) };
    if (dependency.classification === "certificate" || dependency.classification === "certificate-chain") row.certificate = certificateMetadata(dependency.path);
    if (dependency.classification === "private-key") row.privateKey = keyMetadata(dependency.path);
    captured.push(row);
  }
  const capturedLinks = [];
  for (const link of links) {
    const linkPath = join(snapshotRoot, capturedPathFor(link.path)), targetPath = join(snapshotRoot, capturedPathFor(link.targetPath)); mkdirSync(dirname(linkPath), { recursive: true, mode: 0o700 });
    const snapshotLinkText = relative(dirname(linkPath), targetPath); symlinkSync(snapshotLinkText, linkPath, "file");
    capturedLinks.push({ ...link, capturedPath: capturedPathFor(link.path), capturedLinkText: snapshotLinkText, capturedTargetPath: capturedPathFor(link.targetPath) });
  }
  const entry = capturedPathFor(resolve(entryPath)), certificateKeys = captured.filter((item) => item.classification === "certificate").map((item) => item.certificate.publicKeyIdentity).sort(), privateKeys = captured.filter((item) => item.classification === "private-key").map((item) => item.privateKey.publicKeyIdentity).sort();
  const evidence = { schemaVersion: 2, entry, dependencies: captured, links: capturedLinks, certificateKeyPairingPassed: certificateKeys.length > 0 && JSON.stringify(certificateKeys) === JSON.stringify(privateKeys) };
  if (!evidence.certificateKeyPairingPassed) throw new Error("Nginx certificate/private-key pairing failed.");
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600, flag: "wx" }); return evidence;
}

export function verifyCapturedNginxClosure(snapshotRoot, evidence) {
  for (const item of evidence.dependencies) {
    const path = resolve(snapshotRoot, item.capturedPath); if (!within(path, resolve(snapshotRoot))) throw new Error("Captured Nginx dependency escaped snapshot.");
    const stats = lstatSync(path); if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || sha256(readFileSync(path)) !== item.capturedSha256) throw new Error(`Captured Nginx dependency changed: ${item.capturedPath}`);
    if (item.classification === "configuration" && evidence.dependencies.some((dependency) => readFileSync(path, "utf8").includes(dependency.path))) throw new Error("Captured Nginx configuration retains a live dependency path.");
    if ((item.classification === "certificate" || item.classification === "certificate-chain") && certificateMetadata(path).fingerprintSha256 !== item.certificate.fingerprintSha256) throw new Error("Captured certificate fingerprint mismatch.");
    if (item.classification === "private-key" && keyMetadata(path).publicKeyIdentity !== item.privateKey.publicKeyIdentity) throw new Error("Captured private-key identity mismatch.");
  }
  for (const link of evidence.links || []) {
    const path = resolve(snapshotRoot, link.capturedPath), stats = lstatSync(path);
    if (!stats.isSymbolicLink() || readlinkSync(path) !== link.capturedLinkText || realpathSync(path) !== resolve(snapshotRoot, link.capturedTargetPath)) throw new Error("Captured Nginx symlink topology changed.");
  }
  return true;
}

const [command, entry, snapshot, evidence] = process.argv.slice(2);
if (command === "capture") captureNginxDependencyClosure(resolve(entry), resolve(snapshot), resolve(evidence), { prefix: "/etc/nginx", modulePrefix: "/usr/lib/nginx", operational: true });
else if (command === "verify") verifyCapturedNginxClosure(resolve(snapshot), JSON.parse(readFileSync(resolve(evidence), "utf8")));
else if (command) throw new Error("Usage: nginx-dependency-closure.mjs <capture entry snapshot evidence|verify snapshot evidence>");
