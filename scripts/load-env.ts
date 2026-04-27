import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_ENV_FILES = [".env", ".env.production", ".env.local"] as const;

type LoadLocalEnvOptions = {
  files?: readonly string[];
  printLoadedFiles?: boolean;
};

export type LoadLocalEnvResult = {
  checkedFiles: string[];
  foundFiles: string[];
};

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex < 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  const rawValue = trimmed.slice(separatorIndex + 1).trim();
  const value = rawValue.replace(/^["']|["']$/g, "");

  if (!key) {
    return null;
  }

  return { key, value };
}

export function loadLocalEnv(options: LoadLocalEnvOptions = {}): LoadLocalEnvResult {
  const files = options.files ?? DEFAULT_ENV_FILES;
  const initialKeys = new Set(
    Object.entries(process.env)
      .filter(([, value]) => Boolean(value?.trim()))
      .map(([key]) => key)
  );
  const foundFiles: string[] = [];

  files.forEach((fileName) => {
    const path = join(process.cwd(), fileName);
    if (!existsSync(path)) {
      return;
    }

    foundFiles.push(fileName);
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    lines.forEach((line) => {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        return;
      }

      const value = parsed.value.trim();
      if (!value) {
        return;
      }

      if (initialKeys.has(parsed.key)) {
        return;
      }

      process.env[parsed.key] = parsed.value;
    });
  });

  if (options.printLoadedFiles) {
    console.log(
      `Env files found: ${foundFiles.length ? foundFiles.join(", ") : "none"}`
    );
    console.log(`Env load order: ${files.join(" -> ")}`);
    console.log("");
  }

  return {
    checkedFiles: [...files],
    foundFiles
  };
}
