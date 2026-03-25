import { PrismaClient } from "@prisma/client";

export type SeedMode = "bootstrap" | "demo" | "production";

export interface SeedContext {
  prisma: PrismaClient;
  mode: SeedMode;
  now: Date;
}

export type SeedRunner = (context: SeedContext) => Promise<void>;