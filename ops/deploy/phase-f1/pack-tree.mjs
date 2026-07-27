const PACK_ROOT = "ops/deploy/phase-f1";
const PACK_ANCESTORS = new Set(["ops", "ops/deploy", PACK_ROOT]);
const compareUtf8 = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));

export function parsePackTreeRows(rows, readBlob) {
  const entries = [];
  const paths = new Set();
  for (const line of rows.split(/\r?\n/u).filter(Boolean)) {
    const match = /^(\d{6}) ([a-z]+) ([0-9a-f]{40,64})\t(.+)$/u.exec(line);
    if (!match) throw new Error("Unexpected Git tree entry.");
    const [, mode, objectType, objectId, path] = match;
    if (PACK_ANCESTORS.has(path)) {
      if (mode !== "040000" || objectType !== "tree") throw new Error("Selected pack root is not a Git tree.");
      continue;
    }
    if (!path.startsWith(`${PACK_ROOT}/`)) throw new Error("Pack tree entry is outside the approved boundary.");
    const relative = path.slice(PACK_ROOT.length + 1);
    if (!relative || relative.startsWith("/") || relative.includes("\\") || relative.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Unsafe tree path.");
    if (paths.has(relative)) throw new Error("Duplicate normalized tree path.");
    paths.add(relative);
    if (objectType === "tree") {
      if (mode !== "040000") throw new Error("Unexpected Git tree mode.");
      entries.push({ type: "D", path: relative });
    } else if (objectType === "blob") {
      if (mode !== "100644" && mode !== "100755") throw new Error("Unexpected committed blob mode.");
      entries.push({ type: "F", path: relative, body: readBlob({ objectId, path }) });
    } else {
      throw new Error("Unexpected Git object type.");
    }
  }
  if (!entries.length) throw new Error("Committed pack tree has no descendants.");
  return entries.sort((left, right) => compareUtf8(left.path, right.path));
}

const octal = (value, length) => `${value.toString(8).padStart(length - 1, "0")}\0`;
function tarHeader(name, mode, size, type) {
  if (Buffer.byteLength(name, "utf8") > 100) throw new Error("Pack archive path exceeds deterministic ustar name limit.");
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write(octal(mode, 8), 100, 8, "ascii");
  header.write(octal(0, 8), 108, 8, "ascii");
  header.write(octal(0, 8), 116, 8, "ascii");
  header.write(octal(size, 12), 124, 12, "ascii");
  header.write(octal(0, 12), 136, 12, "ascii");
  header.fill(0x20, 148, 156);
  header.write(type, 156, 1, "ascii");
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  header.write("root", 265, 4, "ascii");
  header.write("root", 297, 4, "ascii");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  return header;
}

export function renderPackTar(entries) {
  const blocks = [tarHeader("phase-f1/", 0o555, 0, "5")];
  for (const entry of entries) {
    const name = `phase-f1/${entry.path}${entry.type === "D" ? "/" : ""}`;
    const body = entry.type === "F" ? (Buffer.isBuffer(entry.body) ? entry.body : Buffer.from(entry.body)) : Buffer.alloc(0);
    const mode = entry.type === "D" || /(?:^|\/)\w[\w.-]*\.sh$/u.test(entry.path) ? 0o555 : 0o444;
    blocks.push(tarHeader(name, mode, body.length, entry.type === "D" ? "5" : "0"));
    if (body.length) {
      blocks.push(body);
      const padding = (512 - body.length % 512) % 512;
      if (padding) blocks.push(Buffer.alloc(padding));
    }
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}
