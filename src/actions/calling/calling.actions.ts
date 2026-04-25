"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/utils";
import { hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import { requireUser } from "@/lib/session";
import {
  createApprovedHostCallRoom,
  createFounderCallRoom,
  endCallRoom,
  submitGroupHostAccessRequest
} from "@/server/calling";
import { createGroupCallSchema, hostRequestSchema, parseIsoDate } from "@/server/calling/schemas";
import { toCallingUser } from "@/server/calling/session";

function appendQueryParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(candidate: FormDataEntryValue | null, fallback = "/calls") {
  return safeRedirectPath(typeof candidate === "string" ? candidate : undefined, fallback);
}

function revalidateCallingPaths(roomId?: string) {
  revalidatePath("/calls");
  revalidatePath("/directory");
  revalidatePath("/admin");
  revalidatePath("/admin/calling");

  if (roomId) {
    revalidatePath(`/calls/${roomId}`);
  }
}

export async function requestGroupHostAccessAction(formData: FormData) {
  const session = await requireUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/calls");
  const parsed = hostRequestSchema.safeParse({
    message: formData.get("message")
  });

  if (!parsed.success) {
    redirect(appendQueryParam(returnPath, "error", "invalid-host-request"));
  }

  if (!(await hasAcceptedBcnRules(session.user.id))) {
    redirect(appendQueryParam(returnPath, "error", "bcn-rules-required"));
  }

  try {
    await submitGroupHostAccessRequest({
      actor: toCallingUser(session.user),
      message: parsed.data.message || null
    });
  } catch (error) {
    if (error instanceof Error && error.message === "host-request-already-pending") {
      redirect(appendQueryParam(returnPath, "error", "host-request-pending"));
    }

    redirect(appendQueryParam(returnPath, "error", "host-request-failed"));
  }

  revalidateCallingPaths();
  redirect(appendQueryParam(returnPath, "notice", "host-request-sent"));
}

export async function createHostedCallRoomAction(formData: FormData) {
  const session = await requireUser();
  const actor = toCallingUser(session.user);
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/calls");
  const parsed = createGroupCallSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    audienceScope: formData.get("audienceScope"),
    customTierVisibility: formData.getAll("customTierVisibility"),
    maxParticipants: formData.get("maxParticipants"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    isRecorded: Boolean(formData.get("isRecorded"))
  });

  if (!parsed.success) {
    redirect(appendQueryParam(returnPath, "error", "invalid-call-room"));
  }

  if (!(await hasAcceptedBcnRules(session.user.id))) {
    redirect(appendQueryParam(returnPath, "error", "bcn-rules-required"));
  }

  try {
    const room =
      actor.role === "ADMIN"
        ? await createFounderCallRoom({
            actor,
            title: parsed.data.title,
            description: parsed.data.description || null,
            audienceScope: parsed.data.audienceScope,
            customTierVisibility: parsed.data.customTierVisibility,
            maxParticipants: parsed.data.maxParticipants,
            startsAt: parseIsoDate(parsed.data.startsAt),
            endsAt: parseIsoDate(parsed.data.endsAt),
            isRecorded: parsed.data.isRecorded
          })
        : await createApprovedHostCallRoom({
            actor,
            title: parsed.data.title,
            description: parsed.data.description || null,
            audienceScope: parsed.data.audienceScope,
            customTierVisibility: parsed.data.customTierVisibility,
            maxParticipants: parsed.data.maxParticipants,
            startsAt: parseIsoDate(parsed.data.startsAt),
            endsAt: parseIsoDate(parsed.data.endsAt),
            isRecorded: parsed.data.isRecorded
          });

    if (!room) {
      redirect(appendQueryParam(returnPath, "error", "call-room-create-failed"));
    }

    revalidateCallingPaths(room.id);
    redirect(`/calls/${room.id}`);
  } catch {
    redirect(appendQueryParam(returnPath, "error", "call-room-create-failed"));
  }
}

export async function endHostedCallRoomAction(formData: FormData) {
  const session = await requireUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/calls");
  const roomId = typeof formData.get("roomId") === "string" ? String(formData.get("roomId")) : "";

  if (!roomId) {
    redirect(appendQueryParam(returnPath, "error", "call-room-missing"));
  }

  if (!(await hasAcceptedBcnRules(session.user.id))) {
    redirect(appendQueryParam(returnPath, "error", "bcn-rules-required"));
  }

  try {
    await endCallRoom({
      roomId,
      actor: toCallingUser(session.user)
    });
  } catch {
    redirect(appendQueryParam(returnPath, "error", "call-room-end-failed"));
  }

  revalidateCallingPaths(roomId);
  redirect(appendQueryParam(returnPath, "notice", "call-room-ended"));
}
