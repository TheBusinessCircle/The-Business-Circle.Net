import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadLocalEnv() {
  const files = [".env", ".env.local"];

  files.forEach((fileName) => {
    const path = join(process.cwd(), fileName);
    if (!existsSync(path)) {
      return;
    }

    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex < 0) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (key && typeof process.env[key] === "undefined") {
        process.env[key] = value;
      }
    });
  });
}
