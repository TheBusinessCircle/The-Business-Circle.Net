import "server-only";

import { Prisma } from "@prisma/client";
import { logServerWarning } from "@/lib/security/logging";

const CALLING_SCHEMA_ENTITY_NAMES = [
  "CallRoom",
  "CallParticipant",
  "CallHostPermission",
  "GroupHostAccessRequest",
  "CallSchedule",
  "CallAuditLog",
  "RealtimeSystemConfig"
];

function referencesCallingSchemaEntity(message: string) {
  return CALLING_SCHEMA_ENTITY_NAMES.some((entityName) => message.includes(entityName));
}

export function isMissingCallingSchemaError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021" && error.code !== "P2022") {
    return false;
  }

  return referencesCallingSchemaEntity(error.message);
}

export function logCallingSchemaFallback(context: string, error: unknown) {
  void error;
  logServerWarning("calling-schema-fallback", {
    context
  });
}
