import { existsSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function decodeIpv4(hex) {
  return [6, 4, 2, 0].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)).join(".");
}
function decodeIpv6(hex) {
  const bytes = [];
  for (let word = 0; word < 4; word++) for (let offset = 6; offset >= 0; offset -= 2) bytes.push(hex.slice(word * 8 + offset, word * 8 + offset + 2));
  const groups = [];
  for (let index = 0; index < 16; index += 2) groups.push(`${bytes[index]}${bytes[index + 1]}`);
  return groups.join(":").replace(/(^|:)0(?=:0|$)/g, "$1");
}
export function parseProcNet(body, family) {
  return body.trim().split(/\n/).slice(1).map((line) => line.trim().split(/\s+/)).filter((fields) => fields[3] === "0A").map((fields) => {
    const [address, port] = fields[1].split(":");
    return { address: family === 4 ? decodeIpv4(address) : decodeIpv6(address), port: Number.parseInt(port, 16), inode: fields[9] };
  });
}
export function assertExactListener(entries, { address, port, inodes }) {
  const matches = entries.filter((entry) => entry.port === Number(port));
  if (matches.length !== 1 || matches[0].address !== address || !inodes.has(matches[0].inode)) throw new Error("Listener is not uniquely owned on the exact loopback address.");
  return matches[0];
}
function pidInodes(pid) {
  const set = new Set();
  for (const name of readdirSync(`/proc/${pid}/fd`)) {
    try { const target = readlinkSync(`/proc/${pid}/fd/${name}`); const match = /^socket:\[(\d+)\]$/.exec(target); if (match) set.add(match[1]); } catch {}
  }
  return set;
}
function systemEntries() {
  const entries = parseProcNet(readFileSync("/proc/net/tcp", "utf8"), 4);
  if (existsSync("/proc/net/tcp6")) entries.push(...parseProcNet(readFileSync("/proc/net/tcp6", "utf8"), 6));
  return entries;
}
if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [command, portText, pidText] = process.argv.slice(2);
  const entries = systemEntries(); const port = Number(portText);
  if (!Number.isInteger(port)) throw new Error("Numeric port required.");
  if (command === "free") { if (entries.some((entry) => entry.port === port)) process.exitCode = 1; }
  else if (command === "verify") assertExactListener(entries, { address: "127.0.0.1", port, inodes: pidInodes(Number(pidText)) });
  else throw new Error("Usage: listener-verification.mjs <free port|verify port pid>");
}
