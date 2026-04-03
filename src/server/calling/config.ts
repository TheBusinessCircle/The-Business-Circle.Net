import type { RealtimeSystemConfig } from "@prisma/client";
import { db } from "@/lib/db";
import {
  isMissingCallingSchemaError,
  logCallingSchemaFallback
} from "@/server/calling/errors";

export const REALTIME_SYSTEM_CONFIG_ID = "default";

export const DEFAULT_REALTIME_SYSTEM_CONFIG = {
  id: REALTIME_SYSTEM_CONFIG_ID,
  globalCallingEnabled: true,
  memberHostedGroupCallsEnabled: false,
  emergencyShutdownEnabled: false,
  defaultHostParticipantCap: 6,
  founderRoomDefaultCap: 30
} as const;

function getUnavailableRealtimeSystemConfig(): RealtimeSystemConfig {
  return {
    ...DEFAULT_REALTIME_SYSTEM_CONFIG,
    globalCallingEnabled: false,
    memberHostedGroupCallsEnabled: false,
    emergencyShutdownEnabled: true,
    createdAt: new Date(0),
    updatedAt: new Date(0)
  };
}

export async function ensureRealtimeSystemConfig() {
  try {
    return await db.realtimeSystemConfig.upsert({
      where: {
        id: REALTIME_SYSTEM_CONFIG_ID
      },
      update: {},
      create: DEFAULT_REALTIME_SYSTEM_CONFIG
    });
  } catch (error) {
    if (!isMissingCallingSchemaError(error)) {
      throw error;
    }

    logCallingSchemaFallback("realtime-system-config", error);
    return getUnavailableRealtimeSystemConfig();
  }
}

export function isCallingSystemEnabled(config: {
  globalCallingEnabled: boolean;
  emergencyShutdownEnabled: boolean;
}) {
  return config.globalCallingEnabled && !config.emergencyShutdownEnabled;
}

type RealtimeSystemConfigUpdateValues = Partial<
  Pick<
    RealtimeSystemConfig,
    | "globalCallingEnabled"
    | "memberHostedGroupCallsEnabled"
    | "emergencyShutdownEnabled"
    | "defaultHostParticipantCap"
    | "founderRoomDefaultCap"
  >
>;

export async function updateRealtimeSystemConfig(data: RealtimeSystemConfigUpdateValues) {
  return db.realtimeSystemConfig.upsert({
    where: {
      id: REALTIME_SYSTEM_CONFIG_ID
    },
    update: data,
    create: {
      ...DEFAULT_REALTIME_SYSTEM_CONFIG,
      ...data
    }
  });
}
