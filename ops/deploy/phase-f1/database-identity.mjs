import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readEnvironmentJson } from "./environment-file.mjs";

export function parseDatabaseUrl(value) {
  let url; try { url = new URL(value); } catch { throw new Error("DATABASE_URL is malformed."); }
  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) throw new Error("PostgreSQL URL required.");
  const hostOption = url.searchParams.get("host");
  const host = hostOption || url.hostname.replace(/^\[|\]$/g, "");
  const socket = host.startsWith("/");
  if (!(new Set(["localhost", "127.0.0.1", "::1", "/var/run/postgresql", "/run/postgresql"]).has(host))) throw new Error("Database must be the approved local target.");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const username = decodeURIComponent(url.username); const password = decodeURIComponent(url.password);
  const port = url.searchParams.get("port") || url.port || "5432";
  const sslmode = url.searchParams.get("sslmode") || (socket ? "disable" : "prefer");
  if (!database || database.includes("/") || !/^\d{1,5}$/.test(port) || Number(port) > 65535) throw new Error("Invalid database identity.");
  if (!new Set(["disable", "allow", "prefer", "require", "verify-ca", "verify-full"]).has(sslmode)) throw new Error("Unsupported sslmode.");
  for (const item of [host, port, username, password, database, sslmode]) if (/[\0\r\n]/.test(item)) throw new Error("Unsafe database field.");
  const canonical = JSON.stringify({ protocol: "postgresql", host, port, database, username, sslmode });
  return { host, port, username, password, database, sslmode, identitySha256: createHash("sha256").update(canonical).digest("hex") };
}

export function matchingRuntimeDatabaseIdentity(bcnPath, circlePath) {
  const bcn = readEnvironmentJson(bcnPath, { expectedGroup: "bcn-app" });
  const circle = readEnvironmentJson(circlePath, { expectedGroup: "circle-card-app" });
  if (bcn.DATABASE_URL !== circle.DATABASE_URL) throw new Error("Runtime DATABASE_URL values are not byte-identical.");
  return parseDatabaseUrl(bcn.DATABASE_URL);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const identity = matchingRuntimeDatabaseIdentity(process.argv[2], process.argv[3]);
  if (process.argv[4] === "hash") process.stdout.write(identity.identitySha256);
  else if (process.argv[4] === "fields") for (const key of ["host", "port", "username", "password", "database", "sslmode", "identitySha256"]) process.stdout.write(`${identity[key]}\0`);
  else throw new Error("Usage: database-identity.mjs <bcn-json> <circle-json> <hash|fields>");
}
