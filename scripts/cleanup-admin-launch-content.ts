import type { Prisma } from "@prisma/client";

type Options = {
  apply: boolean;
  envFile: string;
};

type Replacement = {
  label: string;
  pattern: RegExp;
  replacement: string;
};

type ChangeLog = {
  model: "SiteContent" | "VisualMediaPlacement";
  id: string;
  label: string;
  path: string;
  before: string;
  after: string;
};

const replacements: Replacement[] = [
  {
    label: "both plans",
    pattern: /\bboth plans\b/gi,
    replacement: "all membership rooms"
  },
  {
    label: "Terms & Conditions",
    pattern: /\bTerms\s*&\s*Conditions\b/g,
    replacement: "Terms of Service"
  },
  {
    label: "Terms and Conditions",
    pattern: /\bTerms and Conditions\b/g,
    replacement: "Terms of Service"
  },
  {
    label: "Founder-Led Growth Ecosystem",
    pattern: /\bFounder-Led Growth Ecosystem\b/g,
    replacement: "Private founder-led business environment"
  },
  {
    label: "Founder Led Growth Ecosystem",
    pattern: /\bFounder Led Growth Ecosystem\b/g,
    replacement: "Private founder-led business environment"
  }
];

function parseArgs(argv: string[]): Options {
  const options: Options = {
    apply: false,
    envFile: ".env"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--env-file") {
      options.envFile = requireValue(argv[index + 1], "--env-file");
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireValue(value: string | undefined, flag: string) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value.trim();
}

function printHelp() {
  console.info(`Usage:
  npx tsx scripts/cleanup-admin-launch-content.ts
  npx tsx scripts/cleanup-admin-launch-content.ts --apply
  npx tsx scripts/cleanup-admin-launch-content.ts --env-file .env.production --apply

Dry-run is the default. Use --apply only after reviewing the logged changes.`);
}

function loadEnvFileIfAvailable(filePath: string) {
  const loadEnvFile = (process as typeof process & {
    loadEnvFile?: (path?: string) => void;
  }).loadEnvFile;

  if (typeof loadEnvFile === "function") {
    loadEnvFile(filePath);
    return;
  }

  if (filePath !== ".env") {
    throw new Error(`This Node version cannot load ${filePath}. Set DATABASE_URL directly instead.`);
  }
}

async function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const { prisma } = await import("../src/lib/prisma");
  return prisma;
}

type DbClient = Awaited<ReturnType<typeof createPrismaClient>>;

async function tableExists(db: DbClient, tableName: string) {
  const rows = await db.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ) AS "exists"
  `;

  return Boolean(rows[0]?.exists);
}

function replaceStalePhrases(value: string) {
  return replacements.reduce((current, item) => current.replace(item.pattern, item.replacement), value);
}

function safeVisualAltText(key: string) {
  if (key.startsWith("membership.")) {
    return "The Business Circle Network membership room preview";
  }

  if (key.startsWith("join.")) {
    return "The Business Circle Network membership access preview";
  }

  if (key.startsWith("about.") || key.startsWith("services.")) {
    return "Founder-led business environment inside The Business Circle Network";
  }

  if (
    key.includes("platform") ||
    key.includes("resources") ||
    key.includes("community") ||
    key.includes("intelligence")
  ) {
    return "Premium founder workspace inside The Business Circle Network";
  }

  return "Business owners collaborating inside a private digital environment";
}

function cleanString(value: string, imageFallback: string) {
  const withoutStalePhrases = replaceStalePhrases(value);
  return withoutStalePhrases.replace(/\bImage:\s*Test\b/gi, imageFallback);
}

function cleanJsonValue(
  value: unknown,
  path: string,
  imageFallback: string,
  record: Omit<ChangeLog, "path" | "before" | "after">,
  changes: ChangeLog[]
): unknown {
  if (typeof value === "string") {
    const cleaned = cleanString(value, imageFallback);

    if (cleaned !== value) {
      changes.push({
        ...record,
        path,
        before: value,
        after: cleaned
      });
    }

    return cleaned;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      cleanJsonValue(item, `${path}[${index}]`, imageFallback, record, changes)
    );
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        cleanJsonValue(item, `${path}.${key}`, imageFallback, record, changes)
      ])
    );
  }

  return value;
}

function isMissingDatabaseTableError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return (
    (error.code === "P2021" || error.code === "P2022")
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFileIfAvailable(options.envFile);

  const db = await createPrismaClient();
  const changes: ChangeLog[] = [];

  try {
    const siteContentRows = (await tableExists(db, "SiteContent"))
      ? await db.siteContent
          .findMany({
            select: { id: true, slug: true, title: true, sections: true }
          })
          .catch((error: unknown) => {
            if (isMissingDatabaseTableError(error)) {
              console.warn("[skipped] SiteContent table is not present in this database.");
              return [];
            }

            throw error;
          })
      : [];

    if (!siteContentRows.length && !(await tableExists(db, "SiteContent"))) {
      console.warn("[skipped] SiteContent table is not present in this database.");
    }

    for (const row of siteContentRows) {
      const rowChanges: ChangeLog[] = [];
      const cleanedSections = cleanJsonValue(
        row.sections,
        "sections",
        "Business owners collaborating inside a private digital environment",
        {
          model: "SiteContent",
          id: row.id,
          label: row.slug
        },
        rowChanges
      );

      changes.push(...rowChanges);

      if (options.apply && rowChanges.length) {
        await db.siteContent.update({
          where: { id: row.id },
          data: { sections: cleanedSections as Prisma.InputJsonValue }
        });
      }
    }

    const visualRows = (await tableExists(db, "VisualMediaPlacement"))
      ? await db.visualMediaPlacement
          .findMany({
            select: { id: true, key: true, label: true, altText: true }
          })
          .catch((error: unknown) => {
            if (isMissingDatabaseTableError(error)) {
              console.warn("[skipped] VisualMediaPlacement table is not present in this database.");
              return [];
            }

            throw error;
          })
      : [];

    if (!visualRows.length && !(await tableExists(db, "VisualMediaPlacement"))) {
      console.warn("[skipped] VisualMediaPlacement table is not present in this database.");
    }

    for (const row of visualRows) {
      const fallback = safeVisualAltText(row.key);
      const altText = row.altText?.trim() ?? "";
      const cleanedAltText = altText
        ? cleanString(altText, fallback)
        : altText;

      const shouldReplacePlaceholder =
        /^test$/i.test(altText) || /^image:\s*test$/i.test(altText);
      const finalAltText = shouldReplacePlaceholder ? fallback : cleanedAltText;

      if (finalAltText !== altText) {
        changes.push({
          model: "VisualMediaPlacement",
          id: row.id,
          label: row.key,
          path: "altText",
          before: altText,
          after: finalAltText
        });

        if (options.apply) {
          await db.visualMediaPlacement.update({
            where: { id: row.id },
            data: { altText: finalAltText }
          });
        }
      }
    }

    console.info(`[mode] ${options.apply ? "apply" : "dry-run"}`);
    console.info(`[checked] SiteContent rows=${siteContentRows.length}`);
    console.info(`[checked] VisualMediaPlacement rows=${visualRows.length}`);

    if (!changes.length) {
      console.info("No stale admin content found.");
      return;
    }

    for (const change of changes) {
      console.info(
        `[${change.model}] ${change.label} ${change.path}: ${JSON.stringify(change.before)} -> ${JSON.stringify(change.after)}`
      );
    }

    console.info(
      options.apply
        ? `Applied ${changes.length} launch content cleanup change(s).`
        : `Dry-run found ${changes.length} launch content cleanup change(s). Re-run with --apply after review.`
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
