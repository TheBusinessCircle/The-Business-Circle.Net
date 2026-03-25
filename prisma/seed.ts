import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  resolveSeedMode,
  seedAdminAccount,
  seedBootstrapCatalog,
  seedDemoContent,
  seedFounderServices,
  seedResourceLibrary,
  type SeedMode
} from "./seeds";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function run(mode: SeedMode): Promise<void> {
  console.info(`[seed] Starting seed in '${mode}' mode`);

  await seedBootstrapCatalog(prisma);
  await seedFounderServices(prisma);
  await seedAdminAccount(prisma);
  await seedResourceLibrary(prisma, { pruneExisting: mode !== "production" });

  if (mode === "demo") {
    await seedDemoContent(prisma);
  }

  console.info("[seed] Completed successfully");
}

async function main(): Promise<void> {
  const mode = resolveSeedMode(process.env.SEED_MODE);

  try {
    await run(mode);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error("[seed] Failed", error);
  await prisma.$disconnect();
  process.exit(1);
});
