import { MembershipTier } from "@prisma/client";
import { z } from "zod";
import { CALL_AUDIENCE_SCOPE_VALUES } from "@/lib/calling";

export const createDirectCallSchema = z.object({
  targetUserId: z.string().cuid()
});

export const createGroupCallSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  audienceScope: z.enum(CALL_AUDIENCE_SCOPE_VALUES),
  customTierVisibility: z.array(z.nativeEnum(MembershipTier)).default([]),
  maxParticipants: z.coerce.number().int().min(2).max(100).optional(),
  startsAt: z.string().trim().max(64).optional().or(z.literal("")),
  endsAt: z.string().trim().max(64).optional().or(z.literal("")),
  isRecorded: z.coerce.boolean().optional().default(false)
});

export const roomIdSchema = z.object({
  roomId: z.string().cuid()
});

export const participantPresenceSchema = z.object({
  state: z.enum(["JOINED", "LEFT"])
});

export const hostRequestSchema = z.object({
  message: z.string().trim().max(500).optional().or(z.literal(""))
});

export const hostPermissionSchema = z.object({
  userId: z.string().cuid(),
  canHostGroupCalls: z.coerce.boolean().default(false),
  hostLevel: z.coerce.number().int().min(0).max(3),
  maxParticipants: z.coerce.number().int().min(0).max(100),
  maxConcurrentRooms: z.coerce.number().int().min(0).max(20),
  allowedTierVisibility: z.array(z.nativeEnum(MembershipTier)).default([]),
  expiresAt: z.string().trim().max(64).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true)
});

export const reviewHostRequestSchema = z.object({
  requestId: z.string().cuid(),
  reviewNotes: z.string().trim().max(500).optional().or(z.literal("")),
  canHostGroupCalls: z.coerce.boolean().default(true),
  hostLevel: z.coerce.number().int().min(0).max(3),
  maxParticipants: z.coerce.number().int().min(0).max(100),
  maxConcurrentRooms: z.coerce.number().int().min(0).max(20),
  allowedTierVisibility: z.array(z.nativeEnum(MembershipTier)).default([]),
  expiresAt: z.string().trim().max(64).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true)
});

export const realtimeConfigSchema = z.object({
  globalCallingEnabled: z.coerce.boolean().default(true),
  memberHostedGroupCallsEnabled: z.coerce.boolean().default(false),
  emergencyShutdownEnabled: z.coerce.boolean().default(false),
  defaultHostParticipantCap: z.coerce.number().int().min(2).max(100),
  founderRoomDefaultCap: z.coerce.number().int().min(2).max(200)
});

export function parseIsoDate(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
