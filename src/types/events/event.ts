import type { EventAccessLevel, MembershipTier } from "@prisma/client";

export interface PlatformEventModel {
  id: string;
  title: string;
  description?: string | null;
  hostName?: string | null;
  startAt: string;
  endAt?: string | null;
  timezone: string;
  meetingLink?: string | null;
  replayUrl?: string | null;
  accessTier: MembershipTier;
  accessLevel: EventAccessLevel;
  location?: string | null;
  isCancelled: boolean;
}
