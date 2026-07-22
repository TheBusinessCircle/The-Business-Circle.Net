import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";

const pm2 = ["/usr/local/bin/pm2", "/usr/bin/pm2"].find(existsSync);
if (!pm2) throw new Error("PM2 executable is unavailable at an approved path.");
const rows = JSON.parse(execFileSync(pm2, ["jlist"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
const matches = rows.filter((row) => row.name === "businesscircle");
if (matches.length !== 1 || matches[0].pm2_env?.status !== "online") {
  throw new Error("Expected exactly one online legacy businesscircle process.");
}
const row = matches[0];
const pid = row.pid;
if (realpathSync(`/proc/${pid}/cwd`) !== "/var/www/The-Business-Circle.Net") {
  throw new Error("Legacy process CWD differs from the verified live directory.");
}
execFileSync("/usr/bin/node", [new URL("./listener-verification.mjs", import.meta.url).pathname, "verify", "3000", String(pid)]);
const names = readFileSync(`/proc/${pid}/environ`).toString("utf8").split("\0").filter(Boolean)
  .map((entry) => entry.slice(0, entry.indexOf("="))).sort();
const command = readFileSync(`/proc/${pid}/cmdline`).toString("utf8").split("\0").filter(Boolean);
function systemctlStatus(command) {
  try { return execFileSync("/usr/bin/systemctl", [command, "pm2-root.service"], { encoding: "utf8" }).trim(); }
  catch (error) { return String(error.stdout || "unknown").trim(); }
}
const record = {
  name: "businesscircle",
  pid,
  cwd: "/var/www/The-Business-Circle.Net",
  commandSha256: createHash("sha256").update(command.join("\0")).digest("hex"),
  environmentNames: names,
  pm2RootEnabled: systemctlStatus("is-enabled"),
  pm2RootActive: systemctlStatus("is-active"),
  dumpSha256: existsSync("/root/.pm2/dump.pm2") ? createHash("sha256").update(readFileSync("/root/.pm2/dump.pm2")).digest("hex") : null
};
writeFileSync(process.argv[2], JSON.stringify(record, null, 2) + "\n", { mode: 0o600, flag: "wx" });
process.stdout.write("Captured legacy metadata without environment values.\n");
