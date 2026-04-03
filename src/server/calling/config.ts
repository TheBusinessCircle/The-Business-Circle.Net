import type { RealtimeSystemConfig } from "@prisma/client";
import { db } from "@/lib/db";

export const REALTIME_SYSTEM_CONFIG_ID = "default";

export const DEFAULT_REALTIME_SYSTEM_CONFIG = {
  id: REALTIME_SYSTEM_CONFIG_ID,
  globalCallingEnabled: true,
  memberHostedGroupCallsEnabled: false,
  emergencyShutdownEnabled: false,
  defaultHostParticipantCap: 6,
  founderRoomDefaultCap: 30
} as const;

export async function ensureRealtimeSystemConfig() {
  return db.realtimeSystemConfig.upsert({
    where: {
      id: REALTIME_SYSTEM_CONFIG_ID
    },
    update: {},
    create: DEFAULT_REALTIME_SYSTEM_CONFIG
  });
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
