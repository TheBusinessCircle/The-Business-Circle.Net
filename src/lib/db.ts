import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { prismaLogLevelsForEnvironment } from "@/lib/security/prisma-log-policy";

declare global {
  var __businessCircleDb: PrismaClient | undefined;
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });

export const db: PrismaClient =
  globalThis.__businessCircleDb ??
  new PrismaClient({
    adapter,
    log: prismaLogLevelsForEnvironment(process.env.NODE_ENV)
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__businessCircleDb = db;
}

export async function withTransaction<T>(operation: (client: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction((tx) => operation(tx));
}
