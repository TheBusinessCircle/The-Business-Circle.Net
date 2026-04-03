"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import {
  approveGroupHostAccessRequest,
  cancelScheduledCallRoom,
  endCallRoom,
  rejectGroupHostAccessRequest,
  revokeCallHostPermission,
  updateRealtimeSystemConfig,
  updateScheduledCallRoom,
  upsertCallHostPermission
} from "@/server/calling";
import {
  hostPermissionSchema,
  parseIsoDate,
  realtimeConfigSchema,
  reviewHostRequestSchema
} from "@/server/calling/schemas";
import { toCallingUser } from "@/server/calling/session";

function appendQueryParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(candidate: FormDataEntryValue | null, fallback: string) {
  return safeRedirectPath(typeof candidate === "string" ? candidate : undefined, fallback);
}

function revalidateAdminCallingPaths(roomId?: string) {
  revalidatePath("/calls");
  revalidatePath("/admin");
  revalidatePath("/admin/calling");
  revalidatePath("/admin/calling/permissions");
  revalidatePath("/admin/calling/requests");
  revalidatePath("/admin/calling/schedules");
  revalidatePath("/admin/calling/audit");
  revalidatePath("/admin/calling/config");

  if (roomId) {
    revalidatePath(`/calls/${roomId}`);
  }
}

export async function updateCallHostPermissionAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/calling/permissions");
  const parsed = hostPermissionSchema.safeParse({
    userId: formData.get("userId"),
    canHostGroupCalls: Boolean(formData.get("canHostGroupCalls")),
    hostLevel: formData.get("hostLevel"),
    maxParticipants: formData.get("maxParticipants"),
    maxConcurrentRooms: formData.get("maxConcurrentRooms"),
    allowedTierVisibility: formData.getAll("allowedTierVisibility"),
    expiresAt: formData.get("expiresAt"),
    isActive: Boolean(formData.get("isActive"))
  });

  if (!parsed.success) {
    redirect(appendQueryParam(returnPath, "error", "invalid-host-permission"));
  }

  await upsertCallHostPermission({
    userId: parsed.data.userId,
    actorUserId: session.user.id,
    canHostGroupCalls: parsed.data.canHostGroupCalls,
    hostLevel: parsed.data.hostLevel,
    maxParticipants: parsed.data.maxParticipants,
    maxConcurrentRooms: parsed.data.maxConcurrentRooms,
    allowedTierVisibility: parsed.data.allowedTierVisibility,
    expiresAt: parseIsoDate(parsed.data.expiresAt),
    isActive: parsed.data.isActive
  });

  revalidateAdminCallingPaths();
  redirect(appendQueryParam(returnPath, "notice", "host-permission-updated"));
}

export async function revokeCallHostPermissionAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/calling/permissions");
  const userId = typeof formData.get("userId") === "string" ? String(formData.get("userId")) : "";

  if (!userId) {
    redirect(appendQueryParam(returnPath, "error", "invalid-host-permission"));
  }

  await revokeCallHostPermission({
    userId,
    actorUserId: session.user.id
  });

  revalidateAdminCallingPaths();
  redirect(appendQueryParam(returnPath, "notice", "host-permission-revoked"));
}

export async function approveGroupHostRequestAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/calling/requests");
  const parsed = reviewHostRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    reviewNotes: formData.get("reviewNotes"),
    canHostGroupCalls: Boolean(formData.get("canHostGroupCalls")),
    hostLevel: formData.get("hostLevel"),
    maxParticipants: formData.get("maxParticipants"),
    maxConcurrentRooms: formData.get("maxConcurrentRooms"),
    allowedTierVisibility: formData.getAll("allowedTierVisibility"),
    expiresAt: formData.get("expiresAt"),
    isActive: Boolean(formData.get("isActive"))
  });

  if (!parsed.success) {
    redirect(appendQueryParam(returnPath, "error", "invalid-host-request"));
  }

  await approveGroupHostAccessRequest({
    requestId: parsed.data.requestId,
    actorUserId: session.user.id,
    reviewNotes: parsed.data.reviewNotes || null,
    permission: {
      canHostGroupCalls: parsed.data.canHostGroupCalls,
      hostLevel: parsed.data.hostLevel,
      maxParticipants: parsed.data.maxParticipants,
      maxConcurrentRooms: parsed.data.maxConcurrentRooms,
      allowedTierVisibility: parsed.data.allowedTierVisibility,
      expiresAt: parseIsoDate(parsed.data.expiresAt),
      isActive: parsed.data.isActive
    }
  });

  revalidateAdminCallingPaths();
  redirect(appendQueryParam(returnPath, "notice", "host-request-approved"));
}

export async function rejectGroupHostRequestAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/calling/requests");
  const requestId = typeof formData.get("requestId") === "string" ? String(formData.get("requestId")) : "";
  const reviewNotes =
    typeof formData.get("reviewNotes") === "string" ? String(formData.get("reviewNotes")) : "";

  if (!requestId) {
    redirect(appendQueryParam(returnPath, "error", "invalid-host-request"));
  }

  await rejectGroupHostAccessRequest({
    requestId,
    actorUserId: session.user.id,
    reviewNotes
  });

  revalidateAdminCallingPaths();
  redirect(appendQueryParam(returnPath, "notice", "host-request-rejected"));
}

export async function updateRealtimeSystemConfigAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/calling/config");
  const parsed = realtimeConfigSchema.safeParse({
    globalCallingEnabled: Boolean(formData.get("globalCallingEnabled")),
    memberHostedGroupCallsEnabled: Boolean(formData.get("memberHostedGroupCallsEnabled")),
    emergencyShutdownEnabled: Boolean(formData.get("emergencyShutdownEnabled")),
    defaultHostParticipantCap: formData.get("defaultHostParticipantCap"),
    founderRoomDefaultCap: formData.get("founderRoomDefaultCap")
  });

  if (!parsed.success) {
    redirect(appendQueryParam(returnPath, "error", "invalid-calling-config"));
  }

  await updateRealtimeSystemConfig(parsed.data);

  revalidateAdminCallingPaths();
  redirect(appendQueryParam(returnPath, "notice", "calling-config-updated"));
}

export async function updateScheduledCallRoomAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/calling/schedules");
  const roomId = typeof formData.get("roomId") === "string" ? String(formData.get("roomId")) : "";
  const title = typeof formData.get("title") === "string" ? String(formData.get("title")) : "";
  const description =
    typeof formData.get("description") === "string" ? String(formData.get("description")) : "";
  const audienceScope =
    typeof formData.get("audienceScope") === "string" ? String(formData.get("audienceScope")) : "";
  const startsAt = typeof formData.get("startsAt") === "string" ? String(formData.get("startsAt")) : "";
  const endsAt = typeof formData.get("endsAt") === "string" ? String(formData.get("endsAt")) : "";
  const maxParticipants =
    typeof formData.get("maxParticipants") === "string" ? Number(formData.get("maxParticipants")) : undefined;

  if (!roomId || !title || !audienceScope || !startsAt) {
    redirect(appendQueryParam(returnPath, "error", "invalid-scheduled-room"));
  }

  await updateScheduledCallRoom({
    roomId,
    actor: toCallingUser(session.user),
    title,
    description,
    audienceScope: audienceScope as "FOUNDATION" | "INNER_CIRCLE" | "CORE" | "CUSTOM",
    customTierVisibility: formData.getAll("customTierVisibility") as Array<"FOUNDATION" | "INNER_CIRCLE" | "CORE">,
    maxParticipants,
    startsAt: parseIsoDate(startsAt) ?? new Date(),
    endsAt: parseIsoDate(endsAt),
    isRecorded: Boolean(formData.get("isRecorded"))
  });

  revalidateAdminCallingPaths(roomId);
  redirect(appendQueryParam(returnPath, "notice", "scheduled-room-updated"));
}

export async function cancelScheduledCallRoomAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/calling/schedules");
  const roomId = typeof formData.get("roomId") === "string" ? String(formData.get("roomId")) : "";

  if (!roomId) {
    redirect(appendQueryParam(returnPath, "error", "invalid-scheduled-room"));
  }

  await cancelScheduledCallRoom({
    roomId,
    actor: toCallingUser(session.user)
  });

  revalidateAdminCallingPaths(roomId);
  redirect(appendQueryParam(returnPath, "notice", "scheduled-room-cancelled"));
}

export async function endAdminCallRoomAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/calling");
  const roomId = typeof formData.get("roomId") === "string" ? String(formData.get("roomId")) : "";

  if (!roomId) {
    redirect(appendQueryParam(returnPath, "error", "call-room-missing"));
  }

  await endCallRoom({
    roomId,
    actor: toCallingUser(session.user)
  });

  revalidateAdminCallingPaths(roomId);
  redirect(appendQueryParam(returnPath, "notice", "call-room-ended"));
}
