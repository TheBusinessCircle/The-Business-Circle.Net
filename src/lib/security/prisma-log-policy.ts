export type PrismaLogLevel = "query" | "info" | "warn" | "error";

export function prismaLogLevelsForEnvironment(
  environment: string | undefined
): PrismaLogLevel[] {
  // Prisma's direct error logger can serialize complete query arguments before
  // application redaction runs. Production failures are handled by safe callers.
  return environment === "development" ? ["query", "warn"] : [];
}
