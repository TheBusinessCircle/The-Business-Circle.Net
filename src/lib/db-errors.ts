import { Prisma } from "@prisma/client";
import { logServerWarning } from "@/lib/security/logging";

const RECOVERABLE_DATABASE_ERROR_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P2022",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN"
]);

const RECOVERABLE_DATABASE_ERROR_PATTERN =
  /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|SASL:\s*SCRAM-SERVER-FIRST-MESSAGE|client password must be a string|can't reach database server|authentication failed against database server/i;

export function isRecoverableDatabaseError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      RECOVERABLE_DATABASE_ERROR_CODES.has(error.code)) ||
    (error instanceof Error && RECOVERABLE_DATABASE_ERROR_PATTERN.test(error.message))
  );
}

export function logRecoverableDatabaseFallback(context: string, error: unknown) {
  void error;
  logServerWarning("recoverable-database-fallback", {
    context
  });
}
